import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KIND, QUANTITY_COLUMN, STORAGE_COLUMN, TABLE_KINDS, defaultSortKey, resolveTableKind, sortItems
} from '../src/config/tableColumns.js';

const kind = (id) => TABLE_KINDS.find((candidate) => candidate.id === id);
const resolve = (categoryName, items = [], categoryId = 'c1') => resolveTableKind({ categoryId, categoryName, items }).id;

describe('resolveTableKind', () => {
  it('recognises each category by its name', () => {
    expect(resolve('Screws')).toBe('screws');
    expect(resolve('Nuts')).toBe('nuts');
    expect(resolve('Oils/Pastes')).toBe('oils');
    expect(resolve('Batteries')).toBe('batteries');
    expect(resolve('Other Items')).toBe('other');
    expect(resolve('Washers & Bearings')).toBe('washers');
    expect(resolve('Bearings')).toBe('bearings');
    expect(resolve('RC Parts')).toBe('rc');
  });

  it('is case-insensitive for the loose matches but exact for the two Bearings names', () => {
    expect(resolve('my SCREWS box')).toBe('screws');
    expect(resolve('bearings')).toBe('default');
    expect(resolve('Washers & Bearings')).toBe('washers');
  });

  it('falls back to the kind of items the category holds when the name is unfamiliar', () => {
    const items = [{ category_id: 'c1', source_type: 'battery' }];
    expect(resolve('Power cells', items)).toBe('batteries');
    expect(resolve('Power cells', [{ category_id: 'other', source_type: 'battery' }])).toBe('default');
  });

  it('works before the category list has loaded (no name yet)', () => {
    expect(resolveTableKind({ categoryId: 'c1', categoryName: undefined, items: [{ category_id: 'c1', source_type: 'nut' }] }).id).toBe('nuts');
  });

  it('uses the first matching kind, in a fixed order', () => {
    expect(resolve('Screws and nuts')).toBe('screws');
    expect(resolve('Anything', [{ category_id: 'c1', source_type: 'oil_paste' }, { category_id: 'c1', source_type: 'screw' }])).toBe('screws');
  });

  it('uses the default layout for unknown categories and when no category is chosen', () => {
    expect(resolve('Tools')).toBe('default');
    expect(resolveTableKind({ categoryId: '', categoryName: 'Screws', items: [] })).toBe(DEFAULT_KIND);
  });
});

