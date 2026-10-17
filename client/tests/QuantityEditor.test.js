import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import QuantityEditor from '../src/components/QuantityEditor.vue';
import { itemsService } from '../src/services/api.js';

vi.mock('../src/services/api.js', () => ({
  itemsService: { updateQuantity: vi.fn() }
}));

const item = () => ({ id: 'abc', source_type: 'screw', display_name: 'M3 screw', quantity: 10 });

function mountEditor(props = {}) {
  return mount(QuantityEditor, { props: { item: item(), ...props }, attachTo: document.body });
}

async function startEditing(wrapper) {
  await wrapper.get('button.quantity-button').trigger('click');
  return wrapper.get('input');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('QuantityEditor', () => {
  it('shows the quantity and opens an input with the current value', async () => {
    const wrapper = mountEditor();
    expect(wrapper.get('button.quantity-button').text()).toBe('10');
    const input = await startEditing(wrapper);
    expect(input.element.value).toBe('10');
  });

  it('saves only the quantity with the expected quantity and reports the new value', async () => {
    itemsService.updateQuantity.mockResolvedValue({ data: { quantity: 25 } });
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue('25');
    await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.emitted('updated')).toEqual([[25]]));
    expect(itemsService.updateQuantity).toHaveBeenCalledTimes(1);
    expect(itemsService.updateQuantity).toHaveBeenCalledWith('abc', 'screw', 25, 10);
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it('accepts zero', async () => {
    itemsService.updateQuantity.mockResolvedValue({ data: { quantity: 0 } });
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue('0');
    await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.emitted('updated')).toEqual([[0]]));
    expect(itemsService.updateQuantity).toHaveBeenCalledWith('abc', 'screw', 0, 10);
  });

  it('does not call the API when the quantity is unchanged', async () => {
    const wrapper = mountEditor();
    await startEditing(wrapper);
    await wrapper.get('form').trigger('submit');
    expect(itemsService.updateQuantity).not.toHaveBeenCalled();
    expect(wrapper.find('form').exists()).toBe(false);
  });

  it.each(['', '-1', '1.5', '2147483648'])('rejects invalid quantity %j without calling the API', async (value) => {
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue(value);
    await wrapper.get('form').trigger('submit');
    expect(itemsService.updateQuantity).not.toHaveBeenCalled();
    expect(wrapper.get('[role="alert"]').text()).toMatch(/whole-number quantity/);
  });

  it('cancels with the Escape key or Cancel button', async () => {
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue('99');
    await input.trigger('keydown.esc');
    expect(wrapper.find('form').exists()).toBe(false);
    await startEditing(wrapper);
    await wrapper.findAll('button').find((button) => button.text() === 'Cancel').trigger('click');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(itemsService.updateQuantity).not.toHaveBeenCalled();
  });

  it('keeps the draft and shows an error when saving fails', async () => {
    itemsService.updateQuantity.mockRejectedValue({ response: { status: 500, data: { error: 'Internal server error' } } });
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue('12');
    await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toBe('Internal server error'));
    expect(wrapper.get('input').element.value).toBe('12');
    expect(wrapper.emitted('updated')).toBeUndefined();
  });

  it('uses a clear message when the server cannot be reached', async () => {
    itemsService.updateQuantity.mockRejectedValue(new Error('Network Error'));
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue('12');
    await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toMatch(/has not been saved/));
  });

  it('surfaces a conflict, adopts the current quantity and retries against it', async () => {
    itemsService.updateQuantity
      .mockRejectedValueOnce({ response: { status: 409, data: { error: 'Quantity changed since you started editing.', quantity: 7 } } })
      .mockResolvedValueOnce({ data: { quantity: 8 } });
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue('12');
    await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.emitted('updated')).toEqual([[7]]));
    expect(wrapper.get('[role="alert"]').text()).toMatch(/changed/);
    await wrapper.get('input').setValue('8');
    await wrapper.get('form').trigger('submit');
    await vi.waitFor(() => expect(wrapper.emitted('updated')).toEqual([[7], [8]]));
    expect(itemsService.updateQuantity).toHaveBeenLastCalledWith('abc', 'screw', 8, 7);
  });

  it('prevents double submission while saving', async () => {
    let resolve;
    itemsService.updateQuantity.mockReturnValue(new Promise((done) => { resolve = done; }));
    const wrapper = mountEditor();
    const input = await startEditing(wrapper);
    await input.setValue('20');
    await wrapper.get('form').trigger('submit');
    await wrapper.get('form').trigger('submit');
    expect(itemsService.updateQuantity).toHaveBeenCalledTimes(1);
    expect(wrapper.get('input').attributes('disabled')).toBeDefined();
    resolve({ data: { quantity: 20 } });
    await vi.waitFor(() => expect(wrapper.find('form').exists()).toBe(false));
  });
});
