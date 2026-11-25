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

const choices = (card) => card.findAll('.choice').map((button) => button.text());

async function open(wrapper, label) {
  await wrapper.findAll('.family-bar button').find((button) => button.text().includes(label)).trigger('click');
  await flushPromises();
  return wrapper.get('.manage-section');
}

async function pickField(card, label) {
  await card.findAll('.choice').find((button) => button.text() === label).trigger('click');
  await flushPromises();
}

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
  it('first offers the item families, then the chosen family\'s fields', async () => {
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    expect(wrapper.findAll('.family-bar button').map((b) => b.text())).toEqual([
      '📦 Other Items', '🏎️ RC Parts', '🔩 Screw', '⚙️ Nut', '⚪ Washers & Bearings', '🔋 Battery', '🛢️ Oil/Paste',
      '📂 Categories'
    ]);
    expect(wrapper.find('.manage-section').exists()).toBe(false);
    expect(choices(await open(wrapper, 'RC Parts'))).toEqual(['RC Company', 'RC Model']);
    expect(choices(await open(wrapper, 'Screw'))).toEqual(['Size', 'Head Type', 'Drive Type', 'Thread Type', 'Color', 'Material']);
    expect(choices(await open(wrapper, 'Other Items'))).toEqual(['Item Type']);
    expect(wrapper.findAll('.manage-section')).toHaveLength(1);
  });

  it('loads values only once a field is picked', async () => {
    enumsService.getValues.mockImplementation(async (type) => ({ data: [`${type} value`] }));
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const screw = await open(wrapper, 'Screw');
    expect(screw.find('.manage-list').exists()).toBe(false);
    await pickField(screw, 'Color');
    expect(screw.text()).toContain('screw_color value');
    expect(enumsService.getValues).toHaveBeenCalledTimes(1);
  });

  it('adds a trimmed value to the selected field and refreshes the list', async () => {
    enumsService.getValues.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: ['M5'] });
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const nut = await open(wrapper, 'Nut');
    await pickField(nut, 'Size');
    const add = nut.get('button.btn-primary');
    expect(add.attributes('disabled')).toBeDefined();
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
    const nut = await open(wrapper, 'Nut');
    await pickField(nut, 'Size');
    await nut.get('input').setValue('   ');
    expect(nut.get('button.btn-primary').attributes('disabled')).toBeDefined();
    expect(enumsService.createValue).not.toHaveBeenCalled();
  });

  it('asks in the page before deleting a value, and only deletes once confirmed', async () => {
    enumsService.getValues.mockResolvedValue({ data: ['Black'] });
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    const screw = await open(wrapper, 'Screw');
    await pickField(screw, 'Color');
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
    const nut = await open(wrapper, 'Nut');
    await pickField(nut, 'Size');
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
    await wrapper.findAll('.choice')[0].trigger('click');
    await wrapper.findAll('.choice')[1].trigger('click');
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
    const categories = await open(wrapper, 'Categories');
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
    await (await open(wrapper, 'Categories')).get('button.btn-icon').trigger('click');
    await cancelButton(wrapper).trigger('click');
    await flushPromises();
    expect(categoriesService.delete).not.toHaveBeenCalled();
  });

  it('shows an empty state, and explains a failed delete', async () => {
    categoriesService.getAll.mockResolvedValueOnce({ data: [] });
    const empty = mountWithHost(ManageView);
    await flushPromises();
    expect((await open(empty, 'Categories')).text()).toContain('No categories');
    empty.unmount();

    categoriesService.delete.mockRejectedValue(new Error('Network Error'));
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    await (await open(wrapper, 'Categories')).get('button.btn-icon').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(toastTexts(wrapper)).toEqual(['Network Error']);
  });
});
