import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import NotificationHost from '../src/components/NotificationHost.vue';

// Mounts a view next to the notification host, as App.vue does, so toasts and confirmation dialogs are real
export function mountWithHost(component, props = {}) {
  const Wrapper = defineComponent({
    render: () => h('div', [h(component, props), h(NotificationHost)])
  });
  return mount(Wrapper, { attachTo: document.body });
}

export const confirmDialog = (wrapper) => wrapper.find('.confirm-box');
export const confirmButton = (wrapper) => wrapper.get('.confirm-box .confirm-danger, .confirm-box .confirm-primary');
export const cancelButton = (wrapper) => wrapper.get('.confirm-box .confirm-cancel');
export const toastTexts = (wrapper) => wrapper.findAll('.toast').map((toast) => toast.find('.toast-message').text());
