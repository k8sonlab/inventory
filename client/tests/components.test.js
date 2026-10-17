import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import ModalShell from '../src/components/ModalShell.vue';
import NotesModal from '../src/components/NotesModal.vue';
import { useEnumOptions } from '../src/composables/useEnumOptions.js';
import { enumsService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  enumsService: { getValues: vi.fn() }
}));

enableAutoUnmount(afterEach);

describe('ModalShell', () => {
  it('is a labelled modal dialog with a title, content and a close button', async () => {
    const wrapper = mount(ModalShell, { props: { title: 'Edit Item' }, slots: { default: '<p class="body">hello</p>' } });
    const box = wrapper.get('.modal-box');
    expect(box.attributes('role')).toBe('dialog');
    expect(box.attributes('aria-modal')).toBe('true');
    expect(box.attributes('aria-label')).toBe('Edit Item');
    expect(wrapper.get('h2').text()).toBe('Edit Item');
    expect(wrapper.get('.body').text()).toBe('hello');
    expect(wrapper.get('.close-btn').attributes('aria-label')).toBe('Close');
    await wrapper.get('.close-btn').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});

describe('NotesModal', () => {
  it('shows the notes with their line breaks and closes from either button', async () => {
    const wrapper = mount(NotesModal, { props: { notes: 'one\ntwo' } });
    expect(wrapper.get('.notes-text').text()).toBe('one\ntwo');
    await wrapper.get('.close-btn').trigger('click');
    await wrapper.get('.modal-actions .btn-secondary').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(2);
  });

  it('renders notes as text, not HTML', () => {
    const wrapper = mount(NotesModal, { props: { notes: '<img src=x onerror=alert(1)>' } });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.get('.notes-text').text()).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('useEnumOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    enumsService.getValues.mockImplementation(async (type) => ({ data: [`${type}-1`] }));
  });

  it('loads each list once and keeps it', async () => {
    const { options, load } = useEnumOptions();
    await load(['a', 'b']);
    await load(['b', 'c']);
    expect(enumsService.getValues.mock.calls.map(([type]) => type)).toEqual(['a', 'b', 'c']);
    expect(options.value).toEqual({ a: ['a-1'], b: ['b-1'], c: ['c-1'] });
  });

  it('asks for the lists at the same time, not one after another', async () => {
    let started = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    enumsService.getValues.mockImplementation(async () => { started++; await gate; return { data: [] }; });
    const { load } = useEnumOptions();
    const loading = load(['a', 'b', 'c']);
    await Promise.resolve();
    expect(started).toBe(3);
    release();
    await loading;
  });

  it('keeps the lists that did load when one fails, and tries the failed one again next time', async () => {
    enumsService.getValues.mockImplementation(async (type) => {
      if (type === 'bad') throw new Error('boom');
      return { data: [type] };
    });
    const { options, load } = useEnumOptions();
    await load(['good', 'bad']);
    expect(options.value).toEqual({ good: ['good'] });
    enumsService.getValues.mockResolvedValue({ data: ['recovered'] });
    await load(['bad']);
    expect(options.value.bad).toEqual(['recovered']);
  });

  it('treats a missing list as empty', async () => {
    enumsService.getValues.mockResolvedValue({});
    const { options, load } = useEnumOptions();
    await load(['x']);
    expect(options.value.x).toEqual([]);
  });
});
