import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import ItemsView from '../src/views/ItemsView.vue';
import { itemsService, categoriesService, locationsService, enumsService } from '../src/services/api.js';
import { resetNotifications } from '../src/composables/useNotifications.js';
import { BOXES, CATEGORIES, ENUMS, ROWS, fill, group } from './formScenarios.js';
import { mountWithHost, toastTexts } from './helpers.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { getAll: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), updateQuantity: vi.fn() },
  categoriesService: { getAll: vi.fn() },
  locationsService: { getBoxes: vi.fn() },
  enumsService: { getValues: vi.fn() }
}));

enableAutoUnmount(afterEach);

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

async function openAddDialog(type) {
  const wrapper = mountWithHost(ItemsView, { selectedCategory: null });
  await flushPromises();
  await wrapper.get('.search-bar .btn-primary').trigger('click');
  if (type) {
    await wrapper.get('.modal-form select').setValue(type);
    await flushPromises();
  }
  return wrapper;
}

async function openEditDialog(source) {
  const row = ROWS[source];
  itemsService.getAll.mockResolvedValue({ data: [row] });
  const wrapper = mountWithHost(ItemsView, { selectedCategory: row.category_id });
  await flushPromises();
  await wrapper.get('tbody button[title="Edit"]').trigger('click');
  await flushPromises();
  return wrapper;
}

const options = (wrapper, container, label) => group(wrapper, container, label).findAll('option').map((option) => option.text().trim());
const labels = (wrapper) => wrapper.findAll('.modal-form .form-group > label').map((label) => label.text().replace(/\s+/g, ' ').trim());

describe('adding a battery', () => {
  it('offers the size, company, model and type options straight away (they used to be empty until a battery had been edited)', async () => {
    const wrapper = await openAddDialog('Batteries');
    expect(enumsService.getValues.mock.calls.map(([type]) => type).sort())
      .toEqual(['battery_company', 'battery_model', 'battery_size', 'battery_type']);
    expect(options(wrapper, '.battery-fields', 'Size')).toEqual(['-- Select Size --', 'AA', 'AAA']);
    expect(options(wrapper, '.battery-fields', 'Company')).toEqual(['-- Select Company --', 'Duracell']);
    expect(options(wrapper, '.battery-fields', 'Model')).toEqual(['-- Select Model --', 'Plus']);
    expect(options(wrapper, '.battery-fields', 'Type')).toEqual(['-- Select Type --', 'Alkaline']);
  });

  it('still opens when one option list cannot be loaded, and offers the others', async () => {
    enumsService.getValues.mockImplementation(async (type) => {
      if (type === 'battery_model') throw new Error('boom');
      return { data: ENUMS[type] || [] };
    });
    const wrapper = await openAddDialog('Batteries');
    expect(options(wrapper, '.battery-fields', 'Size')).toEqual(['-- Select Size --', 'AA', 'AAA']);
    expect(options(wrapper, '.battery-fields', 'Model')).toEqual(['-- Select Model --']);
  });
});

describe('the Other Items dialog', () => {
  it('has one name field, not a second required "Item Name" that was never saved', async () => {
    const adding = await openAddDialog('Other Items');
    expect(labels(adding)).toEqual(['Item Type *', 'Item Type *', 'Name', 'Size', 'Company', 'Storage / Box Location *', 'Quantity', 'Notes']);
    const editing = await openEditDialog('other_item');
    expect(labels(editing)).not.toContain('Item Name *');
  });

  it('can be saved with only its type and a location', async () => {
    const wrapper = await openAddDialog('Other Items');
    // A browser refuses to submit while a required field is empty; the old dialog also required the unsaved "Item Name"
    expect(wrapper.findAll('.modal-form [required]')).toHaveLength(3);
    await fill(wrapper, '.other-items-fields', 'Item Type', 'Connector');
    await fill(wrapper, '.modal-form', 'Storage / Box Location', 'box-1');
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(itemsService.create).toHaveBeenCalledTimes(1);
    expect(itemsService.create.mock.calls[0][0]).toMatchObject({ source_type: 'other_item', item_type: 'Connector', name: '' });
  });

  it('no kind of item asks for an Item Name any more, nor does the dialog before a kind is chosen', async () => {
    for (const type of ['', 'Screws', 'Nuts', 'Oils/Pastes', 'Batteries', 'Washers & Bearings', 'RC Parts', 'Other Items']) {
      const wrapper = await openAddDialog(type);
      expect(labels(wrapper)).not.toContain('Item Name *');
      expect(wrapper.find('input[placeholder="Item name"]').exists()).toBe(false);
      wrapper.unmount();
    }
  });

  it('still gives screws, nuts and oils a readable name, built from what was entered', async () => {
    const wrapper = await openAddDialog('Nuts');
    await fill(wrapper, '.nut-fields', 'Size', 'M3');
    await fill(wrapper, '.nut-fields', 'Type', 'Lock');
    await fill(wrapper, '.modal-form', 'Storage / Box Location', 'box-1');
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(itemsService.create.mock.calls[0][0]).toMatchObject({ source_type: 'nut', name: 'M3 Lock', size: 'M3', type: 'Lock' });
  });

  it('shows the Name field of washers and other items, which is their real identity', async () => {
    expect(labels(await openAddDialog('Washers & Bearings'))).toContain('Name');
    expect(labels(await openAddDialog('Other Items'))).toContain('Name');
  });
});

