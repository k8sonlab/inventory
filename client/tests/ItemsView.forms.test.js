import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount } from '@vue/test-utils';
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
