import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import ItemsView from '../src/views/ItemsView.vue';
import BulkItemFormModal from '../src/components/BulkItemFormModal.vue';
import { mountWithHost } from './helpers.js';
import { itemsService, categoriesService, locationsService, enumsService } from '../src/services/api.js';
import { resetNotifications } from '../src/composables/useNotifications.js';
import { ADD, BOXES, CATEGORIES, ENUMS, ROWS, SERVER_FIELDS, pick, runAdd, runEdit } from './formScenarios.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { getAll: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), updateQuantity: vi.fn() },
  categoriesService: { getAll: vi.fn() },
  locationsService: { getBoxes: vi.fn() },
  enumsService: { getValues: vi.fn() }
}));

enableAutoUnmount(afterEach);

// What the API stores for each category when the add dialog is filled in and when an existing item is saved unchanged.
// Recorded from the original single-file ItemsView before it was split, so any change here is a behaviour change.
// Deliberate exceptions: RC Parts have no name (the item code identifies them), and screws, nuts and oils no longer ask for one:
// theirs is built from the fields in the format the Excel import uses.
const ADDED = {
  screw: { source_type: 'screw', name: 'M3 x 10mm Button Hex', size: 'M3', length: '10', head_type: 'Button', drive_type: 'Hex', thread_type: 'Coarse', color: 'Black', material: 'Steel', box_id: 'box-1', category_id: 'c-screw', quantity: 7, notes: 'a note' },
  nut: { source_type: 'nut', name: 'M4 Lock Zinc', size: 'M4', type: 'Lock', color: 'Zinc', has_washer: true, box_id: 'box-1', category_id: 'c-nut', quantity: 7, notes: 'a note' },
  oil_paste: { source_type: 'oil_paste', name: 'Acme Oil Grease', company: 'Acme Oil', type: 'Grease', characteristic: 'Graphite', box_id: 'box-1', category_id: 'c-oil', quantity: 7, notes: 'a note' },
  battery: { source_type: 'battery', size: 'AA', company: 'Duracell', model: 'Plus', type: 'Alkaline', expiration_date: '2030-01-31', mah: 2000, rechargeable: 1, box_id: 'box-1', category_id: 'c-battery', quantity: 7, notes: 'a note' },
  other_item: { source_type: 'other_item', item_type: 'Cable', size: '1m', name: 'USB cable', company: 'Acme', quantity: 7, box_id: 'box-1', category_id: 'c-other', notes: 'a note' },
  washer_bearing: { source_type: 'washer_bearing', category: 'Bearing', name: '608RS', inner_diameter: 8, outer_diameter: 22, thickness: 7, subtype: 'Ball', material: 'Steel', quantity: 7, box_id: 'box-1', category_id: 'c-washer', notes: 'a note' },
  rc_part: { source_type: 'rc_part', name: '', company: 'Traxxas', model: 'Slash', item_code: 'T-100', box_id: 'box-1', category_id: 'c-rc', quantity: 7, notes: 'a note' }
};

const EDITED = {
  screw: { id: 'screw-1', ...ADDED.screw },
  nut: { id: 'nut-1', ...ADDED.nut, has_washer: 1 },
  oil_paste: { id: 'oil-1', ...ADDED.oil_paste },
  battery: { id: 'bat-1', ...ADDED.battery },
  other_item: { id: 'other-1', ...ADDED.other_item },
  washer_bearing: { id: 'wb-1', ...ADDED.washer_bearing },
  rc_part: { id: 'rc-1', ...ADDED.rc_part }
};

beforeEach(() => {
  vi.clearAllMocks();
  resetNotifications();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  itemsService.getAll.mockResolvedValue({ data: [] });
  itemsService.create.mockResolvedValue({ data: {} });
  itemsService.update.mockResolvedValue({ data: {} });
  categoriesService.getAll.mockResolvedValue({ data: CATEGORIES });
  locationsService.getBoxes.mockResolvedValue({ data: BOXES });
  enumsService.getValues.mockImplementation(async (type) => ({ data: ENUMS[type] || [] }));
});

