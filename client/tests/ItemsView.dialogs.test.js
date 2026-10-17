import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import ItemsView from '../src/views/ItemsView.vue';
import { itemsService, categoriesService, locationsService } from '../src/services/api.js';
import { resetNotifications } from '../src/composables/useNotifications.js';
import { cancelButton, confirmButton, confirmDialog, mountWithHost, toastTexts } from './helpers.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { getAll: vi.fn(), update: vi.fn(), create: vi.fn(), delete: vi.fn(), updateQuantity: vi.fn() },
  categoriesService: { getAll: vi.fn() },
  locationsService: { getBoxes: vi.fn() },
  enumsService: { getValues: vi.fn() }
}));

enableAutoUnmount(afterEach);

const screw = { id: 'screw-1', source_type: 'screw', name: 'M3 x 10', display_name: 'M3 x 10', size: 'M3', quantity: 5, category_id: 'c-screw', box_id: 'box-1' };
const other = { id: 'other-1', source_type: 'other_item', item_type: 'Cable', name: 'USB cable', display_name: 'USB cable', quantity: 2, category_id: 'c-other', box_id: 'box-1' };

async function mountCategory(category, rows) {
  itemsService.getAll.mockResolvedValue({ data: rows });
  const wrapper = mountWithHost(ItemsView, { selectedCategory: category });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetNotifications();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  categoriesService.getAll.mockResolvedValue({ data: [{ id: 'c-screw', name: 'Screws' }, { id: 'c-other', name: 'Other Items' }] });
  locationsService.getBoxes.mockResolvedValue({ data: [{ id: 'box-1', storage_id: 'S1-B01', box_name: 'Box' }] });
  itemsService.delete.mockResolvedValue({ data: { message: 'Item deleted' } });
  itemsService.update.mockResolvedValue({ data: other });
});

describe('deleting an item', () => {
  it('names the item in an in-page dialog and sends nothing until confirmed', async () => {
    const wrapper = await mountCategory('c-screw', [screw]);
    const button = wrapper.get('tbody button[title="Delete"]');
    expect(button.attributes('aria-label')).toBe('Delete M3 x 10');
    await button.trigger('click');
    expect(confirmDialog(wrapper).text()).toContain('Delete "M3 x 10"?');
    expect(itemsService.delete).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('keeps the item when the dialog is cancelled', async () => {
    const wrapper = await mountCategory('c-screw', [screw]);
    await wrapper.get('tbody button[title="Delete"]').trigger('click');
    await cancelButton(wrapper).trigger('click');
    await flushPromises();
    expect(itemsService.delete).not.toHaveBeenCalled();
    expect(itemsService.getAll).toHaveBeenCalledTimes(1);
  });

  it('tells the server which table the item lives in, then reloads the list', async () => {
    const wrapper = await mountCategory('c-screw', [screw]);
    itemsService.getAll.mockResolvedValue({ data: [] });
    await wrapper.get('tbody button[title="Delete"]').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(itemsService.delete).toHaveBeenCalledTimes(1);
    expect(itemsService.delete).toHaveBeenCalledWith('screw-1', 'screw');
    expect(itemsService.getAll).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(toastTexts(wrapper)).toEqual([]);
  });

  it('sends the right source type for other kinds of item too', async () => {
    const wrapper = await mountCategory('c-other', [other]);
    await wrapper.get('tbody button[title="Delete"]').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(itemsService.delete).toHaveBeenCalledWith('other-1', 'other_item');
  });

  it('shows why a delete failed and keeps the item listed', async () => {
    const wrapper = await mountCategory('c-screw', [screw]);
    itemsService.delete.mockRejectedValue({ response: { status: 500, data: { error: 'Internal server error' } } });
    await wrapper.get('tbody button[title="Delete"]').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Internal server error']);
    expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    expect(window.alert).not.toHaveBeenCalled();
  });
});

describe('saving an item', () => {
  it('shows the failure in the page and keeps the form open with its values', async () => {
    const wrapper = await mountCategory('c-other', [other]);
    itemsService.update.mockRejectedValue({ response: { status: 409, data: { error: 'Request conflicts with existing data' } } });
    await wrapper.get('tbody button[title="Edit"]').trigger('click');
    await flushPromises();
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Request conflicts with existing data']);
    expect(wrapper.find('form.modal-form').exists()).toBe(true);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('falls back to a clear message when the server cannot be reached', async () => {
    const wrapper = await mountCategory('c-other', [other]);
    itemsService.update.mockRejectedValue(Object.assign(new Error('Network Error'), { request: {} }));
    await wrapper.get('tbody button[title="Edit"]').trigger('click');
    await flushPromises();
    await wrapper.get('form.modal-form').trigger('submit');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Could not reach the server. Check your connection and try again.']);
  });
});
