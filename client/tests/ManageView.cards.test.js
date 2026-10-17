import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import ManageView from '../src/views/ManageView.vue';
import FieldOptionsCard from '../src/components/FieldOptionsCard.vue';
import { categoriesService, enumsService } from '../src/services/api.js';
import { resetNotifications } from '../src/composables/useNotifications.js';
import { cancelButton, confirmButton, confirmDialog, mountWithHost, toastTexts } from './helpers.js';

vi.mock('../src/services/api.js', () => ({
  categoriesService: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
  enumsService: { getValues: vi.fn(), createValue: vi.fn(), deleteValue: vi.fn() }
}));

enableAutoUnmount(afterEach);

const options = (card) => card.findAll('select option').map((option) => [option.attributes('value'), option.text()]);

beforeEach(() => {
  vi.clearAllMocks();
  resetNotifications();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.spyOn(window, 'confirm').mockImplementation(() => true);
  categoriesService.getAll.mockResolvedValue({ data: [{ id: 'c1', name: 'Screws' }] });
  categoriesService.create.mockResolvedValue({ data: {} });
  categoriesService.delete.mockResolvedValue({ data: {} });
  enumsService.getValues.mockResolvedValue({ data: [] });
  enumsService.createValue.mockResolvedValue({ data: {} });
  enumsService.deleteValue.mockResolvedValue({ data: {} });
});

