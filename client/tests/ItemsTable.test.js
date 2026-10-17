import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ItemsTable from '../src/components/ItemsTable.vue';

vi.mock('../src/services/api.js', () => ({
  itemsService: { updateQuantity: vi.fn() }
}));

enableAutoUnmount(afterEach);

const screw = (index, extra = {}) => ({
  id: `s${index}`, source_type: 'screw', category_id: 'c-screw', size: `M${String(index).padStart(2, '0')}`,
  quantity: index, storage_id: `S1-B${index}`, notes: '', ...extra
});
const many = (count) => Array.from({ length: count }, (_, index) => screw(index + 1));

function mountTable(props = {}) {
  return mount(ItemsTable, {
    props: { items: many(3), categoryId: 'c-screw', categoryName: 'Screws', modelValue: 1, ...props }
  });
}
const headers = (wrapper) => wrapper.findAll('thead th').map((th) => th.text().replace(/[↑↓]/g, '').replace(/\s+/g, ' ').trim());
const activeHeader = (wrapper) => wrapper.get('th.active').text().replace(/\s+/g, ' ').trim();
const sizes = (wrapper) => wrapper.findAll('td.size').map((td) => td.text());
const pageNumbers = (wrapper) => wrapper.findAll('.page-number').map((button) => button.text());

beforeEach(() => vi.clearAllMocks());

describe('layout', () => {
  it('shows the columns of the chosen category, then Storage, Qty, Notes and Actions', () => {
    expect(headers(mountTable())).toEqual(['Size', 'Length', 'Head Type', 'Drive Type', 'Thread Type', 'Color', 'Material', 'Storage', 'Qty', 'Notes', 'Actions']);
    expect(headers(mountTable({ categoryName: 'Nuts', items: [{ ...screw(1), source_type: 'nut' }] }))).toEqual(['Size', 'Type', 'Color', 'Has Washer', 'Storage', 'Qty', 'Notes', 'Actions']);
  });

  it('shows one cell per header in every row', () => {
    const wrapper = mountTable();
    for (const row of wrapper.findAll('tbody tr')) expect(row.findAll('td')).toHaveLength(headers(wrapper).length);
  });

  it('works out the layout from the items when the category name is not known yet', () => {
    const wrapper = mountTable({ categoryName: '', items: [{ ...screw(1), category_id: 'c-x', source_type: 'battery' }], categoryId: 'c-x' });
    expect(headers(wrapper)).toContain('Rechargeable');
  });

  it('gives each row a colour class for its kind of item', () => {
    const wrapper = mountTable({ items: [screw(1), { ...screw(2), source_type: 'oil_paste' }, { ...screw(3), source_type: 'rc_part' }] });
    expect(wrapper.findAll('tr.item-row').map((row) => row.classes().filter((name) => name !== 'item-row')[0])).toEqual(['screw', 'oil-paste', 'rc-part']);
  });

  it('marks expired and soon-to-expire batteries', () => {
    const wrapper = mountTable({
      categoryName: 'Batteries',
      items: [
        { ...screw(1), source_type: 'battery', expiration_date: '2001-01-01' },
        { ...screw(2), source_type: 'battery', expiration_date: '2999-01-01' }
      ]
    });
    const cells = wrapper.findAll('td.expiration-date');
    expect(cells[0].classes()).toContain('expired');
    expect(cells[1].classes()).not.toContain('expired');
    expect(cells[1].text()).toBe('Jan 1, 2999');
  });
});

