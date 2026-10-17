import { describe, expect, it } from 'vitest';
import {
  FORM_TYPES, blankCommon, buildPayload, commonFromItem, enumTypesOf, formTypeByKey, formTypeForItem
} from '../src/config/itemForms.js';

const CATEGORIES = [
  { id: 'c-screw', name: 'Screws' }, { id: 'c-nut', name: 'Nuts' }, { id: 'c-oil', name: 'Oils/Pastes' },
  { id: 'c-battery', name: 'Batteries' }, { id: 'c-other', name: 'Other Items' },
  { id: 'c-washer', name: 'Washers & Bearings' }, { id: 'c-rc', name: 'RC Parts' }
];
const type = (key) => formTypeByKey(key);
const build = (key, fields, common = {}, categories = CATEGORIES) =>
  buildPayload(type(key), { common: { ...blankCommon(), name: 'Thing', box_id: 'b1', quantity: 3, notes: 'n', ...common }, fields }, categories);

describe('form types', () => {
  it('offers the seven kinds of item in the original order', () => {
    expect(FORM_TYPES.map((t) => t.key)).toEqual(['Screws', 'Nuts', 'Washers & Bearings', 'RC Parts', 'Oils/Pastes', 'Batteries', 'Other Items']);
  });

  it('finds a form by key and by the kind of item it describes', () => {
    expect(formTypeByKey('Nuts').sourceType).toBe('nut');
    expect(formTypeForItem({ source_type: 'battery' }).key).toBe('Batteries');
    expect(formTypeForItem({ source_type: 'other_item' }).key).toBe('Other Items');
    expect(formTypeForItem({ source_type: 'bearing' })).toBeUndefined();
    expect(formTypeForItem({ source_type: 'item' })).toBeUndefined();
  });

  it('gives every field a unique key and every dropdown its option list', () => {
    for (const t of FORM_TYPES) {
      const keys = t.fields.map((f) => f.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const f of t.fields.filter((field) => field.kind === 'select')) expect(f.enumType).toMatch(/^[a-z_]+$/);
    }
  });

  it('derives the option lists to load from the fields, so none can be forgotten', () => {
    expect(enumTypesOf(type('Batteries'))).toEqual(['battery_size', 'battery_company', 'battery_model', 'battery_type']);
    expect(enumTypesOf(type('Screws'))).toEqual(['screw_size', 'screw_head_type', 'screw_drive_type', 'screw_thread_type', 'screw_color', 'screw_material']);
    expect(enumTypesOf(type('Other Items'))).toEqual([]);
    expect(enumTypesOf(type('Washers & Bearings'))).toEqual(['washer_bearing_subtype', 'washer_bearing_material']);
  });

  it('starts every form with an empty field for each of its inputs, so nothing is undefined', () => {
    for (const t of FORM_TYPES) {
      const blank = t.blank();
      for (const f of t.fields.filter((field) => field.target !== 'common')) expect(blank).toHaveProperty(f.key);
    }
  });

  it('reads back a saved item into the same set of fields', () => {
    for (const t of FORM_TYPES) {
      expect(Object.keys(t.fromItem({})).sort()).toEqual(Object.keys(t.blank()).sort());
    }
  });
});

describe('common fields', () => {
  it('start empty for a new item', () => {
    expect(blankCommon()).toEqual({ name: '', box_id: '', quantity: 0, notes: '', category_id: '' });
  });

  it('are read from an item, using the display name when there is no name', () => {
    expect(commonFromItem({ display_name: 'Duracell AA', box_id: 'b', quantity: 4, notes: 'x', category_id: 'c' }))
      .toEqual({ name: 'Duracell AA', box_id: 'b', quantity: 4, notes: 'x', category_id: 'c' });
    expect(commonFromItem({})).toEqual({ name: '', box_id: '', quantity: 0, notes: '', category_id: '' });
  });
});

