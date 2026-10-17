import { reactive } from 'vue';

const MAX_TOASTS = 5;
const DURATIONS = { error: 10000, info: 6000 };

const state = reactive({ toasts: [], dialog: null });
const timers = new Map();
let nextId = 1;

function dismiss(id) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  const index = state.toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) state.toasts.splice(index, 1);
}

function schedule(id, type) {
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => dismiss(id), DURATIONS[type]));
}

function notify(type, message) {
  const text = String(message);
  // The same message shown again restarts its timer instead of stacking up
  const existing = state.toasts.find((toast) => toast.type === type && toast.message === text);
  if (existing) {
    schedule(existing.id, type);
    return existing.id;
  }
  const toast = { id: nextId++, type, message: text };
  state.toasts.push(toast);
  while (state.toasts.length > MAX_TOASTS) dismiss(state.toasts[0].id);
  schedule(toast.id, type);
  return toast.id;
}

export const notifyError = (message) => notify('error', message);
export const notifyInfo = (message) => notify('info', message);

// Resolves true when confirmed, false when cancelled. Only one dialog is open at a time;
// asking again counts the earlier, unanswered one as cancelled.
export function confirmAction({ title, message = '', confirmLabel = 'Delete', cancelLabel = 'Cancel', danger = true }) {
  state.dialog?.resolve(false);
  return new Promise((resolve) => {
    state.dialog = { title, message, confirmLabel, cancelLabel, danger, resolve };
  });
}

export function answerDialog(confirmed) {
  const dialog = state.dialog;
  if (!dialog) return;
  state.dialog = null;
  dialog.resolve(confirmed);
}

// Prefers the server's message (e.g. "Request conflicts with existing data") over Axios' generic one
export function errorMessage(error, fallback) {
  const serverMessage = error?.response?.data?.error;
  if (serverMessage) return serverMessage;
  if (error?.response) return fallback;
  if (error?.request) return 'Could not reach the server. Check your connection and try again.';
  return error?.message || fallback;
}

export function useNotifications() {
  return { state, dismiss, answerDialog };
}

export function resetNotifications() {
  state.dialog?.resolve(false);
  state.dialog = null;
  for (const id of [...timers.keys()]) clearTimeout(timers.get(id));
  timers.clear();
  state.toasts.splice(0);
}
