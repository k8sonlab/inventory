<template>
  <div class="toast-region" aria-live="polite">
    <div
      v-for="toast in state.toasts"
      :key="toast.id"
      class="toast"
      :class="`toast--${toast.type}`"
      :role="toast.type === 'error' ? 'alert' : 'status'"
    >
      <span class="toast-message">{{ toast.message }}</span>
      <button type="button" class="toast-close" aria-label="Dismiss message" @click="dismiss(toast.id)">✕</button>
    </div>
  </div>

  <div v-if="state.dialog" class="confirm-overlay" @click.self="answerDialog(false)" @keydown="onKeydown">
    <div
      ref="box"
      class="confirm-box"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      :aria-describedby="state.dialog.message ? 'confirm-message' : undefined"
    >
      <h2 id="confirm-title">{{ state.dialog.title }}</h2>
      <p v-if="state.dialog.message" id="confirm-message">{{ state.dialog.message }}</p>
      <div class="confirm-actions">
        <button ref="cancelButton" type="button" class="confirm-cancel" @click="answerDialog(false)">{{ state.dialog.cancelLabel }}</button>
        <button type="button" :class="state.dialog.danger ? 'confirm-danger' : 'confirm-primary'" @click="answerDialog(true)">{{ state.dialog.confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue';
import { useNotifications } from '../composables/useNotifications.js';

const { state, dismiss, answerDialog } = useNotifications();
const box = ref(null);
const cancelButton = ref(null);
let previouslyFocused = null;

// Focus starts on the safe choice (Cancel) and returns to where the user was when the dialog closes
watch(() => state.dialog, async (now, before) => {
  if (now && !before) {
    previouslyFocused = document.activeElement;
    await nextTick();
    cancelButton.value?.focus();
  } else if (!now && before) {
    previouslyFocused?.focus?.();
    previouslyFocused = null;
  }
});

const onKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    answerDialog(false);
    return;
  }
  if (event.key !== 'Tab' || !box.value) return;
  const focusable = [...box.value.querySelectorAll('button:not([disabled])')];
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};
</script>

<style scoped>
.toast-region {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 11000;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: min(26rem, calc(100vw - 2rem));
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border-left: 5px solid;
  background: white;
  color: #2c3e50;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
  font-size: 0.95rem;
}

.toast--error {
  border-color: #c0392b;
  background: #fdecea;
}

.toast--info {
  border-color: #3498db;
  background: #eaf4fc;
}

.toast-message {
  flex: 1;
  overflow-wrap: anywhere;
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  padding: 0.1rem 0.25rem;
}

.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.5);
}

.confirm-box {
  width: min(26rem, 100%);
  padding: 1.5rem;
  border-radius: 8px;
  background: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.confirm-box h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.15rem;
  color: #2c3e50;
  overflow-wrap: anywhere;
}

.confirm-box p {
  margin: 0 0 1.25rem 0;
  color: #555;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.confirm-actions button {
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
}

.confirm-cancel {
  background: #ecf0f1;
  color: #2c3e50;
}

.confirm-danger {
  background: #e74c3c;
  color: white;
}

.confirm-primary {
  background: #3498db;
  color: white;
}

.confirm-actions button:focus-visible {
  outline: 3px solid #3498db;
  outline-offset: 2px;
}
</style>
