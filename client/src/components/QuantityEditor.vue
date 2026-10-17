<template>
  <form v-if="editing" class="quantity-editor" @submit.prevent="save">
    <div class="quantity-controls">
      <input
        ref="input"
        v-model="draft"
        type="number"
        min="0"
        step="1"
        max="2147483647"
        required
        :disabled="saving"
        :aria-label="`Quantity for ${label}`"
        @keydown.esc.prevent="cancel"
      />
      <button type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
      <button type="button" :disabled="saving" @click="cancel">Cancel</button>
    </div>
    <p v-if="error" class="quantity-error" role="alert">{{ error }}</p>
    <small v-if="error">Current quantity: {{ item.quantity }}</small>
  </form>
  <button
    v-else
    type="button"
    class="quantity-button"
    :aria-label="`Edit quantity for ${label}, current quantity ${item.quantity}`"
    title="Click to edit quantity"
    @click="start"
  >{{ item.quantity }}</button>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import { itemsService } from '../services/api.js';

const props = defineProps({
  item: { type: Object, required: true }
});
const emit = defineEmits(['updated']);

const editing = ref(false);
const saving = ref(false);
const draft = ref('');
const expectedQuantity = ref(0);
const error = ref('');
const input = ref(null);
const label = computed(() => props.item.display_name || props.item.name || props.item.item_code || props.item.size || 'item');

const start = async () => {
  draft.value = String(props.item.quantity);
  expectedQuantity.value = props.item.quantity;
  error.value = '';
  editing.value = true;
  await nextTick();
  input.value.focus();
  input.value.select();
};

const cancel = () => {
  if (saving.value) return;
  editing.value = false;
  error.value = '';
};

const save = async () => {
  if (saving.value) return;
  const quantity = Number(draft.value);
  if (String(draft.value).trim() === '' || !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) {
    error.value = 'Enter a whole-number quantity between 0 and 2147483647.';
    return;
  }
  if (quantity === expectedQuantity.value) {
    cancel();
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const response = await itemsService.updateQuantity(props.item.id, props.item.source_type, quantity, expectedQuantity.value);
    emit('updated', response.data.quantity);
    editing.value = false;
  } catch (failure) {
    console.error('Error updating quantity:', failure);
    error.value = failure.response?.data?.error || 'Could not save quantity. Your change has not been saved; try again.';
    if (failure.response?.status === 409) {
      const currentQuantity = failure.response.data.quantity;
      expectedQuantity.value = currentQuantity;
      emit('updated', currentQuantity);
    }
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.quantity-button {
  background: transparent;
  color: #27ae60;
  border: 1px dashed #27ae60;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font: inherit;
  cursor: pointer;
}
.quantity-button:hover, .quantity-button:focus-visible {
  background: #eafaf1;
}
.quantity-controls {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}
.quantity-controls input {
  width: 6rem;
  padding: 0.35rem;
}
.quantity-controls button {
  padding: 0.35rem;
  cursor: pointer;
}
.quantity-controls :disabled {
  cursor: wait;
  opacity: 0.65;
}
.quantity-error {
  color: #c0392b;
  font-size: 0.85rem;
  max-width: 18rem;
  margin: 0.4rem 0;
}
</style>
