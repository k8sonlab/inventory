import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import NotificationHost from '../src/components/NotificationHost.vue';
import {
  answerDialog, confirmAction, errorMessage, notifyError, notifyInfo, resetNotifications, useNotifications
} from '../src/composables/useNotifications.js';

enableAutoUnmount(afterEach);

const mountHost = () => mount(NotificationHost, { attachTo: document.body });
const toasts = (wrapper) => wrapper.findAll('.toast');

beforeEach(() => {
  vi.useFakeTimers();
  resetNotifications();
});

afterEach(() => {
  resetNotifications();
  vi.useRealTimers();
});

describe('toasts', () => {
  it('shows errors as alerts and info as status messages', async () => {
    const wrapper = mountHost();
    notifyError('Something broke');
    notifyInfo('FYI');
    await flushPromises();
    const [error, info] = toasts(wrapper);
    expect(error.text()).toContain('Something broke');
    expect(error.attributes('role')).toBe('alert');
    expect(error.classes()).toContain('toast--error');
    expect(info.text()).toContain('FYI');
    expect(info.attributes('role')).toBe('status');
    expect(wrapper.get('.toast-region').attributes('aria-live')).toBe('polite');
  });

  it('disappears on its own: info after 6 seconds, errors after 10', async () => {
    const wrapper = mountHost();
    notifyInfo('FYI');
    notifyError('Broke');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(5999);
    expect(toasts(wrapper)).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(toasts(wrapper).map((toast) => toast.text())).toEqual([expect.stringContaining('Broke')]);
    await vi.advanceTimersByTimeAsync(4000);
    expect(toasts(wrapper)).toHaveLength(0);
  });

  it('can be dismissed with its close button', async () => {
    const wrapper = mountHost();
    notifyError('Broke');
    await flushPromises();
    expect(wrapper.get('.toast-close').attributes('aria-label')).toBe('Dismiss message');
    await wrapper.get('.toast-close').trigger('click');
    expect(toasts(wrapper)).toHaveLength(0);
  });

  it('shows a repeated message once and restarts its timer', async () => {
    const wrapper = mountHost();
    notifyError('Same');
    await vi.advanceTimersByTimeAsync(8000);
    notifyError('Same');
    await flushPromises();
    expect(toasts(wrapper)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(8000);
    expect(toasts(wrapper)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(toasts(wrapper)).toHaveLength(0);
  });

  it('keeps at most five toasts, dropping the oldest', async () => {
    const wrapper = mountHost();
    for (let index = 1; index <= 7; index++) notifyError(`Problem ${index}`);
    await flushPromises();
    expect(toasts(wrapper).map((toast) => toast.find('.toast-message').text())).toEqual([
      'Problem 3', 'Problem 4', 'Problem 5', 'Problem 6', 'Problem 7'
    ]);
  });

  it('renders messages as text, not HTML', async () => {
    const wrapper = mountHost();
    notifyError('<img src=x onerror=alert(1)>');
    await flushPromises();
    expect(wrapper.find('.toast img').exists()).toBe(false);
    expect(wrapper.get('.toast-message').text()).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('confirmation dialog', () => {
  it('is an accessible modal that names the action and the thing affected', async () => {
    const wrapper = mountHost();
    confirmAction({ title: 'Delete "M3 screw"?', message: 'This cannot be undone.' });
    await flushPromises();
    const box = wrapper.get('.confirm-box');
    expect(box.attributes('role')).toBe('alertdialog');
    expect(box.attributes('aria-modal')).toBe('true');
    expect(box.attributes('aria-labelledby')).toBe('confirm-title');
    expect(box.attributes('aria-describedby')).toBe('confirm-message');
    expect(wrapper.get('#confirm-title').text()).toBe('Delete "M3 screw"?');
    expect(wrapper.get('#confirm-message').text()).toBe('This cannot be undone.');
    expect(wrapper.get('.confirm-danger').text()).toBe('Delete');
  });

  it('resolves true on confirm and false on cancel', async () => {
    const wrapper = mountHost();
    const yes = confirmAction({ title: 'Sure?' });
    await flushPromises();
    await wrapper.get('.confirm-danger').trigger('click');
    await expect(yes).resolves.toBe(true);
    expect(wrapper.find('.confirm-box').exists()).toBe(false);

    const no = confirmAction({ title: 'Sure?' });
    await flushPromises();
    await wrapper.get('.confirm-cancel').trigger('click');
    await expect(no).resolves.toBe(false);
  });

  it('cancels with Escape or a click on the backdrop, but not a click inside the box', async () => {
    const wrapper = mountHost();
    const byEscape = confirmAction({ title: 'Sure?' });
    await flushPromises();
    await wrapper.get('.confirm-cancel').trigger('keydown', { key: 'Escape' });
    await expect(byEscape).resolves.toBe(false);

    const byBackdrop = confirmAction({ title: 'Sure?' });
    await flushPromises();
    await wrapper.get('.confirm-box').trigger('click');
    expect(wrapper.find('.confirm-box').exists()).toBe(true);
    await wrapper.get('.confirm-overlay').trigger('click');
    await expect(byBackdrop).resolves.toBe(false);
    expect(wrapper.find('.confirm-box').exists()).toBe(false);
  });

  it('puts focus on Cancel (the safe choice) and gives it back to the trigger afterwards', async () => {
    const wrapper = mountHost();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const answer = confirmAction({ title: 'Sure?' });
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.get('.confirm-cancel').element);
    await wrapper.get('.confirm-cancel').trigger('click');
    await answer;
    await flushPromises();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const wrapper = mountHost();
    confirmAction({ title: 'Sure?' });
    await flushPromises();
    const cancel = wrapper.get('.confirm-cancel').element;
    const confirm = wrapper.get('.confirm-danger').element;
    confirm.focus();
    await wrapper.get('.confirm-danger').trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    await wrapper.get('.confirm-cancel').trigger('keydown', { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('supports custom labels and a non-destructive style', async () => {
    const wrapper = mountHost();
    confirmAction({ title: 'Reset?', confirmLabel: 'Reset', cancelLabel: 'Keep', danger: false });
    await flushPromises();
    expect(wrapper.get('.confirm-primary').text()).toBe('Reset');
    expect(wrapper.find('.confirm-danger').exists()).toBe(false);
    expect(wrapper.get('.confirm-cancel').text()).toBe('Keep');
  });

  it('only ever shows one dialog: asking again cancels the earlier one', async () => {
    const wrapper = mountHost();
    const first = confirmAction({ title: 'First?' });
    const second = confirmAction({ title: 'Second?' });
    await flushPromises();
    await expect(first).resolves.toBe(false);
    expect(wrapper.findAll('.confirm-box')).toHaveLength(1);
    expect(wrapper.get('#confirm-title').text()).toBe('Second?');
    await wrapper.get('.confirm-danger').trigger('click');
    await expect(second).resolves.toBe(true);
  });

  it('ignores an answer when no dialog is open', () => {
    expect(() => answerDialog(true)).not.toThrow();
    expect(useNotifications().state.dialog).toBeNull();
  });
});

describe('errorMessage', () => {
  it('prefers the message the server sent', () => {
    expect(errorMessage({ response: { status: 409, data: { error: 'Request conflicts with existing data' } }, message: 'Request failed with status code 409' }, 'Fallback'))
      .toBe('Request conflicts with existing data');
  });

  it('uses the fallback when the server gave no message, instead of Axios\' generic text', () => {
    expect(errorMessage({ response: { status: 500, data: {} }, message: 'Request failed with status code 500' }, 'Could not save the item.'))
      .toBe('Could not save the item.');
  });

  it('explains when the server cannot be reached', () => {
    expect(errorMessage({ request: {}, message: 'Network Error' }, 'Fallback'))
      .toBe('Could not reach the server. Check your connection and try again.');
  });

  it('copes with anything thrown', () => {
    expect(errorMessage(new Error('boom'), 'Fallback')).toBe('boom');
    expect(errorMessage(undefined, 'Fallback')).toBe('Fallback');
    expect(errorMessage('weird', 'Fallback')).toBe('Fallback');
  });
});
