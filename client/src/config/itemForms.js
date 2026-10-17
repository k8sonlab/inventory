// Everything the add/edit dialog needs to know about each kind of item, in one place:
// which fields to show, their defaults, how to read an existing item and how to build what the API expects.

const select = (key, label, enumType) => ({ kind: 'select', key, label, enumType });
const text = (key, label, placeholder, extra = {}) => ({ kind: 'text', key, label, placeholder, ...extra });
const number = (key, label, placeholder, extra = {}) => ({ kind: 'number', key, label, placeholder, ...extra });

const blank = (value) => value === null || value === undefined || value === '';
const orEmpty = (item, ...keys) => Object.fromEntries(keys.map((key) => [key, item[key] || '']));
// Names are built from the fields, in the same format the Excel import uses (blank parts are skipped)
const joinParts = (parts, fallback) => parts.filter(Boolean).join(' ') || fallback;
const withoutBlank = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => !blank(value)));

export const FORM_TYPES = [
  {
    key: 'Screws', label: '🔩 Screws', sourceType: 'screw', cssClass: 'screw-fields',
    belongsTo: (categoryName) => categoryName === 'Screws',
    fields: [
      select('size', 'Size', 'screw_size'), text('length', 'Length', 'Length (mm)'),
      select('head_type', 'Head Type', 'screw_head_type'), select('drive_type', 'Drive Type', 'screw_drive_type'),
      select('thread_type', 'Thread Type', 'screw_thread_type'), select('color', 'Color', 'screw_color'),
      select('material', 'Material', 'screw_material')
    ],
    blank: () => ({ size: '', length: '', head_type: '', drive_type: '', thread_type: '', color: '', material: '' }),
    fromItem: (item) => orEmpty(item, 'size', 'length', 'head_type', 'drive_type', 'thread_type', 'color', 'material'),
    toPayload: (fields) => {
      const values = orEmpty(fields, 'size', 'length', 'head_type', 'drive_type', 'thread_type', 'color', 'material');
      return {
        name: joinParts([values.size, values.length && `x ${values.length}mm`, values.head_type, values.drive_type], 'Screw'),
        ...values
      };
    }
  },
  {
    key: 'Nuts', label: '⚙️ Nuts', sourceType: 'nut', cssClass: 'nut-fields',
    belongsTo: (categoryName) => categoryName === 'Nuts',
    fields: [
      select('size', 'Size', 'nut_size'), select('type', 'Type', 'nut_type'), select('color', 'Color', 'nut_color'),
      { kind: 'checkbox', key: 'has_washer', label: 'Has Washer' }
    ],
    blank: () => ({ size: '', type: '', color: '', has_washer: false }),
    fromItem: (item) => ({ ...orEmpty(item, 'size', 'type', 'color'), has_washer: item.has_washer || false }),
    toPayload: (fields) => {
      const values = orEmpty(fields, 'size', 'type', 'color');
      return { name: joinParts([values.size, values.type, values.color], 'Nut'), ...values, has_washer: fields.has_washer || false };
    }
  },
  {
    key: 'Washers & Bearings', label: '⚪ Washers & Bearings', sourceType: 'washer_bearing', cssClass: 'washer-bearing-fields',
    belongsTo: (categoryName) => categoryName === 'Washers & Bearings',
    fields: [
      { kind: 'choice', key: 'wb_category', label: 'Type', required: true, options: ['Washer', 'Bearing'] },
      text('name', 'Name', 'e.g., 6801RS, 6X2.5x0.5', { target: 'common' }),
      number('inner_diameter', 'Inner Diameter (mm)', 'e.g., 8', { step: '0.001' }),
      number('outer_diameter', 'Outer Diameter (mm)', 'e.g., 22', { step: '0.001' }),
      number('thickness', 'Thickness (mm)', 'e.g., 7', { step: '0.001' }),
      select('subtype', 'Subtype', 'washer_bearing_subtype'), select('material', 'Material', 'washer_bearing_material')
    ],
    blank: () => ({ wb_category: 'Washer', inner_diameter: null, outer_diameter: null, thickness: null, subtype: '', material: '' }),
    fromItem: (item) => ({
      wb_category: item.category || 'Washer',
      inner_diameter: item.inner_diameter, outer_diameter: item.outer_diameter, thickness: item.thickness,
      ...orEmpty(item, 'subtype', 'material')
    }),
    // Dimensions left empty are not sent, so an update keeps the stored values
    toPayload: (fields, common) => ({
      category: fields.wb_category || 'Washer',
      name: common.name,
      ...withoutBlank({ inner_diameter: fields.inner_diameter, outer_diameter: fields.outer_diameter, thickness: fields.thickness }),
      subtype: fields.subtype || '',
      material: fields.material || ''
    })
  },
  {
    key: 'RC Parts', label: '🏎️ RC Parts', sourceType: 'rc_part', cssClass: 'rc-part-fields',
    belongsTo: (categoryName) => categoryName === 'RC Parts',
    fields: [
      select('company', 'Company', 'rc_company'), select('model', 'Model', 'rc_model'),
      text('item_code', 'Item Code', 'Item code', { required: true })
    ],
    blank: () => ({ company: '', model: '', item_code: '' }),
    fromItem: (item) => ({
      company: item.display_company || item.company || '',
      model: item.display_model || item.model || '',
      item_code: item.display_code || item.item_code || ''
    }),
    // RC parts are identified by their item code and have no name field; a name that is already stored is passed through unchanged
    toPayload: (fields, common) => ({
      name: common.name, company: fields.company || '', model: fields.model || '',
      item_code: fields.item_code || 'RC Part'
    })
  },
  {
    key: 'Oils/Pastes', label: '🛢️ Oils/Pastes', sourceType: 'oil_paste', cssClass: 'oil-paste-fields',
    belongsTo: (categoryName) => /oil|paste/i.test(categoryName),
    fields: [
      select('company', 'Company', 'oil_paste_company'), select('type', 'Type', 'oil_paste_type'),
      text('characteristic', 'Characteristic', 'e.g., Graphite, Light Oil, Heavy Grease, etc.')
    ],
    blank: () => ({ company: '', type: '', characteristic: '' }),
    fromItem: (item) => orEmpty(item, 'company', 'type', 'characteristic'),
    toPayload: (fields) => {
      const values = orEmpty(fields, 'company', 'type', 'characteristic');
      return { name: joinParts([values.company, values.type], 'Oil/Paste'), ...values };
    }
  },
  {
    key: 'Batteries', label: '🔋 Batteries', sourceType: 'battery', cssClass: 'battery-fields',
    belongsTo: (categoryName) => categoryName === 'Batteries',
    fields: [
      select('size', 'Size', 'battery_size'), select('company', 'Company', 'battery_company'),
      select('model', 'Model', 'battery_model'), select('type', 'Type', 'battery_type'),
      { kind: 'date', key: 'expiration_date', label: 'Expiration Date' },
      number('mah', 'Capacity (mAh)', 'e.g., 2000'),
      { kind: 'checkbox', key: 'rechargeable', label: 'Rechargeable', groupClass: 'checkbox-group', labelClass: 'checkbox-label' }
    ],
    blank: () => ({ size: '', company: '', model: '', type: '', expiration_date: '', mah: null, rechargeable: false }),
    fromItem: (item) => ({
      ...orEmpty(item, 'size', 'company', 'model', 'type', 'expiration_date'),
      mah: item.mah || null,
      rechargeable: item.rechargeable ? true : false
    }),
    // Batteries have no name of their own; it is built from their parts
    toPayload: (fields) => ({
      size: fields.size || '', company: fields.company || '', model: fields.model || '', type: fields.type || '',
      expiration_date: fields.expiration_date || null,
      mah: fields.mah || null,
      rechargeable: fields.rechargeable ? 1 : 0,
      name: joinParts([fields.size, fields.company, fields.model], 'Battery')
    })
  },
  {
    key: 'Other Items', label: '📦 Other Items', sourceType: 'other_item', cssClass: 'other-items-fields',
    belongsTo: (categoryName) => categoryName === 'Other Items',
    fields: [
      text('other_item_type', 'Item Type', 'e.g., Connector, Washer, Switch, Resistor', { required: true }),
      text('other_item_name', 'Name', 'e.g., XT90 M, 6X2.5x05'),
      text('size', 'Size', 'e.g., Small, Medium, Large, 4mm'),
      text('other_item_company', 'Company', 'e.g., Noctua, No Name')
    ],
    blank: () => ({ other_item_type: '', other_item_name: '', size: '', other_item_company: '' }),
    // The specific type (e.g. "Cable") is stored in item_type
    fromItem: (item) => ({
      other_item_type: item.item_type, other_item_name: item.name || '', size: item.size || '', other_item_company: item.company || ''
    }),
    toPayload: (fields) => ({
      item_type: fields.other_item_type || 'Unknown', name: fields.other_item_name || '',
      size: fields.size || '', company: fields.other_item_company || ''
    })
  }
];

export const formTypeByKey = (key) => FORM_TYPES.find((type) => type.key === key);
export const formTypeForItem = (item) => FORM_TYPES.find((type) => type.sourceType === item.source_type);

// The catalog option lists a form's dropdowns need
export const enumTypesOf = (type) => type.fields.filter((field) => field.kind === 'select').map((field) => field.enumType);

export const blankCommon = () => ({ name: '', box_id: '', quantity: 0, notes: '', category_id: '' });
export const commonFromItem = (item) => ({
  name: item.name || item.display_name || '',
  box_id: item.box_id || '',
  quantity: item.quantity || 0,
  notes: item.notes || '',
  category_id: item.category_id || ''
});

// The request body for the API. The category is looked up by name so items always land in the right one.
export function buildPayload(type, { common, fields }, categories) {
  const category = categories.find((candidate) => type.belongsTo(candidate.name));
  return {
    ...type.toPayload(fields, common),
    box_id: common.box_id,
    quantity: common.quantity,
    notes: common.notes,
    category_id: category ? category.id : common.category_id,
    source_type: type.sourceType
  };
}