describe('adding from the current category', () => {
  it.each(CATEGORIES)('opens the $name form and saves into that category', async (category) => {
    const wrapper = mountWithHost(ItemsView, { selectedCategory: category.id });
    await flushPromises();
    await wrapper.get('.search-bar button').trigger('click');
    await flushPromises();

    const form = wrapper.get('form.modal-form');
    const expectedType = Object.entries(ADD).find(([, scenario]) => scenario.category === category.id);
    expect(form.get('select').element.value).toBe(expectedType[1].itemType);
    expect(wrapper.get('[role="dialog"]').classes()).toContain('modal-wide');
    await form.trigger('submit');
    await flushPromises();

    expect(itemsService.create).toHaveBeenCalledWith(expect.objectContaining({
      category_id: category.id,
      source_type: expectedType[0]
    }));
    expect(wrapper.find('form.modal-form').exists()).toBe(false);
  });

  it('keeps the type chooser empty when browsing all categories', async () => {
    const wrapper = mountWithHost(ItemsView);
    await flushPromises();
    await wrapper.get('.search-bar button').trigger('click');
    expect(wrapper.get('form.modal-form select').element.value).toBe('');
  });
});

describe('bulk entry', () => {
  it('selects Screws when the category lookup finishes after opening the dialog', async () => {
    let resolveCategories;
    categoriesService.getAll.mockReturnValueOnce(new Promise((resolve) => { resolveCategories = resolve; }));
    const wrapper = mountWithHost(ItemsView, { selectedCategory: 'c-screw' });
    await flushPromises();
    await wrapper.findAll('.search-bar button').find((button) => button.text().includes('Add Multiple')).trigger('click');
    resolveCategories({ data: CATEGORIES });
    await flushPromises();

    expect(wrapper.get('[aria-label="Item Type"]').element.value).toBe('Screws');
    expect(wrapper.findAll('.bulk-table tbody tr')).toHaveLength(2);
    await wrapper.get('[aria-label="Shared Storage Box"]').setValue('box-1');
    await wrapper.get('form.bulk-form').trigger('submit');
    await flushPromises();
    expect(itemsService.create).toHaveBeenCalledTimes(2);
    for (const [payload] of itemsService.create.mock.calls) {
      expect(payload).toMatchObject({ source_type: 'screw', category_id: 'c-screw' });
    }
  });

  it.each(Object.keys(ADD))('adds multiple %s items using the single-item payload rules', async (source) => {
    const scenario = ADD[source];
    const wrapper = mountWithHost(ItemsView, { selectedCategory: scenario.category });
    await flushPromises();
    await wrapper.findAll('.search-bar button').find((button) => button.text().includes('Add Multiple')).trigger('click');
    await flushPromises();
    expect(wrapper.get('[aria-label="Item Type"]').element.value).toBe(scenario.itemType);
    await wrapper.get('[aria-label="Shared Storage Box"]').setValue('box-1');
    const rows = wrapper.findAll('.bulk-table tbody tr');
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      for (const [, label, value] of scenario.fields) {
        await row.get(`[aria-label="${label}"]`).setValue(value);
      }
      await row.get('[aria-label="Quantity"]').setValue(7);
      await row.get('[aria-label="Notes"]').setValue('a note');
    }
    await wrapper.get('form.bulk-form').trigger('submit');
    await flushPromises();
    expect(itemsService.create).toHaveBeenCalledTimes(2);
    for (const [payload] of itemsService.create.mock.calls) {
      expect(pick(payload, SERVER_FIELDS[source])).toEqual(ADDED[source]);
    }
    expect(wrapper.find('form.bulk-form').exists()).toBe(false);
  });

  it('keeps only failed rows for retry without duplicating successful items', async () => {
    const wrapper = mountWithHost(BulkItemFormModal, { categoryName: 'Screws', categories: CATEGORIES, boxes: BOXES });
    await flushPromises();
    await wrapper.get('[aria-label="Shared Storage Box"]').setValue('box-1');
    itemsService.create.mockResolvedValueOnce({ data: {} }).mockRejectedValueOnce(new Error('Failed'));
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(wrapper.get('[role="alert"]').text()).toBe('Failed');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(itemsService.create).toHaveBeenCalledTimes(3);
    expect(wrapper.getComponent(BulkItemFormModal).emitted('close')).toHaveLength(1);
  });

  it('duplicates and removes rows, preserves type drafts and cancels with Escape', async () => {
    const wrapper = mountWithHost(ItemsView, { selectedCategory: 'c-screw' });
    await flushPromises();
    await wrapper.findAll('.search-bar button').find((button) => button.text().includes('Add Multiple')).trigger('click');
    await flushPromises();
    await wrapper.get('tbody [aria-label="Length"]').setValue('15');
    await wrapper.get('[aria-label="Duplicate row 1"]').trigger('click');
    expect(wrapper.findAll('.bulk-table tbody tr')).toHaveLength(3);
    expect(wrapper.findAll('tbody [aria-label="Length"]')[2].element.value).toBe('15');
    await wrapper.get('[aria-label="Remove row 2"]').trigger('click');
    await wrapper.get('[aria-label="Item Type"]').setValue('Batteries');
    await wrapper.get('[aria-label="Item Type"]').setValue('Screws');
    expect(wrapper.findAll('tbody [aria-label="Length"]')[0].element.value).toBe('15');
    expect(wrapper.findAll('.bulk-table tbody tr')).toHaveLength(2);
    await wrapper.get('[aria-label="Item Type"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('form.bulk-form').exists()).toBe(false);
    expect(itemsService.create).not.toHaveBeenCalled();
  });

  it('requires a storage box and required fields before sending anything', async () => {
    const wrapper = mountWithHost(BulkItemFormModal, { categoryName: 'RC Parts', categories: CATEGORIES, boxes: BOXES });
    await flushPromises();
    await wrapper.get('form').trigger('submit');
    expect(itemsService.create).not.toHaveBeenCalled();
    await wrapper.get('[aria-label="Shared Storage Box"]').setValue('box-1');
    await wrapper.get('form').trigger('submit');
    expect(itemsService.create).not.toHaveBeenCalled();
  });
});

