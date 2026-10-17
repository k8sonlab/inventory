import { formatExpirationDate, getExpirationStatusClass } from '../utils/dates.js';

// Each column knows how to show a value and how to sort by it, so the header, the cells and the sorting can never disagree.
//   key        sort key (unique within a table)
//   label      header text
//   cellClass  CSS class of the cells
//   value      text shown in the cell
//   sort       comparable value used when sorting by this column
//   statusClass (optional) extra class computed per row
const text = (field) => (item) => item[field] || '-';
const measure = (field) => (item) => item[field] ?? '-';
const dot = (field) => (item) => (item[field] ? '🟢' : '⚪');
const lower = (field) => (item) => String(item[field] || '').toLowerCase();
const lowerOf = (read) => (item) => String(read(item) || '').toLowerCase();
const number = (field) => (item) => Number(item[field]) || 0;
const flag = (field) => (item) => (item[field] ? 1 : 0);

const stringColumn = (field, label, cellClass = field.replaceAll('_', '-')) => ({
  key: field, label, cellClass, value: text(field), sort: lower(field)
});

const SCREW_COLUMNS = [
  stringColumn('size', 'Size'), stringColumn('length', 'Length'), stringColumn('head_type', 'Head Type'),
  stringColumn('drive_type', 'Drive Type'), stringColumn('thread_type', 'Thread Type'),
  stringColumn('color', 'Color'), stringColumn('material', 'Material')
];

const NUT_COLUMNS = [
  stringColumn('size', 'Size'), stringColumn('type', 'Type'), stringColumn('color', 'Color'),
  { key: 'has_washer', label: 'Has Washer', cellClass: 'has-washer', value: dot('has_washer'), sort: flag('has_washer') }
];

// Legacy table; kept so old bearing rows still display
const BEARING_COLUMNS = [
  stringColumn('type', 'Type'), stringColumn('seal_type', 'Seal Type'),
  { key: 'id_inner', label: 'ID (Inner)', cellClass: 'id-inner', value: text('id_inner'), sort: number('id_inner') },
  { key: 'od', label: 'OD', cellClass: 'od', value: text('od'), sort: number('od') },
  { key: 'width', label: 'Width', cellClass: 'width', value: text('width'), sort: number('width') },
  { key: 'flanged', label: 'Flanged', cellClass: 'flanged', value: dot('flanged'), sort: flag('flanged') }
];

const OIL_PASTE_COLUMNS = [
  stringColumn('company', 'Company'), stringColumn('type', 'Type'), stringColumn('characteristic', 'Characteristic')
];

const BATTERY_COLUMNS = [
  stringColumn('size', 'Size'), stringColumn('company', 'Company'), stringColumn('model', 'Model'), stringColumn('type', 'Type'),
  { key: 'mah', label: 'mAh', cellClass: 'mah', value: (item) => (item.mah ? `${item.mah} mAh` : '-'), sort: number('mah') },
  { key: 'rechargeable', label: 'Rechargeable', cellClass: 'rechargeable', value: dot('rechargeable'), sort: flag('rechargeable') },
  {
    key: 'expiration_date', label: 'Expiration', cellClass: 'expiration-date',
    value: (item) => formatExpirationDate(item.expiration_date),
    statusClass: (item) => getExpirationStatusClass(item.expiration_date),
    sort: (item) => (item.expiration_date ? new Date(item.expiration_date).getTime() : 0)
  }
];

const OTHER_ITEM_COLUMNS = [
  stringColumn('item_type', 'Item Type'),
  { key: 'name', label: 'Name', cellClass: 'name', value: text('name'), sort: lowerOf((item) => item.display_name || item.name) },
  stringColumn('size', 'Size'), stringColumn('company', 'Company')
];

const WASHER_BEARING_COLUMNS = [
  stringColumn('category', 'Type'),
  { key: 'name', label: 'Name', cellClass: 'name', value: text('name'), sort: lowerOf((item) => item.display_name || item.name) },
  { key: 'inner_diameter', label: 'ID', cellClass: 'inner-diameter', value: measure('inner_diameter'), sort: number('inner_diameter') },
  { key: 'outer_diameter', label: 'OD', cellClass: 'outer-diameter', value: measure('outer_diameter'), sort: number('outer_diameter') },
  { key: 'thickness', label: 'Thickness', cellClass: 'thickness', value: measure('thickness'), sort: number('thickness') },
  stringColumn('subtype', 'Subtype'), stringColumn('material', 'Material')
];

