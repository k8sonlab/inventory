import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises } from '@vue/test-utils';
import LocationsManageView from '../src/views/LocationsManageView.vue';
import { locationsService } from '../src/services/api.js';
import { resetNotifications } from '../src/composables/useNotifications.js';
import { cancelButton, confirmButton, confirmDialog, mountWithHost, toastTexts } from './helpers.js';

vi.mock('../src/services/api.js', () => ({
  locationsService: {
    getShelves: vi.fn(), getBoxes: vi.fn(), createShelf: vi.fn(), createBox: vi.fn(), deleteBox: vi.fn()
  }
}));

enableAutoUnmount(afterEach);

const SHELVES = [{ id: 's1', shelf_code: 'S01', location: 'Brown Kallax' }, { id: 's2', shelf_code: 'S02', location: 'Empty shelf' }];
const BOXES = [{ id: 'b1', shelf_id: 's1', shelf_code: 'S01', storage_id: 'S01-B01', box_name: 'Big Box' }];

async function mountView() {
  const wrapper = mountWithHost(LocationsManageView);
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetNotifications();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  locationsService.getShelves.mockResolvedValue({ data: SHELVES });
  locationsService.getBoxes.mockResolvedValue({ data: BOXES });
  locationsService.createShelf.mockResolvedValue({ data: {} });
  locationsService.createBox.mockResolvedValue({ data: {} });
  locationsService.deleteBox.mockResolvedValue({ data: {} });
});

describe('deleting a box', () => {
  it('asks first, naming the box, and deletes it only after confirmation', async () => {
    const wrapper = await mountView();
    const button = wrapper.get('button[aria-label="Delete box S01-B01"]');
    await button.trigger('click');
    expect(confirmDialog(wrapper).text()).toContain('Delete box "S01-B01"?');
    await cancelButton(wrapper).trigger('click');
    await flushPromises();
    expect(locationsService.deleteBox).not.toHaveBeenCalled();
    await button.trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(locationsService.deleteBox).toHaveBeenCalledExactlyOnceWith('b1');
    expect(locationsService.getBoxes).toHaveBeenCalledTimes(2);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('explains the failure, such as a box that still holds items', async () => {
    locationsService.deleteBox.mockRejectedValue({ response: { status: 409, data: { error: 'Request conflicts with existing data' } } });
    const wrapper = await mountView();
    await wrapper.get('button[aria-label="Delete box S01-B01"]').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Request conflicts with existing data']);
  });
});

describe('deleting a shelf', () => {
  it('says so straight away when the shelf still has boxes, without a pointless confirmation', async () => {
    const wrapper = await mountView();
    await wrapper.get('button[aria-label="Delete shelf S01"]').trigger('click');
    expect(confirmDialog(wrapper).exists()).toBe(false);
    expect(toastTexts(wrapper)).toEqual(['Cannot delete a shelf that still has boxes. Delete its boxes first.']);
  });

  it('says plainly that shelf deletion is not available for an empty shelf', async () => {
    const wrapper = await mountView();
    await wrapper.get('button[aria-label="Delete shelf S02"]').trigger('click');
    expect(confirmDialog(wrapper).exists()).toBe(false);
    expect(toastTexts(wrapper)).toEqual(['Shelf deletion is not available yet.']);
    expect(wrapper.get('.toast').attributes('role')).toBe('status');
  });
});

describe('adding shelves and boxes', () => {
  it('shows a failure to add a shelf in the page and keeps what was typed', async () => {
    locationsService.createShelf.mockRejectedValue({ response: { status: 409, data: { error: 'Request conflicts with existing data' } } });
    const wrapper = await mountView();
    await wrapper.get('input[placeholder^="Shelf Code"]').setValue('S01');
    await wrapper.get('input[placeholder="Location/Description"]').setValue('Dup');
    await wrapper.get('button.btn-primary').trigger('click');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Request conflicts with existing data']);
    expect(wrapper.get('input[placeholder^="Shelf Code"]').element.value).toBe('S01');
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('shows a failure to add a box in the page', async () => {
    locationsService.createBox.mockRejectedValue(new Error('Network Error'));
    const wrapper = await mountView();
    await wrapper.get('select').setValue('s1');
    await wrapper.findAll('button.btn-primary')[1].trigger('click');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Network Error']);
  });

  it('adds a shelf and clears the form on success', async () => {
    const wrapper = await mountView();
    await wrapper.get('input[placeholder^="Shelf Code"]').setValue('S03');
    await wrapper.get('input[placeholder="Location/Description"]').setValue('Garage');
    await wrapper.get('button.btn-primary').trigger('click');
    await flushPromises();
    expect(locationsService.createShelf).toHaveBeenCalledWith('S03', 'Garage', '');
    expect(wrapper.get('input[placeholder^="Shelf Code"]').element.value).toBe('');
    expect(toastTexts(wrapper)).toEqual([]);
  });
});