describe('cancelling with Escape', () => {
  it.each(['add', 'edit'])('closes the %s form without saving', async (mode) => {
    itemsService.getAll.mockResolvedValue({ data: [ROWS.screw] });
    const wrapper = mountWithHost(ItemsView, { selectedCategory: 'c-screw' });
    await flushPromises();
    await wrapper.get(mode === 'add' ? '.search-bar button' : 'tbody button[title="Edit"]').trigger('click');
    await flushPromises();
    await wrapper.get('form.modal-form input[type="text"]').setValue('25');

    await wrapper.get('form.modal-form input[type="text"]').trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.find('form.modal-form').exists()).toBe(true);
    await wrapper.get('form.modal-form input[type="text"]').trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('form.modal-form').exists()).toBe(false);
    expect(itemsService.create).not.toHaveBeenCalled();
    expect(itemsService.update).not.toHaveBeenCalled();
  });
});

describe('adding an item stores the same data as before', () => {
  for (const source of Object.keys(ADD)) {
    it(`${ADD[source].itemType}`, async () => {
      const payload = await runAdd(source, { warmUp: source === 'battery' });
      expect(itemsService.create).toHaveBeenCalledTimes(1);
      expect(pick(payload, SERVER_FIELDS[source])).toEqual(ADDED[source]);
    });
  }
});

describe('saving an existing item unchanged stores the same data as before', () => {
  for (const source of Object.keys(ROWS)) {
    it(`${ROWS[source].item_type === 'Cable' ? 'Other Items' : ROWS[source].item_type}`, async () => {
      const { id, payload } = await runEdit(source);
      expect(itemsService.update).toHaveBeenCalledTimes(1);
      expect({ id, ...pick(payload, SERVER_FIELDS[source]) }).toEqual(EDITED[source]);
    });
  }
});

describe('edit dialog', () => {
  it.each(Object.keys(ROWS))('%s: shows the item type, its own fields, location, quantity and notes', async (source) => {
    const { dialogText } = await runEdit(source);
    for (const label of ['Item Type', 'Storage / Box Location', 'Quantity', 'Notes', 'Save', 'Cancel']) {
      expect(dialogText).toContain(label);
    }
  });

  it('never shows a legacy parameters section, even for items that carry parameters', async () => {
    for (const source of ['screw', 'rc_part', 'washer_bearing']) {
      ROWS[source].parameters = '{"legacy":"value"}';
      const { dialogText } = await runEdit(source);
      expect(dialogText).not.toMatch(/Parameters/i);
      expect(dialogText).not.toContain('legacy');
      delete ROWS[source].parameters;
    }
  });

  it('shows the specific type of an Other Item in its own field, not the category selector', async () => {
    const { dialogText } = await runEdit('other_item');
    expect(dialogText).toContain('Other Items');
  });
});
