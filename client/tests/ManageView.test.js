import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import ManageView from '../src/views/ManageView.vue';
import { categoriesService, enumsService } from '../src/services/api.js';
import { resetNotifications } from '../src/composables/useNotifications.js';
import { confirmButton, mountWithHost } from './helpers.js';

vi.mock('../src/services/api.js', () => ({
  categoriesService: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
  enumsService: { getValues: vi.fn(), createValue: vi.fn(), deleteValue: vi.fn() }
}));

beforeEach(() => {
  vi.clearAllMocks();
  resetNotifications();
  categoriesService.getAll.mockResolvedValue({ data: [] });
  enumsService.getValues.mockResolvedValue({ data: ['Acme Oil'] });
  enumsService.createValue.mockResolvedValue({ data: {} });
  enumsService.deleteValue.mockResolvedValue({ data: {} });
});

describe('ManageView', () => {
  it('no longer has a Parameter Options section', async () => {
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    expect(wrapper.text()).not.toContain('Parameter Options');
  });

  it('manages Oil/Paste company and type options', async () => {
    const wrapper = mountWithHost(ManageView);
    await flushPromises();
    await wrapper.findAll('.family-bar button').find((b) => b.text().includes('Oil/Paste')).trigger('click');
    const card = wrapper.get('.manage-section--oil');
    expect(card.findAll('.choice').map((b) => b.text())).toEqual(['Company', 'Type']);
    await card.findAll('.choice')[0].trigger('click');
    await flushPromises();
    expect(enumsService.getValues).toHaveBeenCalledWith('oil_paste_company');
    expect(card.text()).toContain('Acme Oil');
    await card.get('input').setValue('Other Oil');
    await card.get('button.btn-primary').trigger('click');
    await flushPromises();
    expect(enumsService.createValue).toHaveBeenCalledWith('oil_paste_company', 'Other Oil');
    await card.get('button.btn-icon').trigger('click');
    await confirmButton(wrapper).trigger('click');
    await flushPromises();
    expect(enumsService.deleteValue).toHaveBeenCalledWith('oil_paste_company', 'Acme Oil');
  });
});