describe('ManageView field cards', () => {
  it('renders one card per item family, in order, with the right field options', async () => {
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const cards = wrapper.findAll('.manage-section');
    expect(cards.map((card) => card.get('h2').text())).toEqual([
      '🏎️ RC Parts Fields', '🔩 Screw Fields', '⚙️ Nut Fields', '⚪ Washers & Bearings Fields',
      '🔋 Battery Fields', '🛢️ Oil/Paste Fields', '📂 Categories'
    ]);
    expect(options(cards[0])).toEqual([['', '-- Select RC Field --'], ['rc_company', 'RC Company'], ['rc_model', 'RC Model']]);
    expect(options(cards[1]).map(([value]) => value)).toEqual([
      '', 'screw_size', 'screw_head_type', 'screw_drive_type', 'screw_thread_type', 'screw_color', 'screw_material'
    ]);
    expect(options(cards[2]).map(([value]) => value)).toEqual(['', 'nut_size', 'nut_type', 'nut_color']);
    expect(options(cards[3])).toEqual([
      ['', '-- Select Washer/Bearing Field --'], ['washer_bearing_subtype', 'Subtype'], ['washer_bearing_material', 'Material']
    ]);
    expect(options(cards[4]).map(([value]) => value)).toEqual(['', 'battery_size', 'battery_company', 'battery_model', 'battery_type']);
    expect(options(cards[5]).map(([value]) => value)).toEqual(['', 'oil_paste_company', 'oil_paste_type']);
    expect(cards.slice(0, 6).map((card) => card.classes().find((name) => name.startsWith('manage-section--')))).toEqual([
      'manage-section--rc', 'manage-section--screw', 'manage-section--nut',
      'manage-section--washer-bearing', 'manage-section--battery', 'manage-section--oil'
    ]);
  });

  it('keeps every card independent', async () => {
    enumsService.getValues.mockImplementation(async (type) => ({ data: [`${type} value`] }));
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const [rc, screw] = wrapper.findAll('.manage-section');
    await screw.get('select').setValue('screw_color');
    await flushPromises();
    expect(screw.text()).toContain('screw_color value');
    expect(rc.find('.manage-list').exists()).toBe(false);
    expect(enumsService.getValues).toHaveBeenCalledTimes(1);
  });

  it('adds a trimmed value to the selected field and refreshes the list', async () => {
    enumsService.getValues.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: ['M5'] });
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const nut = wrapper.findAll('.manage-section')[2];
    const add = nut.get('button.btn-primary');
    expect(add.attributes('disabled')).toBeDefined();
    await nut.get('select').setValue('nut_size');
    await nut.get('input').setValue('  M5  ');
    expect(add.attributes('disabled')).toBeUndefined();
    await add.trigger('click');
    await flushPromises();
    expect(enumsService.createValue).toHaveBeenCalledWith('nut_size', 'M5');
    expect(nut.get('input').element.value).toBe('');
    expect(nut.text()).toContain('M5');
  });

  it('does not add whitespace-only values', async () => {
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const nut = wrapper.findAll('.manage-section')[2];
    await nut.get('select').setValue('nut_size');
    await nut.get('input').setValue('   ');
    expect(nut.get('button.btn-primary').attributes('disabled')).toBeDefined();
    expect(enumsService.createValue).not.toHaveBeenCalled();
  });

  it('asks in the page before deleting a value, and only deletes once confirmed', async () => {
    enumsService.getValues.mockResolvedValue({ data: ['Black'] });
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const screw = wrapper.findAll('.manage-section')[1];
    await screw.get('select').setValue('screw_color');
    await flushPromises();
    await screw.get('button.btn-icon').trigger('click');
    expect(confirmDialog(wrapper).text()).toContain('Delete "Black"?');
    await cancelButton(wrapper).trigger('click');
    await flushPromises();
    expect(confirmDialog(wrapper).exists()).toBe(false);
    expect(enumsService.deleteValue).not.toHaveBeenCalled();
    await screw.get('button.btn-icon').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(enumsService.deleteValue).toHaveBeenCalledWith('screw_color', 'Black');
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('shows the server message in the page when adding fails, keeping the typed value', async () => {
    enumsService.createValue.mockRejectedValue({ response: { status: 409, data: { error: 'Request conflicts with existing data' } } });
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const nut = wrapper.findAll('.manage-section')[2];
    await nut.get('select').setValue('nut_size');
    await nut.get('input').setValue('M5');
    await nut.get('button.btn-primary').trigger('click');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Request conflicts with existing data']);
    expect(wrapper.get('.toast').attributes('role')).toBe('alert');
    expect(nut.get('input').element.value).toBe('M5');
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('ignores a slow response for a field the user has already left', async () => {
    let resolveSlow;
    enumsService.getValues
      .mockReturnValueOnce(new Promise((resolve) => { resolveSlow = resolve; }))
      .mockResolvedValueOnce({ data: ['fresh'] });
    const wrapper = mount(FieldOptionsCard, {
      props: { title: 'T', subject: 'Nut', variant: 'nut', fields: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }
    });
    await wrapper.get('select').setValue('a');
    await wrapper.get('select').setValue('b');
    await flushPromises();
    resolveSlow({ data: ['stale'] });
    await flushPromises();
    expect(wrapper.text()).toContain('fresh');
    expect(wrapper.text()).not.toContain('stale');
  });
});

describe('ManageView categories', () => {
  it('lists, adds and deletes categories after confirmation', async () => {
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const categories = wrapper.findAll('.manage-section')[6];
    expect(categories.text()).toContain('Screws');
    await categories.get('input').setValue('Tools');
    await categories.get('button.btn-primary').trigger('click');
    await flushPromises();
    expect(categoriesService.create).toHaveBeenCalledWith('Tools');
    expect(categories.get('input').element.value).toBe('');
    await categories.get('button.btn-icon').trigger('click');
    expect(confirmDialog(wrapper).text()).toContain('Delete category "Screws"?');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(categoriesService.delete).toHaveBeenCalledWith('c1');
  });

  it('does not delete a category when the dialog is cancelled', async () => {
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    await wrapper.findAll('.manage-section')[6].get('button.btn-icon').trigger('click');
    await cancelButton(wrapper).trigger('click');
    await flushPromises();
    expect(categoriesService.delete).not.toHaveBeenCalled();
  });

  it('shows an empty state, and explains a failed delete', async () => {
    categoriesService.getAll.mockResolvedValueOnce({ data: [] });
    const empty = mountWithHost(ManageView);
    await flushPromises();
    expect(empty.findAll('.manage-section')[6].text()).toContain('No categories');
    empty.unmount();

    categoriesService.delete.mockRejectedValue(new Error('Network Error'));
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    await wrapper.findAll('.manage-section')[6].get('button.btn-icon').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Network Error']);
  });
});