const RC_PART_COLUMNS = [
  { key: 'company', label: 'Company', cellClass: 'company', value: text('display_company'), sort: lower('display_company') },
  { key: 'model', label: 'Model', cellClass: 'model', value: text('display_model'), sort: lower('display_model') },
  { key: 'code', label: 'Item Code', cellClass: 'code', value: text('display_code'), sort: lower('display_code') }
];

// Any category without a dedicated layout (RC Parts have no name: the item code identifies them)
const DEFAULT_COLUMNS = [
  ...RC_PART_COLUMNS,
  { key: 'name', label: 'Name', cellClass: 'item-name', value: (item) => item.display_name || item.name || '-', sort: lowerOf((item) => item.display_name || item.name) }
];

// Shown after every category's own columns
export const STORAGE_COLUMN = {
  key: 'storage', label: 'Storage', cellClass: 'storage',
  value: (item) => item.storage_id || item.box_name || '-',
  sort: lowerOf((item) => item.storage_id || item.box_name)
};
export const QUANTITY_COLUMN = { key: 'quantity', label: 'Qty', cellClass: 'quantity', sort: number('quantity') };

const includesAny = (...terms) => (name) => terms.some((term) => name.toLowerCase().includes(term));

// Checked in this order; a category matches by its name, or by the kind of items it contains.
// `defaultSort` is the column the table is sorted by until the user picks another.
export const TABLE_KINDS = [
  { id: 'screws', source: 'screw', matches: includesAny('screw'), columns: SCREW_COLUMNS, defaultSort: 'size' },
  { id: 'nuts', source: 'nut', matches: includesAny('nut'), columns: NUT_COLUMNS, defaultSort: 'size' },
  { id: 'bearings', source: 'bearing', matches: (name) => name === 'Bearings', columns: BEARING_COLUMNS, defaultSort: 'type' },
  { id: 'oils', source: 'oil_paste', matches: includesAny('oil', 'paste'), columns: OIL_PASTE_COLUMNS, defaultSort: 'company' },
  { id: 'batteries', source: 'battery', matches: includesAny('batter'), columns: BATTERY_COLUMNS, defaultSort: 'size' },
  { id: 'other', source: 'other_item', matches: includesAny('other'), columns: OTHER_ITEM_COLUMNS, defaultSort: 'item_type' },
  { id: 'washers', source: 'washer_bearing', matches: (name) => name === 'Washers & Bearings', columns: WASHER_BEARING_COLUMNS, defaultSort: 'category' },
  { id: 'rc', source: 'rc_part', matches: (name) => name === 'RC Parts', columns: RC_PART_COLUMNS, defaultSort: 'company' }
];

export const DEFAULT_KIND = { id: 'default', columns: DEFAULT_COLUMNS };

export function resolveTableKind({ categoryId, categoryName, items }) {
  if (!categoryId) return DEFAULT_KIND;
  const found = TABLE_KINDS.find((kind) =>
    (categoryName && kind.matches(categoryName)) ||
    items.some((item) => item.category_id === categoryId && item.source_type === kind.source));
  return found ?? DEFAULT_KIND;
}

export const defaultSortKey = (kind) => kind.defaultSort ?? 'company';

// Text compares with numbers in mind, so AG3 comes before AG10 and M3 before M10
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const compare = (left, right) => {
  if (typeof left === 'string' && typeof right === 'string') return collator.compare(left, right);
  return left < right ? -1 : left > right ? 1 : 0;
};

// Returns a sorted copy; an unknown sort key leaves the order the server gave
export function sortItems(items, columns, sortKey, order) {
  const column = [...columns, STORAGE_COLUMN, QUANTITY_COLUMN].find((candidate) => candidate.key === sortKey);
  const sorted = [...items];
  if (!column) return sorted;
  const direction = order === 'asc' ? 1 : -1;
  return sorted.sort((a, b) => direction * compare(column.sort(a), column.sort(b)));
}
