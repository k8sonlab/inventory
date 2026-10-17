import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../src/router.js';
import App from '../src/App.vue';
import { itemsService, categoriesService, locationsService, enumsService } from '../src/services/api.js';
import { resetNotifications } from '../src/composables/useNotifications.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { getAll: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), updateQuantity: vi.fn() },
  categoriesService: { getAll: vi.fn() },
  locationsService: { getBoxes: vi.fn() },
  enumsService: { getValues: vi.fn() }
}));

enableAutoUnmount(afterEach);

// The whole app (router, navigation, items view, table) with only the API faked, in the order the server might send rows
const CATEGORIES = [
  { id: 'c-battery', name: 'Batteries' }, { id: 'c-nut', name: 'Nuts' }, { id: 'c-oil', name: 'Oils/Pastes' },
  { id: 'c-other', name: 'Other Items' }, { id: 'c-rc', name: 'RC Parts' }, { id: 'c-screw', name: 'Screws' },
  { id: 'c-washer', name: 'Washers & Bearings' }
];
const row = (source, category, fields, quantity = 1) => ({
  id: `${source}-${Math.random()}`, source_type: source, category_id: category, quantity, storage_id: 'S1', ...fields
});
const ROWS = {
  'c-screw': [row('screw', 'c-screw', { size: 'M10' }, 5), row('screw', 'c-screw', { size: 'M3' }, 1), row('screw', 'c-screw', { size: 'M4' }, 3)],
  'c-nut': [row('nut', 'c-nut', { size: 'M5' }), row('nut', 'c-nut', { size: 'M2' }), row('nut', 'c-nut', { size: 'M3' })],
  'c-battery': [row('battery', 'c-battery', { size: 'CR2032' }), row('battery', 'c-battery', { size: 'AG10' }), row('battery', 'c-battery', { size: 'AG3' })],
  'c-oil': [row('oil_paste', 'c-oil', { company: 'Traxxas' }), row('oil_paste', 'c-oil', { company: 'Acme' }), row('oil_paste', 'c-oil', { company: 'Kafuter' })],
  'c-other': [row('other_item', 'c-other', { item_type: 'Switch' }), row('other_item', 'c-other', { item_type: 'Cable' }), row('other_item', 'c-other', { item_type: 'Glue' })],
  'c-washer': [row('washer_bearing', 'c-washer', { category: 'Washer' }), row('washer_bearing', 'c-washer', { category: 'Bearing' })],
  'c-rc': [row('rc_part', 'c-rc', { display_company: 'Traxxas' }), row('rc_part', 'c-rc', { display_company: 'AXSPEED' })]
};

async function mountApp(path = '/items') {
  const router = createAppRouter(createMemoryHistory());
  router.push(path);
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

const goTo = async (wrapper, label) => {
  await wrapper.findAll('nav a').find((link) => link.text() === label).trigger('click');
  await flushPromises();
};
const active = (wrapper) => wrapper.get('th.active').text().replace(/\s+/g, ' ').trim();
const column = (wrapper, selector) => wrapper.findAll(`tbody ${selector}`).map((cell) => cell.text());

const EXPECTED = [
  ['Screws', 'Size ↑', 'td.size', ['M3', 'M4', 'M10']],
  ['Nuts', 'Size ↑', 'td.size', ['M2', 'M3', 'M5']],
  ['Batteries', 'Size ↑', 'td.size', ['AG3', 'AG10', 'CR2032']],
  ['Oils/Pastes', 'Company ↑', 'td.company', ['Acme', 'Kafuter', 'Traxxas']],
  ['Other Items', 'Item Type ↑', 'td.item-type', ['Cable', 'Glue', 'Switch']],
  ['Washers & Bearings', 'Type ↑', 'td.category', ['Bearing', 'Washer']],
  ['RC Parts', 'Company ↑', 'td.company', ['AXSPEED', 'Traxxas']]
];

beforeEach(() => {
  vi.clearAllMocks();
  resetNotifications();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  categoriesService.getAll.mockResolvedValue({ data: CATEGORIES });
  locationsService.getBoxes.mockResolvedValue({ data: [] });
  enumsService.getValues.mockResolvedValue({ data: [] });
  itemsService.getAll.mockImplementation(async ({ category_id: categoryId }) => ({
    data: categoryId ? ROWS[categoryId] : Object.values(ROWS).flat()
  }));
});

describe('switching categories in the app', () => {
  it.each(EXPECTED)('%s opens sorted by its default column (%s)', async (label, header, selector, order) => {
    const { wrapper } = await mountApp('/items');
    await goTo(wrapper, label);
    expect(active(wrapper)).toBe(header);
    expect(column(wrapper, selector)).toEqual(order);
  });

  it('applies the default when arriving from another category, not just from the summary', async () => {
    const { wrapper } = await mountApp('/items');
    for (const [label, header, selector, order] of [...EXPECTED, ...EXPECTED.slice().reverse()]) {
      await goTo(wrapper, label);
      expect(active(wrapper)).toBe(header);
      expect(column(wrapper, selector)).toEqual(order);
    }
  });

  it('applies the default when the page is opened straight on a category', async () => {
    for (const [label, header, selector, order] of EXPECTED) {
      const slug = label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const { wrapper } = await mountApp(`/items/${slug}`);
      expect(active(wrapper)).toBe(header);
      expect(column(wrapper, selector)).toEqual(order);
      wrapper.unmount();
    }
  });

  it('applies the default when a category is opened from the summary tiles', async () => {
    const { wrapper } = await mountApp('/items');
    await wrapper.findAll('.summary-card').find((card) => card.text().startsWith('Other Items')).trigger('click');
    await flushPromises();
    expect(active(wrapper)).toBe('Item Type ↑');
    expect(column(wrapper, 'td.item-type')).toEqual(['Cable', 'Glue', 'Switch']);
  });

  it('forgets a column chosen in one category when moving to another, and when coming back', async () => {
    const { wrapper } = await mountApp('/items');
    await goTo(wrapper, 'Screws');
    await wrapper.findAll('th.sortable').find((th) => th.text().startsWith('Qty')).trigger('click');
    expect(active(wrapper)).toBe('Qty ↑');
    await goTo(wrapper, 'Nuts');
    expect(active(wrapper)).toBe('Size ↑');
    await goTo(wrapper, 'Screws');
    expect(active(wrapper)).toBe('Size ↑');
    expect(column(wrapper, 'td.size')).toEqual(['M3', 'M4', 'M10']);
  });

  it('keeps the default while the list is still loading after a switch', async () => {
    const { wrapper } = await mountApp('/items');
    await goTo(wrapper, 'Screws');
    let release;
    itemsService.getAll.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    await wrapper.findAll('nav a').find((link) => link.text() === 'Nuts').trigger('click');
    await flushPromises();
    release({ data: ROWS['c-nut'] });
    await flushPromises();
    expect(active(wrapper)).toBe('Size ↑');
    expect(column(wrapper, 'td.size')).toEqual(['M2', 'M3', 'M5']);
  });
});
