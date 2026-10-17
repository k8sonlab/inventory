import { flushPromises } from '@vue/test-utils';
import { itemsService } from '../src/services/api.js';
import { mountWithHost } from './helpers.js';
import ItemsView from '../src/views/ItemsView.vue';

// Option values the dropdowns offer, keyed by catalog enum type
export const ENUMS = {
  screw_size: ['M3', 'M4'], screw_head_type: ['Button', 'Flat'], screw_drive_type: ['Hex', 'Torx'],
  screw_thread_type: ['Coarse', 'Fine'], screw_color: ['Black', 'Zinc'], screw_material: ['Steel', 'Brass'],
  nut_size: ['M3', 'M4'], nut_type: ['Lock', 'Plain'], nut_color: ['Zinc', 'Black'],
  oil_paste_company: ['Acme Oil'], oil_paste_type: ['Grease', 'Oil'],
  battery_size: ['AA', 'AAA'], battery_company: ['Duracell'], battery_model: ['Plus'], battery_type: ['Alkaline'],
  washer_bearing_subtype: ['Flat', 'Ball'], washer_bearing_material: ['Steel', 'Brass'],
  rc_company: ['Traxxas'], rc_model: ['Slash']
};

export const BOXES = [{ id: 'box-1', storage_id: 'S1-B01', box_name: 'Box', shelf_code: 'S1' }];

export const CATEGORIES = [
  { id: 'c-screw', name: 'Screws' }, { id: 'c-nut', name: 'Nuts' }, { id: 'c-oil', name: 'Oils/Pastes' },
  { id: 'c-battery', name: 'Batteries' }, { id: 'c-other', name: 'Other Items' },
  { id: 'c-washer', name: 'Washers & Bearings' }, { id: 'c-rc', name: 'RC Parts' }
];

// The fields each server model stores (see server/models/index.js); anything else in a payload is ignored by the API
export const SERVER_FIELDS = {
  screw: ['source_type', 'name', 'size', 'length', 'head_type', 'drive_type', 'thread_type', 'color', 'material', 'box_id', 'category_id', 'quantity', 'notes'],
  nut: ['source_type', 'name', 'size', 'type', 'color', 'has_washer', 'box_id', 'category_id', 'quantity', 'notes'],
  oil_paste: ['source_type', 'name', 'company', 'type', 'characteristic', 'box_id', 'category_id', 'quantity', 'notes'],
  battery: ['source_type', 'size', 'company', 'model', 'type', 'expiration_date', 'mah', 'rechargeable', 'box_id', 'category_id', 'quantity', 'notes'],
  other_item: ['source_type', 'item_type', 'size', 'name', 'company', 'quantity', 'box_id', 'category_id', 'notes'],
  washer_bearing: ['source_type', 'category', 'name', 'inner_diameter', 'outer_diameter', 'thickness', 'subtype', 'material', 'quantity', 'box_id', 'category_id', 'notes'],
  rc_part: ['source_type', 'name', 'company', 'model', 'item_code', 'box_id', 'category_id', 'quantity', 'notes']
};