describe('buildPayload', () => {
  it('finds the category by name so an item always lands in the right one', () => {
    expect(build('Screws', type('Screws').blank()).category_id).toBe('c-screw');
    expect(build('Oils/Pastes', type('Oils/Pastes').blank(), {}, [{ id: 'x', name: 'Lubricant paste' }]).category_id).toBe('x');
  });

  it('keeps the item’s own category when no category matches', () => {
    expect(build('Screws', type('Screws').blank(), { category_id: 'kept' }, []).category_id).toBe('kept');
  });

  it('tells the API which table the item belongs to', () => {
    for (const t of FORM_TYPES) expect(build(t.key, t.blank()).source_type).toBe(t.sourceType);
  });

  it('turns missing screw, nut and oil values into empty strings', () => {
    expect(build('Screws', { size: null, length: undefined, head_type: '', drive_type: '', thread_type: '', color: '', material: '' }))
      .toMatchObject({ size: '', length: '', head_type: '' });
    expect(build('Nuts', { size: 'M3', type: null, color: '', has_washer: undefined })).toMatchObject({ type: '', has_washer: false });
    expect(build('Oils/Pastes', { company: undefined, type: '', characteristic: null })).toMatchObject({ company: '', characteristic: '' });
  });

  it('builds a battery name from its parts and turns flags and blanks into what the API stores', () => {
    const payload = build('Batteries', { size: 'AA', company: 'Duracell', model: '', type: 'Alkaline', expiration_date: '', mah: 0, rechargeable: true });
    expect(payload).toMatchObject({ name: 'AA Duracell', rechargeable: 1, expiration_date: null, mah: null });
    expect(build('Batteries', type('Batteries').blank())).toMatchObject({ name: 'Battery', rechargeable: 0 });
  });

  it('identifies an RC part by its item code, which is required, and has no name field of its own', () => {
    const rc = type('RC Parts');
    expect(rc.fields.map((field) => field.key)).toEqual(['company', 'model', 'item_code']);
    expect(rc.fields.find((field) => field.key === 'item_code').required).toBe(true);
    expect(build('RC Parts', { company: '', model: '', item_code: 'T-1' }).item_code).toBe('T-1');
    expect(build('RC Parts', { company: '', model: '', item_code: '' }).item_code).toBe('RC Part');
  });

  it('sends no name for a new RC part, but passes on one that is already stored', () => {
    expect(build('RC Parts', { company: '', model: '', item_code: 'T-1' }, { name: '' }).name).toBe('');
    expect(build('RC Parts', { company: '', model: '', item_code: 'T-1' }, { name: 'Old name' }).name).toBe('Old name');
  });

  it('stores an Other Item’s own type, name and company, with Unknown as the last resort', () => {
    expect(build('Other Items', { other_item_type: 'Cable', other_item_name: 'USB', size: '1m', other_item_company: 'Acme' }))
      .toMatchObject({ item_type: 'Cable', name: 'USB', size: '1m', company: 'Acme' });
    expect(build('Other Items', type('Other Items').blank())).toMatchObject({ item_type: 'Unknown', name: '', company: '' });
  });

  it('does not send empty washer dimensions, so an update keeps the stored ones', () => {
    const payload = build('Washers & Bearings', { wb_category: 'Bearing', inner_diameter: 8, outer_diameter: '', thickness: null, subtype: '', material: '' });
    expect(payload).toMatchObject({ category: 'Bearing', inner_diameter: 8, name: 'Thing' });
    expect(payload).not.toHaveProperty('outer_diameter');
    expect(payload).not.toHaveProperty('thickness');
    expect(build('Washers & Bearings', { ...type('Washers & Bearings').blank(), inner_diameter: 0 })).toHaveProperty('inner_diameter', 0);
  });

  it('defaults a washer entry to the Washer type', () => {
    expect(build('Washers & Bearings', { ...type('Washers & Bearings').blank(), wb_category: '' }).category).toBe('Washer');
  });
});

describe('generated names', () => {
  const name = (key, fields) => build(key, { ...type(key).blank(), ...fields }).name;

  it('builds screw names like the Excel import does', () => {
    expect(name('Screws', { size: 'M2', length: '10', head_type: 'Countersunk', drive_type: 'Allen' })).toBe('M2 x 10mm Countersunk Allen');
    expect(name('Screws', { size: 'M3', length: '', head_type: 'Cap', drive_type: '' })).toBe('M3 Cap');
    expect(name('Screws', {})).toBe('Screw');
  });

  it('builds nut names like the Excel import does, skipping empty parts', () => {
    expect(name('Nuts', { size: 'M2', type: 'Simple', color: 'Black' })).toBe('M2 Simple Black');
    expect(name('Nuts', { size: 'M3', type: 'Threaded insert', color: '' })).toBe('M3 Threaded insert');
    expect(name('Nuts', {})).toBe('Nut');
  });

  it('builds oil and paste names from company and type', () => {
    expect(name('Oils/Pastes', { company: 'G Wolves', type: 'Grease', characteristic: 'Thick' })).toBe('G Wolves Grease');
    expect(name('Oils/Pastes', { type: 'Paste' })).toBe('Paste');
    expect(name('Oils/Pastes', {})).toBe('Oil/Paste');
  });

  it('ignores whatever name was typed or stored: it always follows the fields', () => {
    const payload = build('Nuts', { size: 'M4', type: 'Simple', color: '' }, { name: 'Old typed name' });
    expect(payload.name).toBe('M4 Simple');
  });

  it('keeps the names of washers and other items as the user typed them', () => {
    expect(build('Washers & Bearings', type('Washers & Bearings').blank(), { name: '608RS' }).name).toBe('608RS');
    expect(build('Other Items', { other_item_type: 'Cable', other_item_name: 'USB', size: '', other_item_company: '' }).name).toBe('USB');
  });
});

describe('reading an existing item', () => {
  it('copes with values the API returns as null', () => {
    expect(type('Screws').fromItem({ size: null, length: null })).toMatchObject({ size: '', length: '' });
    expect(type('Nuts').fromItem({ has_washer: 1 })).toMatchObject({ has_washer: 1 });
    expect(type('Batteries').fromItem({ rechargeable: 1, mah: 2000 })).toMatchObject({ rechargeable: true, mah: 2000 });
    expect(type('Batteries').fromItem({ rechargeable: 0 })).toMatchObject({ rechargeable: false, mah: null });
  });

  it('uses the display fields for RC parts', () => {
    expect(type('RC Parts').fromItem({ display_company: 'Traxxas', display_model: 'Slash', display_code: 'T-100' }))
      .toEqual({ company: 'Traxxas', model: 'Slash', item_code: 'T-100' });
  });

  it('keeps an Other Item’s specific type, which the API stores in item_type', () => {
    expect(type('Other Items').fromItem({ item_type: 'Cable', name: 'USB', size: '1m', company: 'Acme' }))
      .toEqual({ other_item_type: 'Cable', other_item_name: 'USB', size: '1m', other_item_company: 'Acme' });
  });

  it('keeps washer dimensions exactly, including zero', () => {
    expect(type('Washers & Bearings').fromItem({ category: 'Bearing', inner_diameter: 0, outer_diameter: 22, thickness: null }))
      .toMatchObject({ wb_category: 'Bearing', inner_diameter: 0, outer_diameter: 22, thickness: null });
  });
});