describe('columns', () => {
  it('has unique sort keys within each layout', () => {
    for (const layout of [...TABLE_KINDS, DEFAULT_KIND]) {
      const keys = [...layout.columns, STORAGE_COLUMN, QUANTITY_COLUMN].map((column) => column.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('shows dashes for empty text and real zeros for measurements', () => {
    const [, , inner] = kind('washers').columns;
    expect(inner.value({ inner_diameter: 0 })).toBe(0);
    expect(inner.value({ inner_diameter: null })).toBe('-');
    expect(inner.value({})).toBe('-');
    expect(kind('screws').columns[0].value({ size: '' })).toBe('-');
  });

  it('formats batteries: capacity, rechargeable and expiration', () => {
    const [, , , , mah, rechargeable, expiration] = kind('batteries').columns;
    expect(mah.value({ mah: 2000 })).toBe('2000 mAh');
    expect(mah.value({ mah: 0 })).toBe('-');
    expect(rechargeable.value({ rechargeable: 1 })).toBe('🟢');
    expect(rechargeable.value({ rechargeable: 0 })).toBe('⚪');
    expect(expiration.value({ expiration_date: '2030-01-31T12:00:00Z' })).toBe('Jan 31, 2030');
    expect(expiration.statusClass({ expiration_date: '2001-01-01' })).toBe('expired');
  });

  it('opens each category sorted by its own column', () => {
    expect(defaultSortKey(kind('screws'))).toBe('size');
    expect(defaultSortKey(kind('nuts'))).toBe('size');
    expect(defaultSortKey(kind('batteries'))).toBe('size');
    expect(defaultSortKey(kind('oils'))).toBe('company');
    expect(defaultSortKey(kind('other'))).toBe('item_type');
    expect(defaultSortKey(kind('washers'))).toBe('category');
    expect(defaultSortKey(kind('rc'))).toBe('company');
    expect(defaultSortKey(DEFAULT_KIND)).toBe('company');
  });

  it('only ever defaults to a column that the layout really has', () => {
    for (const layout of [...TABLE_KINDS, DEFAULT_KIND]) {
      expect(layout.columns.map((column) => column.key)).toContain(defaultSortKey(layout));
    }
  });
});

describe('sortItems', () => {
  const screws = kind('screws').columns;

  it('sorts text without regard to case, ascending and descending', () => {
    const items = [{ size: 'm5' }, { size: 'M3' }, { size: 'M4' }];
    expect(sortItems(items, screws, 'size', 'asc').map((i) => i.size)).toEqual(['M3', 'M4', 'm5']);
    expect(sortItems(items, screws, 'size', 'desc').map((i) => i.size)).toEqual(['m5', 'M4', 'M3']);
  });

  it('orders text with numbers in mind: M3 before M10, AG3 before AG10, whatever the case', () => {
    const items = ['M10', 'M3', 'm2', 'M2.5', 'M20'].map((size) => ({ size }));
    expect(sortItems(items, screws, 'size', 'asc').map((i) => i.size)).toEqual(['m2', 'M2.5', 'M3', 'M10', 'M20']);
    const batteries = ['AG10', 'AG3', 'AAA', 'AA', '9V', 'CR2032', 'CR123'].map((size) => ({ size }));
    expect(sortItems(batteries, kind('batteries').columns, 'size', 'asc').map((i) => i.size))
      .toEqual(['9V', 'AA', 'AAA', 'AG3', 'AG10', 'CR123', 'CR2032']);
    expect(sortItems(batteries, kind('batteries').columns, 'size', 'desc')[0].size).toBe('CR2032');
  });

  it('puts empty values first when ascending', () => {
    const items = [{ size: 'M3' }, { size: '' }, {}, { size: 'M2' }];
    expect(sortItems(items, screws, 'size', 'asc').map((i) => i.size || '')).toEqual(['', '', 'M2', 'M3']);
  });

  it('does not change the list it was given', () => {
    const items = [{ size: 'b' }, { size: 'a' }];
    sortItems(items, screws, 'size', 'asc');
    expect(items.map((i) => i.size)).toEqual(['b', 'a']);
  });

  it('sorts numbers as numbers, not text', () => {
    const items = [{ quantity: 10 }, { quantity: 9 }, { quantity: 100 }];
    expect(sortItems(items, screws, 'quantity', 'asc').map((i) => i.quantity)).toEqual([9, 10, 100]);
  });

  it('sorts by storage location', () => {
    const items = [{ storage_id: 'S2-B01' }, { box_name: 'a box' }, { storage_id: 'S1-B01' }];
    expect(sortItems(items, screws, 'storage', 'asc').map((i) => i.storage_id || i.box_name)).toEqual(['a box', 'S1-B01', 'S2-B01']);
  });

  it('keeps the server order when the sort key is not a column of this layout', () => {
    const items = [{ size: 'b' }, { size: 'a' }];
    expect(sortItems(items, screws, 'company', 'asc').map((i) => i.size)).toEqual(['b', 'a']);
  });

  it('sorts every column that is shown by the value it shows (these columns could not sort before)', () => {
    const washers = kind('washers').columns;
    const items = [{ inner_diameter: 8, subtype: 'Flat', category: 'Washer' }, { inner_diameter: 3, subtype: 'Ball', category: 'Bearing' }];
    expect(sortItems(items, washers, 'inner_diameter', 'asc').map((i) => i.inner_diameter)).toEqual([3, 8]);
    expect(sortItems(items, washers, 'subtype', 'asc').map((i) => i.subtype)).toEqual(['Ball', 'Flat']);
    expect(sortItems(items, washers, 'category', 'asc').map((i) => i.category)).toEqual(['Bearing', 'Washer']);
    const oils = kind('oils').columns;
    expect(sortItems([{ company: 'Zed' }, { company: 'Acme' }], oils, 'company', 'asc').map((i) => i.company)).toEqual(['Acme', 'Zed']);
    const batteries = kind('batteries').columns;
    expect(sortItems([{ model: 'Z' }, { model: 'A' }], batteries, 'model', 'asc').map((i) => i.model)).toEqual(['A', 'Z']);
  });

  it('sorts batteries by expiration, with items that never expire first', () => {
    const batteries = kind('batteries').columns;
    const items = [{ expiration_date: '2031-01-01' }, { expiration_date: null }, { expiration_date: '2028-01-01' }];
    expect(sortItems(items, batteries, 'expiration_date', 'asc').map((i) => i.expiration_date)).toEqual([null, '2028-01-01', '2031-01-01']);
  });
});