// How to fill each category's add form: [container selector, label, value]. Common fields use the container '.modal-form'.
export const ADD = {
  screw: {
    itemType: 'Screws', category: 'c-screw',
    fields: [['.screw-fields', 'Size', 'M3'], ['.screw-fields', 'Length', '10'], ['.screw-fields', 'Head Type', 'Button'],
      ['.screw-fields', 'Drive Type', 'Hex'], ['.screw-fields', 'Thread Type', 'Coarse'], ['.screw-fields', 'Color', 'Black'],
      ['.screw-fields', 'Material', 'Steel']]
  },
  nut: {
    itemType: 'Nuts', category: 'c-nut',
    fields: [['.nut-fields', 'Size', 'M4'], ['.nut-fields', 'Type', 'Lock'], ['.nut-fields', 'Color', 'Zinc'],
      ['.nut-fields', 'Has Washer', true]]
  },
  oil_paste: {
    itemType: 'Oils/Pastes', category: 'c-oil',
    fields: [['.oil-paste-fields', 'Company', 'Acme Oil'], ['.oil-paste-fields', 'Type', 'Grease'],
      ['.oil-paste-fields', 'Characteristic', 'Graphite']]
  },
  battery: {
    itemType: 'Batteries', category: 'c-battery',
    fields: [['.battery-fields', 'Size', 'AA'], ['.battery-fields', 'Company', 'Duracell'], ['.battery-fields', 'Model', 'Plus'],
      ['.battery-fields', 'Type', 'Alkaline'], ['.battery-fields', 'Expiration Date', '2030-01-31'],
      ['.battery-fields', 'Capacity (mAh)', '2000'], ['.battery-fields', 'Rechargeable', true]]
  },
  other_item: {
    itemType: 'Other Items', category: 'c-other',
    fields: [['.other-items-fields', 'Item Type', 'Cable'], ['.other-items-fields', 'Name', 'USB cable'],
      ['.other-items-fields', 'Size', '1m'], ['.other-items-fields', 'Company', 'Acme']]
  },
  washer_bearing: {
    itemType: 'Washers & Bearings', category: 'c-washer',
    fields: [['.washer-bearing-fields', 'Type', 'Bearing'], ['.washer-bearing-fields', 'Name', '608RS'],
      ['.washer-bearing-fields', 'Inner Diameter (mm)', '8'], ['.washer-bearing-fields', 'Outer Diameter (mm)', '22'],
      ['.washer-bearing-fields', 'Thickness (mm)', '7'], ['.washer-bearing-fields', 'Subtype', 'Ball'],
      ['.washer-bearing-fields', 'Material', 'Steel']]
  },
  rc_part: {
    itemType: 'RC Parts', category: 'c-rc',
    fields: [['.rc-part-fields', 'Company', 'Traxxas'], ['.rc-part-fields', 'Model', 'Slash'],
      ['.rc-part-fields', 'Item Code', 'T-100']]
  }
};
export const ADD_COMMON = [['.modal-form', 'Storage / Box Location', 'box-1'], ['.modal-form', 'Quantity', '7'], ['.modal-form', 'Notes', 'a note']];

// Rows as the API returns them (see RCPart.getAllCombined)
const common = { box_id: 'box-1', storage_id: 'S1-B01', box_name: 'Box', quantity: 7, notes: 'a note' };
export const ROWS = {
  screw: {
    ...common, id: 'screw-1', source_type: 'screw', item_type: 'Screws', category_id: 'c-screw', name: 'M3 x 10mm Button Hex', display_name: 'M3 x 10mm Button Hex',
    display_company: null, display_model: null, display_code: null,
    size: 'M3', length: '10', head_type: 'Button', drive_type: 'Hex', thread_type: 'Coarse', color: 'Black', material: 'Steel'
  },
  nut: {
    ...common, id: 'nut-1', source_type: 'nut', item_type: 'Nuts', category_id: 'c-nut', name: 'M4 Lock Zinc', display_name: 'M4 Lock Zinc',
    display_company: null, display_model: null, display_code: null, size: 'M4', type: 'Lock', color: 'Zinc', has_washer: 1
  },
  oil_paste: {
    ...common, id: 'oil-1', source_type: 'oil_paste', item_type: 'Oils/Pastes', category_id: 'c-oil', name: 'Acme Oil Grease', display_name: 'Acme Oil Grease',
    display_company: null, display_model: null, display_code: null, company: 'Acme Oil', type: 'Grease', characteristic: 'Graphite'
  },
  battery: {
    ...common, id: 'bat-1', source_type: 'battery', item_type: 'Batteries', category_id: 'c-battery', display_name: 'Duracell AA',
    display_company: null, display_model: null, display_code: null,
    size: 'AA', company: 'Duracell', model: 'Plus', type: 'Alkaline', mah: 2000, rechargeable: 1, expiration_date: '2030-01-31'
  },
  other_item: {
    ...common, id: 'other-1', source_type: 'other_item', item_type: 'Cable', category_id: 'c-other', name: 'USB cable', display_name: 'USB cable',
    display_company: 'Acme', display_model: '1m', display_code: null, size: '1m', company: 'Acme'
  },
  washer_bearing: {
    ...common, id: 'wb-1', source_type: 'washer_bearing', item_type: 'Washers & Bearings', category_id: 'c-washer', name: '608RS', display_name: '608RS',
    display_company: null, display_model: null, display_code: null,
    category: 'Bearing', inner_diameter: 8, outer_diameter: 22, thickness: 7, subtype: 'Ball', material: 'Steel'
  },
  rc_part: {
    ...common, id: 'rc-1', source_type: 'rc_part', item_type: 'RC Parts', category_id: 'c-rc', name: null, display_name: null,
    display_company: 'Traxxas', display_model: 'Slash', display_code: 'T-100', company: 'Traxxas', model: 'Slash', item_code: 'T-100'
  }
};

