import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ItemsView from '../src/views/ItemsView.vue';
import { itemsService, categoriesService, locationsService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { getAll: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), updateQuantity: vi.fn() },
  categoriesService: { getAll: vi.fn() },
  locationsService: { getBoxes: vi.fn() },
  enumsService: { getValues: vi.fn() }
}));

const row = (name) => ({ id: name, source_type: 'screw', name, display_name: name, quantity: 1 });
const searches = () => itemsService.getAll.mock.calls.map(([filters]) => filters.search);

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function mountView() {
  const wrapper = mount(ItemsView, { props: { selectedCategory: 1 } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  itemsService.getAll.mockResolvedValue({ data: [row('M3 screw')] });
  categoriesService.getAll.mockResolvedValue({ data: [] });
  locationsService.getBoxes.mockResolvedValue({ data: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ItemsView search', () => {
  it('loads once on mount', async () => {
    const wrapper = await mountView();
    expect(itemsService.getAll).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('M3 screw');
  });

  it('waits until typing stops, then sends a single request for the final text', async () => {
    const wrapper = await mountView();
    const input = wrapper.get('input[type="text"]');
    await input.setValue('M');
    await vi.advanceTimersByTimeAsync(200);
    await input.setValue('M3');
    await vi.advanceTimersByTimeAsync(349);
    expect(itemsService.getAll).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(searches()).toEqual(['', 'M3']);
  });

  it('searches immediately on Enter without a duplicate debounced request', async () => {
    const wrapper = await mountView();
    const input = wrapper.get('input[type="text"]');
    await input.setValue('M3');
    await input.trigger('keydown.enter');
    await flushPromises();
    expect(searches()).toEqual(['', 'M3']);
    await vi.advanceTimersByTimeAsync(1000);
    expect(searches()).toEqual(['', 'M3']);
  });

  it('ignores a slow response that arrives after a newer search', async () => {
    const wrapper = await mountView();
    const slow = deferred();
    itemsService.getAll.mockReturnValueOnce(slow.promise).mockResolvedValueOnce({ data: [row('Newer result')] });
    const input = wrapper.get('input[type="text"]');
    await input.setValue('old');
    await vi.advanceTimersByTimeAsync(350);
    await input.setValue('new');
    await vi.advanceTimersByTimeAsync(350);
    await flushPromises();
    expect(wrapper.text()).toContain('Newer result');
    slow.resolve({ data: [row('Stale result')] });
    await flushPromises();
    expect(wrapper.text()).toContain('Newer result');
    expect(wrapper.text()).not.toContain('Stale result');
  });

  it('shows an error and no stale rows when a search fails, and recovers on the next search', async () => {
    const wrapper = await mountView();
    itemsService.getAll.mockRejectedValueOnce({ response: { data: { error: 'Internal server error' } } });
    const input = wrapper.get('input[type="text"]');
    await input.setValue('M3');
    await vi.advanceTimersByTimeAsync(350);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Internal server error');
    expect(wrapper.text()).not.toContain('M3 screw');
    await input.setValue('M4');
    await vi.advanceTimersByTimeAsync(350);
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('M3 screw');
  });

  it('does not search after the view is unmounted', async () => {
    const wrapper = await mountView();
    await wrapper.get('input[type="text"]').setValue('M3');
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(1000);
    expect(itemsService.getAll).toHaveBeenCalledTimes(1);
  });
});
