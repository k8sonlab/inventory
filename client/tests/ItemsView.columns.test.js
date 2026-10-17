import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ItemsView from '../src/views/ItemsView.vue';
import { itemsService, categoriesService, locationsService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { getAll: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), updateQuantity: vi.fn() },
  categoriesService: { getAll: vi.fn() },
  locationsService: { getBoxes: vi.fn() },
  enumsService: { getValues: vi.fn() }
}));

const base = { quantity: 3, storage_id: 'S1-B01', category_id: null, notes: '' };
const CATEGORIES = [
  { id: 'c-screw', name: 'Screws', source: 'screw', item: { size: 'M3', length: '10', head_type: 'Button', drive_type: 'Hex', thread_type: 'Coarse', color: 'Black', material: 'Steel' } },
  { id: 'c-nut', name: 'Nuts', source: 'nut', item: { size: 'M3', type: 'Lock', color: 'Zinc', has_washer: true } },
  { id: 'c-bearing', name: 'Bearings', source: 'bearing', item: { type: 'Ball', seal_type: '2RS', id_inner: 5, od: 10, width: 4, flanged: true } },
  { id: 'c-oil', name: 'Oils/Pastes', source: 'oil_paste', item: { company: 'Acme', type: 'Grease', characteristic: 'Thick' } },
  { id: 'c-battery', name: 'Batteries', source: 'battery', item: { size: 'AA', company: 'Duracell', model: 'Plus', type: 'Alkaline', mah: 2000, rechargeable: false, expiration_date: '2030-01-01' } },
  { id: 'c-other', name: 'Other Items', source: 'other_item', item: { item_type: 'Cable', name: 'USB', size: '1m', company: 'Acme' } },
  { id: 'c-washer', name: 'Washers & Bearings', source: 'washer_bearing', item: { category: 'Washer', name: 'M3 washer', inner_diameter: 3, outer_diameter: 7, thickness: 0.5, subtype: 'Flat', material: 'Steel' } },
  { id: 'c-rc', name: 'RC Parts', source: 'rc_part', item: { company: 'Traxxas', model: 'Slash', item_code: 'T-1' } }
];

// Header text recorded from the original implementation (each table must also have one cell per header)
const EXPECTED = {
  Screws: ['Size', 'Length', 'Head Type', 'Drive Type', 'Thread Type', 'Color', 'Material', 'Storage', 'Qty', 'Notes', 'Actions'],
  Nuts: ['Size', 'Type', 'Color', 'Has Washer', 'Storage', 'Qty', 'Notes', 'Actions'],
  Bearings: ['Type', 'Seal Type', 'ID (Inner)', 'OD', 'Width', 'Flanged', 'Storage', 'Qty', 'Notes', 'Actions'],
  'Oils/Pastes': ['Company', 'Type', 'Characteristic', 'Storage', 'Qty', 'Notes', 'Actions'],
  Batteries: ['Size', 'Company', 'Model', 'Type', 'mAh', 'Rechargeable', 'Expiration', 'Storage', 'Qty', 'Notes', 'Actions'],
  'Other Items': ['Item Type', 'Name', 'Size', 'Company', 'Storage', 'Qty', 'Notes', 'Actions'],
  'Washers & Bearings': ['Type', 'Name', 'ID', 'OD', 'Thickness', 'Subtype', 'Material', 'Storage', 'Qty', 'Notes', 'Actions'],
  'RC Parts': ['Company', 'Model', 'Item Code', 'Storage', 'Qty', 'Notes', 'Actions']
};

const clean = (text) => text.replace(/[↑↓]/g, '').replace(/\s+/g, ' ').trim();

async function mountCategory(category) {
  categoriesService.getAll.mockResolvedValue({ data: CATEGORIES.map(({ id, name }) => ({ id, name })) });
  locationsService.getBoxes.mockResolvedValue({ data: [] });
  itemsService.getAll.mockResolvedValue({
    data: [{ ...base, id: `${category.source}-1`, source_type: category.source, category_id: category.id, display_name: 'Thing', ...category.item }]
  });
  const wrapper = mount(ItemsView, { props: { selectedCategory: category.id } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ItemsView per-category table columns', () => {
  for (const category of CATEGORIES) {
    it(`${category.name} shows its own columns and nothing from other categories`, async () => {
      const wrapper = await mountCategory(category);
      const headers = wrapper.findAll('thead th').map((th) => clean(th.text()));
      expect(headers).toEqual(EXPECTED[category.name]);
      expect(wrapper.findAll('tbody tr')).toHaveLength(1);
      expect(wrapper.findAll('tbody tr td')).toHaveLength(headers.length);
    });
  }

  it('paginates and sorts through computed values', async () => {
    const screw = CATEGORIES[0];
    categoriesService.getAll.mockResolvedValue({ data: [{ id: screw.id, name: screw.name }] });
    locationsService.getBoxes.mockResolvedValue({ data: [] });
    itemsService.getAll.mockResolvedValue({
      data: Array.from({ length: 45 }, (_, index) => ({
        ...base, id: `s${index}`, source_type: 'screw', category_id: screw.id, size: `M${String(index).padStart(2, '0')}`
      }))
    });
    const wrapper = mount(ItemsView, { props: { selectedCategory: screw.id } });
    await flushPromises();
    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
    expect(wrapper.findAll('.btn-pagination')).not.toHaveLength(0);
    const next = wrapper.findAll('.btn-pagination').find((button) => button.text().includes('Next'));
    await next.trigger('click');
    await next.trigger('click');
    expect(wrapper.findAll('tbody tr')).toHaveLength(5);
    expect(next.attributes('disabled')).toBeDefined();
    const sizeHeader = wrapper.findAll('thead th').find((th) => clean(th.text()) === 'Size');
    const firstSize = () => wrapper.get('tbody tr td.size').text();
    // Screws open sorted by size, so page 3 starts at M40 and the first click reverses the order (back on page 1)
    expect(firstSize()).toBe('M40');
    await sizeHeader.trigger('click');
    expect(firstSize()).toBe('M44');
    await sizeHeader.trigger('click');
    expect(firstSize()).toBe('M00');
    expect(wrapper.findAll('tbody tr')).toHaveLength(20);
  });
});
