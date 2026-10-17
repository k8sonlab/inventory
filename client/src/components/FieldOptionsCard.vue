<template>
  <div class="manage-section" :class="`manage-section--${variant}`">
    <h2>{{ title }}</h2>
    <div class="manage-form">
      <select v-model="selectedField" :aria-label="`${subject} field`">
        <option value="">-- Select {{ subject }} Field --</option>
        <option v-for="field in fields" :key="field.value" :value="field.value">{{ field.label }}</option>
      </select>
      <input v-model="newValue" placeholder="New value" :aria-label="`New ${subject} value`" />
      <button type="button" class="btn-primary" :disabled="!selectedField || !newValue.trim()" @click="addValue">Add Value</button>
    </div>
    <div v-if="selectedField" class="manage-list">
      <div v-if="values.length === 0" class="empty-state">No values for this field</div>
      <div v-for="value in values" :key="value" class="manage-item">
        <span>{{ value }}</span>
        <button type="button" class="btn-icon" title="Delete" :aria-label="`Delete ${value}`" @click="removeValue(value)">🗑️</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { enumsService } from '../services/api.js';
import { confirmAction, errorMessage, notifyError } from '../composables/useNotifications.js';

defineProps({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  variant: { type: String, required: true },
  fields: { type: Array, required: true }
});

const selectedField = ref('');
const newValue = ref('');
const values = ref([]);
let loadId = 0;

const loadValues = async () => {
  const request = ++loadId;
  if (!selectedField.value) return;
  try {
    const response = await enumsService.getValues(selectedField.value);
    if (request === loadId) values.value = response.data || [];
  } catch (error) {
    console.error(`Error loading ${selectedField.value} values:`, error);
  }
};

const addValue = async () => {
  const value = newValue.value.trim();
  if (!selectedField.value || !value) return;
  try {
    await enumsService.createValue(selectedField.value, value);
    newValue.value = '';
    loadValues();
  } catch (error) {
    console.error(`Error adding ${selectedField.value} value:`, error);
    notifyError(errorMessage(error, 'Could not add the value.'));
  }
};

const removeValue = async (value) => {
  const confirmed = await confirmAction({
    title: `Delete "${value}"?`,
    message: 'It will no longer be offered in the item forms. Existing items keep their value.'
  });
  if (!confirmed) return;
  try {
    await enumsService.deleteValue(selectedField.value, value);
    loadValues();
  } catch (error) {
    console.error(`Error deleting ${selectedField.value} value:`, error);
    notifyError(errorMessage(error, 'Could not delete the value.'));
  }
};

watch(selectedField, () => {
  values.value = [];
  loadValues();
});
</script>
