import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { h } from 'vue';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../src/router.js';
import App from '../src/App.vue';
import { categoriesService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  categoriesService: { getAll: vi.fn() }
}));

// Lightweight stand-ins so these tests cover routing only
vi.mock('../src/views/ItemsView.vue', () => ({
  default: {
    name: 'ItemsViewStub',
    props: { selectedCategory: { type: [Number, String], default: null } },
    emits: ['select-category'],
    setup(props, { emit }) {
      return () => h('div', { class: 'items-stub' }, [
        h('span', { class: 'selected' }, String(props.selectedCategory)),
        h('button', { class: 'open-nuts', onClick: () => emit('select-category', 'c-nut') }, 'open')
      ]);
    }
  }
}));
vi.mock('../src/views/LocationsManageView.vue', () => ({ default: { name: 'LocationsStub', render: () => h('div', { class: 'locations-stub' }) } }));
vi.mock('../src/views/ManageView.vue', () => ({ default: { name: 'ManageStub', render: () => h('div', { class: 'manage-stub' }) } }));

const CATEGORIES = [
  { id: 'c-screw', name: 'Screws' },
  { id: 'c-nut', name: 'Nuts' },
  { id: 'c-washer', name: 'Washers & Bearings' }
];

async function mountAt(path) {
  const router = createAppRouter(createMemoryHistory());
  router.push(path);
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

const activeLinks = (wrapper) => wrapper.findAll('nav a.active').map((link) => link.text());

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  categoriesService.getAll.mockResolvedValue({ data: CATEGORIES });
});

describe('app routing', () => {
  it('shows every category plus the fixed links in the navigation', async () => {
    const { wrapper } = await mountAt('/items');
    expect(wrapper.findAll('nav a').map((link) => link.text())).toEqual([
      'Items', 'Screws', 'Nuts', 'Washers & Bearings', 'Manage Locations', 'Manage'
    ]);
    expect(wrapper.findAll('nav a').map((link) => link.attributes('href'))).toEqual([
      '/items', '/items/screws', '/items/nuts', '/items/washers--bearings', '/locations', '/manage'
    ]);
  });

  it.each([
    ['/items', 'items-stub', ['Items'], 'null'],
    ['/items/nuts', 'items-stub', ['Nuts'], 'c-nut'],
    ['/items/washers--bearings', 'items-stub', ['Washers & Bearings'], 'c-washer'],
    ['/locations', 'locations-stub', ['Manage Locations'], undefined],
    ['/manage', 'manage-stub', ['Manage'], undefined]
  ])('%s renders the right view with the right link highlighted', async (path, view, active, selected) => {
    const { wrapper } = await mountAt(path);
    expect(wrapper.find(`.${view}`).exists()).toBe(true);
    expect(activeLinks(wrapper)).toEqual(active);
    if (selected !== undefined) expect(wrapper.get('.selected').text()).toBe(selected);
  });

  it('redirects the root and unknown addresses to the items page', async () => {
    for (const path of ['/', '/nonsense', '/%2Fitems']) {
      const { wrapper, router } = await mountAt(path);
      expect(router.currentRoute.value.fullPath).toBe('/items');
      expect(wrapper.find('.items-stub').exists()).toBe(true);
    }
  });

  it('treats an unknown category slug as no category', async () => {
    const { wrapper } = await mountAt('/items/not-a-category');
    expect(wrapper.get('.selected').text()).toBe('null');
    expect(activeLinks(wrapper)).toEqual([]);
  });

  it('navigates when links are clicked and when the items view selects a category', async () => {
    const { wrapper, router } = await mountAt('/items');
    await wrapper.findAll('nav a').find((link) => link.text() === 'Manage').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/manage');
    await router.push('/items');
    await flushPromises();
    await wrapper.get('.open-nuts').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/items/nuts');
    expect(wrapper.get('.selected').text()).toBe('c-nut');
    router.back();
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe('/items');
    expect(wrapper.get('.selected').text()).toBe('null');
  });

  it('still shows the app when the categories cannot be loaded', async () => {
    categoriesService.getAll.mockRejectedValue(new Error('offline'));
    const { wrapper } = await mountAt('/items/screws');
    expect(wrapper.find('.items-stub').exists()).toBe(true);
    expect(wrapper.get('.selected').text()).toBe('null');
    expect(wrapper.findAll('nav a').map((link) => link.text())).toEqual(['Items', 'Manage Locations', 'Manage']);
  });

  it('renders the first view only once the categories are known', async () => {
    let release;
    categoriesService.getAll.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const router = createAppRouter(createMemoryHistory());
    router.push('/items/nuts');
    await router.isReady();
    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find('.items-stub').exists()).toBe(false);
    release({ data: CATEGORIES });
    await flushPromises();
    expect(wrapper.get('.selected').text()).toBe('c-nut');
  });
});