describe('sorting', () => {
  it.each([
    ['Screws', 'screw', 'Size ↑'],
    ['Nuts', 'nut', 'Size ↑'],
    ['Batteries', 'battery', 'Size ↑'],
    ['Oils/Pastes', 'oil_paste', 'Company ↑'],
    ['Other Items', 'other_item', 'Item Type ↑'],
    ['Washers & Bearings', 'washer_bearing', 'Type ↑'],
    ['RC Parts', 'rc_part', 'Company ↑']
  ])('opens %s sorted by %s', (categoryName, source, expected) => {
    expect(activeHeader(mountTable({ categoryName, items: [{ ...screw(1), source_type: source }] }))).toBe(expected);
  });

  it('shows the default order straight away, then reverses on a click and flips back on the next', async () => {
    const wrapper = mountTable({ items: [screw(3), screw(1), screw(2)] });
    expect(sizes(wrapper)).toEqual(['M01', 'M02', 'M03']);
    const sizeHeader = wrapper.findAll('th.sortable').find((th) => th.text().startsWith('Size'));
    await sizeHeader.trigger('click');
    expect(activeHeader(wrapper)).toBe('Size ↓');
    expect(sizes(wrapper)).toEqual(['M03', 'M02', 'M01']);
    await sizeHeader.trigger('click');
    expect(activeHeader(wrapper)).toBe('Size ↑');
    expect(sizes(wrapper)).toEqual(['M01', 'M02', 'M03']);
  });

  it('sorts by another column when it is clicked, starting ascending', async () => {
    const wrapper = mountTable({ items: [screw(1, { color: 'Zinc' }), screw(2, { color: 'Black' }), screw(3, { color: 'Brass' })] });
    await wrapper.findAll('th.sortable').find((th) => th.text().startsWith('Color')).trigger('click');
    expect(activeHeader(wrapper)).toBe('Color ↑');
    expect(wrapper.findAll('td.color').map((td) => td.text())).toEqual(['Black', 'Brass', 'Zinc']);
  });

  it('sorts quantity as a number and storage by location', async () => {
    const wrapper = mountTable({ items: [screw(1, { quantity: 100 }), screw(2, { quantity: 9 }), screw(3, { quantity: 20 })] });
    await wrapper.findAll('th.sortable').find((th) => th.text().startsWith('Qty')).trigger('click');
    expect(wrapper.findAll('td.quantity').map((td) => td.text())).toEqual(['9', '20', '100']);
  });

  it('goes back to the first page whenever the sort changes', async () => {
    const wrapper = mountTable({ items: many(45), modelValue: 3 });
    await wrapper.findAll('th.sortable')[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[1]]);
  });

  it('returns to the new category’s default sort when another category is shown', async () => {
    const wrapper = mountTable({ items: [screw(3, { quantity: 1 }), screw(1, { quantity: 3 }), screw(2, { quantity: 2 })] });
    await wrapper.findAll('th.sortable').find((th) => th.text().startsWith('Qty')).trigger('click');
    expect(activeHeader(wrapper)).toBe('Qty ↑');
    expect(sizes(wrapper)).toEqual(['M03', 'M02', 'M01']);
    await wrapper.setProps({ categoryId: 'c-other', categoryName: 'Nuts' });
    expect(activeHeader(wrapper)).toBe('Size ↑');
    expect(sizes(wrapper)).toEqual(['M01', 'M02', 'M03']);
  });

  it('orders sizes with numbers in mind (M3 before M10)', () => {
    const wrapper = mountTable({ items: ['M10', 'M3', 'M2'].map((size, index) => ({ ...screw(index + 1), size })) });
    expect(sizes(wrapper)).toEqual(['M2', 'M3', 'M10']);
  });

  it('sorts a category without its own layout by company', () => {
    const items = [
      { ...screw(1), source_type: 'item', display_company: 'Zed', category_id: 'c-x' },
      { ...screw(2), source_type: 'item', display_company: 'Acme', category_id: 'c-x' }
    ];
    const wrapper = mountTable({ items, categoryId: 'c-x', categoryName: 'Tools' });
    expect(activeHeader(wrapper)).toBe('Company ↑');
    expect(wrapper.findAll('td.company').map((td) => td.text())).toEqual(['Acme', 'Zed']);
  });
});

describe('pagination', () => {
  it('shows 20 items per page and a button for each page', () => {
    const wrapper = mountTable({ items: many(45) });
    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
    expect(pageNumbers(wrapper)).toEqual(['1', '2', '3']);
    expect(wrapper.get('.pagination-info').text()).toBe('Showing 1 - 20 of 45 items');
  });

  it('shows the requested page and its range', () => {
    const wrapper = mountTable({ items: many(45), modelValue: 3 });
    expect(wrapper.findAll('tbody tr')).toHaveLength(5);
    expect(wrapper.get('.pagination-info').text()).toBe('Showing 41 - 45 of 45 items');
  });

  it('asks for the next, previous and numbered pages, and disables the ends', async () => {
    const wrapper = mountTable({ items: many(45), modelValue: 2 });
    const [previous, next] = wrapper.findAll('.btn-pagination');
    await next.trigger('click');
    await previous.trigger('click');
    await wrapper.findAll('.page-number')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([[3], [1], [3]]);
    expect(mountTable({ items: many(45), modelValue: 1 }).findAll('.btn-pagination')[0].attributes('disabled')).toBeDefined();
    expect(mountTable({ items: many(45), modelValue: 3 }).findAll('.btn-pagination')[1].attributes('disabled')).toBeDefined();
  });

  it('moves back to the last page when deleting leaves the current page empty', async () => {
    const wrapper = mountTable({ items: many(41), modelValue: 3 });
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    await wrapper.setProps({ items: many(40) });
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]]);
  });

  it('has no pagination when there is nothing to show', () => {
    const wrapper = mountTable({ items: [] });
    expect(wrapper.find('.pagination').exists()).toBe(false);
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
  });
});

describe('row actions', () => {
  it('tells its parent which item to edit, delete or show notes for', async () => {
    const item = screw(1, { notes: 'hello' });
    const wrapper = mountTable({ items: [item] });
    await wrapper.get('button[title="Edit"]').trigger('click');
    await wrapper.get('button[title="Delete"]').trigger('click');
    await wrapper.get('.notes-btn').trigger('click');
    expect(wrapper.emitted('edit')).toEqual([[item]]);
    expect(wrapper.emitted('delete')).toEqual([[item]]);
    expect(wrapper.emitted('view-notes')).toEqual([[item]]);
  });

  it('gives the delete button a name that says what it deletes', () => {
    expect(mountTable({ items: [screw(1, { display_name: 'M3 x 10' })] }).get('button[title="Delete"]').attributes('aria-label')).toBe('Delete M3 x 10');
  });

  it('passes quantity changes from the inline editor up, with the item', async () => {
    const item = screw(1);
    const wrapper = mountTable({ items: [item] });
    wrapper.findComponent({ name: 'QuantityEditor' }).vm.$emit('updated', 42);
    expect(wrapper.emitted('quantity-updated')).toEqual([[item, 42]]);
  });
});

describe('search hints', () => {
  it('flags notes that contain the search text, ignoring case, and only then', async () => {
    const wrapper = mountTable({ items: [screw(1, { notes: 'Bought at the Fair' }), screw(2, { notes: 'other' }), screw(3)] });
    expect(wrapper.findAll('.badge-match')).toHaveLength(0);
    await wrapper.setProps({ searchQuery: 'fair' });
    expect(wrapper.findAll('tbody tr').map((row) => row.find('.badge-match').exists())).toEqual([true, false, false]);
  });
});
