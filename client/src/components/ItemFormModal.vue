<template>
  <ModalShell :title="editing ? 'Edit Item' : 'Add New Item'" wide @close="emit('close')">
    <form class="modal-form" @submit.prevent="save">
      <div class="form-group">
        <label>Item Type *</label>
        <select v-model="selectedType" required :disabled="editing">
          <option value="">Select Item Type</option>
          <option v-for="option in FORM_TYPES" :key="option.key" :value="option.key">{{ option.label }}</option>
        </select>
      </div>

      <div v-if="type" class="type-fields" :class="type.cssClass">
        <div v-for="field in type.fields" :key="field.key" class="form-group" :class="field.groupClass">
          <label v-if="field.kind === 'checkbox'" :class="field.labelClass">
            <input v-model="valuesFor(field)[field.key]" type="checkbox" />
            {{ field.label }}
          </label>
          <template v-else>
            <label>{{ field.label }}{{ field.required ? ' *' : '' }}</label>
            <select v-if="field.kind === 'select'" v-model="valuesFor(field)[field.key]">
              <option value="">-- Select {{ field.label }} --</option>
              <option v-for="value in enumOptions[field.enumType] || []" :key="value" :value="value">{{ value }}</option>
            </select>
            <select v-else-if="field.kind === 'choice'" v-model="valuesFor(field)[field.key]" :required="field.required">
              <option v-for="value in field.options" :key="value" :value="value">{{ value }}</option>
            </select>
            <input
              v-else-if="field.kind === 'number'"
              v-model.number="valuesFor(field)[field.key]"
              type="number"
              :placeholder="field.placeholder"
              :step="field.step"
            />
            <input v-else-if="field.kind === 'date'" v-model="valuesFor(field)[field.key]" type="date" />
            <input
              v-else
              v-model="valuesFor(field)[field.key]"
              type="text"
              :placeholder="field.placeholder"
              :required="field.required"
            />
          </template>
        </div>
      </div>

      <div class="form-group">
        <label>Storage / Box Location *</label>
        <select v-model="common.box_id" required>
          <option value="">-- Select Storage Box --</option>
          <option v-for="box in boxes" :key="box.id" :value="box.id">
            {{ box.storage_id }} - {{ box.box_name }} ({{ box.shelf_code }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label>Quantity</label>
        <input v-model.number="common.quantity" type="number" min="0" max="2147483647" step="1" placeholder="Quantity" />
      </div>

      <div class="form-group notes-group">
        <label>Notes</label>
        <textarea v-model="common.notes" placeholder="Additional notes"></textarea>
      </div>

      <div class="modal-actions">
        <button type="submit" class="btn-primary" :disabled="saving">Save</button>
        <button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
      </div>
    </form>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import ModalShell from './ModalShell.vue';
import { itemsService } from '../services/api.js';
import { useEnumOptions } from '../composables/useEnumOptions.js';
import { errorMessage, notifyError } from '../composables/useNotifications.js';
import {
  FORM_TYPES, blankCommon, buildPayload, commonFromItem, enumTypesOf, formTypeByKey, formTypeForItem
} from '../config/itemForms.js';

const props = defineProps({
  // The item being edited, or null to add a new one
  item: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  boxes: { type: Array, default: () => [] },
  categoryName: { type: String, default: '' }
});
const emit = defineEmits(['saved', 'close']);

const editing = computed(() => Boolean(props.item));
const initialType = props.item
  ? formTypeForItem(props.item)
  : FORM_TYPES.find((option) => option.belongsTo(props.categoryName));

const typeKey = ref(initialType?.key ?? '');
const common = ref(props.item ? commonFromItem(props.item) : blankCommon());
const fields = ref(initialType ? (props.item ? initialType.fromItem(props.item) : initialType.blank()) : {});
const saving = ref(false);

const type = computed(() => formTypeByKey(typeKey.value));

// Choosing another kind of item starts its own fields from scratch; name, location, quantity and notes carry over
const selectedType = computed({
  get: () => typeKey.value,
  set: (key) => {
    typeKey.value = key;
    fields.value = formTypeByKey(key)?.blank() ?? {};
  }
});

const valuesFor = (field) => (field.target === 'common' ? common.value : fields.value);

const { options: enumOptions, load: loadEnumOptions } = useEnumOptions();
watch(type, (current) => {
  if (current) loadEnumOptions(enumTypesOf(current));
}, { immediate: true });

const save = async () => {
  if (saving.value || !type.value) return;
  saving.value = true;
  try {
    const payload = buildPayload(type.value, { common: common.value, fields: fields.value }, props.categories);
    if (editing.value) {
      await itemsService.update(props.item.id, payload);
    } else {
      await itemsService.create(payload);
    }
    emit('saved');
  } catch (error) {
    console.error('Error saving item:', error);
    notifyError(errorMessage(error, 'Could not save the item.'));
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.modal-form {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem 1.25rem;
  padding: 1.25rem;
}

.type-fields {
  display: contents;
}

.form-group {
  min-width: 0;
}

.notes-group,
.modal-actions {
  grid-column: 1 / -1;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-group {
  align-self: center;
}

.checkbox-group .checkbox-label input[type="checkbox"] {
  width: auto;
  padding: 0;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 1rem;
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

.btn-primary {
  background: #27ae60;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  cursor: pointer;
}

.btn-primary:hover {
  background: #229954;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: wait;
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

@media (max-width: 900px) {
  .modal-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .modal-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