export const pick = (payload, fields) => Object.fromEntries(fields.filter((field) => field in payload).map((field) => [field, payload[field]]));

export const group = (wrapper, container, label) => {
  const scope = container === '.modal-form' ? wrapper.get('.modal-form') : wrapper.get(`.modal-form ${container}`);
  const found = scope.findAll('.form-group').find((g) => g.find('label').text().replace(/\s*\*$/, '').replace(/\s+/g, ' ').trim().startsWith(label));
  if (!found) throw new Error(`No field "${label}" in ${container}`);
  return found;
};

export async function fill(wrapper, container, label, value) {
  const g = group(wrapper, container, label);
  const control = g.find('select, textarea, input');
  if (typeof value === 'boolean') await control.setValue(value);
  else await control.setValue(value);
}

export function setupApi({ api, rows = [] }) {
  api.getAll.mockResolvedValue({ data: rows });
}

// Opens the real add dialog, fills the form like a person would and returns what was sent to the API.
// `warmUp` first edits a battery and closes the dialog: the original form only had battery size/company/model options after that.
export async function runAdd(source, { warmUp = false } = {}) {
  const scenario = ADD[source];
  if (warmUp) itemsService.getAll.mockResolvedValue({ data: [ROWS[source]] });
  const wrapper = mountWithHost(ItemsView, { selectedCategory: warmUp ? scenario.category : null });
  await flushPromises();
  if (warmUp) {
    await wrapper.get('tbody button[title="Edit"]').trigger('click');
    await flushPromises();
    await wrapper.get('.close-btn').trigger('click');
    await flushPromises();
  }
  await wrapper.get('.search-bar .btn-primary').trigger('click');
  await wrapper.get('.modal-form select').setValue(scenario.itemType);
  await flushPromises();
  for (const [container, label, value] of [...scenario.fields, ...ADD_COMMON]) {
    await fill(wrapper, container, label, value);
  }
  await wrapper.get('form.modal-form').trigger('submit');
  await flushPromises();
  const [payload] = itemsService.create.mock.calls.at(-1) ?? [];
  wrapper.unmount();
  return payload;
}

// Opens the real edit dialog for a row and saves it without changes
export async function runEdit(source) {
  const row = ROWS[source];
  itemsService.getAll.mockResolvedValue({ data: [row] });
  const wrapper = mountWithHost(ItemsView, { selectedCategory: row.category_id });
  await flushPromises();
  await wrapper.get('tbody button[title="Edit"]').trigger('click');
  await flushPromises();
  const dialogText = wrapper.get('.modal-form').text();
  await wrapper.get('form.modal-form').trigger('submit');
  await flushPromises();
  const [id, payload] = itemsService.update.mock.calls.at(-1) ?? [];
  wrapper.unmount();
  return { id, payload, dialogText };
}
