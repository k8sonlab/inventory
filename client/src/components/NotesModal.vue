<template>
  <ModalShell title="📝 Notes" @close="emit('close')">
    <div class="modal-content">
      <p class="notes-text">{{ notes }}</p>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" @click="emit('close')">Close</button>
    </div>
  </ModalShell>
</template>

<script setup>
import ModalShell from './ModalShell.vue';

defineProps({
  notes: { type: String, default: '' }
});
const emit = defineEmits(['close']);
</script>

<style scoped>
.modal-content {
  max-height: 60vh;
  overflow-y: auto;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
}

.notes-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  color: #333;
  font-size: 0.95rem;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.modal-actions button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #7f8c8d;
}
</style>