describe('RC Parts', () => {
  it('have no name field: the item code is what identifies them, and it is required', async () => {
    const wrapper = await openAddDialog('RC Parts');
    expect(labels(wrapper)).toEqual(['Item Type *', 'Company', 'Model', 'Item Code *', 'Storage / Box Location *', 'Quantity', 'Notes']);
    expect(wrapper.findAll('.modal-form [required]')).toHaveLength(3);
  });

  it('can be edited without inventing a name, as none of the imported parts has one', async () => {
    const wrapper = await openEditDialog('rc_part');
    expect(labels(wrapper)).not.toContain('Item Name *');
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(itemsService.update.mock.calls[0][1]).toMatchObject({ source_type: 'rc_part', item_code: 'T-100', name: '' });
  });

  it('keep a name that is already stored when they are edited', async () => {
    ROWS.rc_part.name = 'Legacy name';
    try {
      const wrapper = await openEditDialog('rc_part');
      await wrapper.get('form.modal-form').trigger('submit');
      await flushPromises();
      expect(itemsService.update.mock.calls[0][1].name).toBe('Legacy name');
    } finally {
      ROWS.rc_part.name = null;
    }
  });

  it('show company, model and item code in the table, and no name column', async () => {
    itemsService.getAll.mockResolvedValue({ data: [ROWS.rc_part] });
    const wrapper = mountWithHost(ItemsView, { selectedCategory: 'c-rc' });
    await flushPromises();
    const headers = wrapper.findAll('thead th').map((th) => th.text().replace(/[↑↓]/g, '').trim());
    expect(headers.slice(0, 4)).toEqual(['Company', 'Model', 'Item Code', 'Storage']);
    expect(headers).not.toContain('Name');
    expect(wrapper.get('tbody td.code').text()).toBe('T-100');
  });
});

describe('a new Washers & Bearings entry', () => {
  it('starts as a Washer with an empty subtype, instead of two blank selects', async () => {
    const wrapper = await openAddDialog('Washers & Bearings');
    expect(group(wrapper, '.washer-bearing-fields', 'Type').get('select').element.value).toBe('Washer');
    expect(group(wrapper, '.washer-bearing-fields', 'Subtype').get('select').element.selectedOptions[0].text.trim()).toBe('-- Select Subtype --');
    expect(group(wrapper, '.washer-bearing-fields', 'Material').get('select').element.selectedOptions[0].text.trim()).toBe('-- Select Material --');
  });
});

describe('choosing the kind of item', () => {
  it('is fixed while editing, because an item cannot move to another table', async () => {
    const wrapper = await openEditDialog('nut');
    const select = wrapper.get('.modal-form select');
    expect(select.attributes('disabled')).toBeDefined();
    expect(select.element.value).toBe('Nuts');
  });

  it('can be changed while adding, and starts the new kind with empty fields', async () => {
    const wrapper = await openAddDialog('Screws');
    await fill(wrapper, '.screw-fields', 'Size', 'M3');
    await fill(wrapper, '.screw-fields', 'Length', '10');
    await fill(wrapper, '.modal-form', 'Storage / Box Location', 'box-1');
    await fill(wrapper, '.modal-form', 'Quantity', '4');
    await fill(wrapper, '.modal-form', 'Notes', 'keep me');

    await wrapper.get('.modal-form select').setValue('Nuts');
    await flushPromises();
    expect(wrapper.find('.screw-fields').exists()).toBe(false);
    expect(group(wrapper, '.nut-fields', 'Size').get('select').element.value).toBe('');
    expect(group(wrapper, '.modal-form', 'Storage / Box Location').get('select').element.value).toBe('box-1');
    expect(group(wrapper, '.modal-form', 'Quantity').get('input').element.value).toBe('4');
    expect(group(wrapper, '.modal-form', 'Notes').get('textarea').element.value).toBe('keep me');

    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    const payload = itemsService.create.mock.calls[0][0];
    expect(payload).toMatchObject({ source_type: 'nut', name: 'Nut', size: '', quantity: 4, notes: 'keep me', box_id: 'box-1' });
    expect(payload).not.toHaveProperty('length');
  });

  it('loads the option lists of the newly chosen kind', async () => {
    const wrapper = await openAddDialog('Nuts');
    expect(options(wrapper, '.nut-fields', 'Size')).toEqual(['-- Select Size --', 'M3', 'M4']);
    await wrapper.get('.modal-form select').setValue('RC Parts');
    await flushPromises();
    expect(options(wrapper, '.rc-part-fields', 'Company')).toEqual(['-- Select Company --', 'Traxxas']);
  });
});

describe('saving', () => {
  it('sends only one request even when Save is pressed twice, and disables the button meanwhile', async () => {
    let finish;
    itemsService.create.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const wrapper = await openAddDialog('Other Items');
    await fill(wrapper, '.other-items-fields', 'Item Type', 'Cable');
    await wrapper.get('form.modal-form').trigger('submit');
    await wrapper.get('form.modal-form').trigger('submit');
    expect(itemsService.create).toHaveBeenCalledTimes(1);
    expect(wrapper.get('form.modal-form .btn-primary').attributes('disabled')).toBeDefined();
    finish({ data: {} });
    await flushPromises();
    expect(wrapper.find('form.modal-form').exists()).toBe(false);
  });

  it('closes the dialog and reloads the list after a successful save', async () => {
    const wrapper = await openEditDialog('other_item');
    expect(itemsService.getAll).toHaveBeenCalledTimes(1);
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(itemsService.update).toHaveBeenCalledTimes(1);
    expect(wrapper.find('form.modal-form').exists()).toBe(false);
    expect(itemsService.getAll).toHaveBeenCalledTimes(2);
  });

  it('lets the user try again after a failure', async () => {
    itemsService.update.mockRejectedValueOnce({ response: { data: { error: 'Request conflicts with existing data' } } });
    const wrapper = await openEditDialog('other_item');
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Request conflicts with existing data']);
    expect(wrapper.get('form.modal-form .btn-primary').attributes('disabled')).toBeUndefined();
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(itemsService.update).toHaveBeenCalledTimes(2);
    expect(wrapper.find('form.modal-form').exists()).toBe(false);
  });

  it('does not send anything when the dialog is cancelled or closed', async () => {
    const wrapper = await openEditDialog('screw');
    await wrapper.get('.close-btn').trigger('click');
    expect(wrapper.find('form.modal-form').exists()).toBe(false);
    await wrapper.get('tbody button[title="Edit"]').trigger('click');
    await flushPromises();
    await wrapper.get('.modal-actions .btn-secondary').trigger('click');
    expect(wrapper.find('form.modal-form').exists()).toBe(false);
    expect(itemsService.update).not.toHaveBeenCalled();
  });

  it('starts every new dialog empty, not with what the last one held', async () => {
    const wrapper = await openAddDialog('Screws');
    await fill(wrapper, '.modal-form', 'Notes', 'Leftover');
    await wrapper.get('.modal-actions .btn-secondary').trigger('click');
    await wrapper.get('.search-bar .btn-primary').trigger('click');
    expect(wrapper.get('.modal-form select').element.value).toBe('');
    expect(group(wrapper, '.modal-form', 'Notes').get('textarea').element.value).toBe('');
  });
});

describe('kinds of item that cannot be edited here', () => {
  it('explains instead of opening a broken dialog (legacy bearings)', async () => {
    itemsService.getAll.mockResolvedValue({ data: [{ ...ROWS.screw, id: 'legacy-1', source_type: 'bearing', item_type: 'Bearings', category_id: 'c-washer' }] });
    const wrapper = mountWithHost(ItemsView, { selectedCategory: 'c-washer' });
    await flushPromises();
    await wrapper.get('tbody button[title="Edit"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('form.modal-form').exists()).toBe(false);
    expect(toastTexts(wrapper)).toEqual(['This kind of item cannot be edited here.']);
  });
});

describe('notes', () => {
  it('opens in a dialog and closes again; the button only exists for items that have notes', async () => {
    itemsService.getAll.mockResolvedValue({ data: [{ ...ROWS.screw, notes: 'Line one\nLine two' }, { ...ROWS.screw, id: 'screw-2', notes: '' }] });
    const wrapper = mountWithHost(ItemsView, { selectedCategory: 'c-screw' });
    await flushPromises();
    expect(wrapper.findAll('.notes-btn')).toHaveLength(1);
    await wrapper.get('.notes-btn').trigger('click');
    expect(wrapper.get('.modal-box').attributes('aria-label')).toBe('📝 Notes');
    expect(wrapper.get('.notes-text').text()).toBe('Line one\nLine two');
    await wrapper.get('.modal-actions .btn-secondary').trigger('click');
    expect(wrapper.find('.modal-box').exists()).toBe(false);
  });
});
