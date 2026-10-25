<template>
  <ModalShell title="Add Multiple Items" wide class="bulk-modal" @close="close">
    <form ref="form" class="bulk-form" @submit.prevent="saveAll">
      <fieldset :disabled="saving">
        <div class="bulk-settings">
          <label>
            Item Type *
            <select v-model="typeKey" aria-label="Item Type" required>
              <option value="">Select Item Type</option>
              <option v-for="option in FORM_TYPES" :key="option.key" :value="option.key">{{ option.label }}</option>
            </select>
          </label>
          <label>
            Shared Storage Box
            <select v-model="defaultBox" aria-label="Shared Storage Box">
              <option value="">-- Select Storage Box --</option>
              <option v-for="box in boxes" :key="box.id" :value="box.id">
                {{ box.storage_id }} - {{ box.box_name }} ({{ box.shelf_code }})
              </option>
            </select>
          </label>
        </div>

        <table v-if="type" class="bulk-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th v-for="field in type.fields" :key="field.key" scope="col">{{ field.label }}{{ field.required ? ' *' : '' }}</th>
              <th scope="col">Storage Box *</th>
              <th scope="col">Quantity</th>
              <th scope="col">Notes</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="row.id">
              <th scope="row">{{ index + 1 }}</th>
              <td v-for="field in type.fields" :key="field.key" :data-label="field.label">
                <select
                  v-if="field.kind === 'select' || field.kind === 'choice'"
                  v-model="valuesFor(row, field)[field.key]"
                  :aria-label="field.label"
                  :required="field.required"
                >
                  <option v-if="field.kind === 'select'" value="">--</option>
                  <option v-for="value in field.options || enumOptions[field.enumType] || []" :key="value" :value="value">{{ value }}</option>
                </select>
                <input
                  v-else-if="field.kind === 'checkbox'"
                  v-model="valuesFor(row, field)[field.key]"
                  type="checkbox"
                  :aria-label="field.label"
                />
                <input
                  v-else-if="field.kind === 'number'"
                  v-model.number="valuesFor(row, field)[field.key]"
                  type="number"
                  :step="field.step"
                  :aria-label="field.label"
                  :required="field.required"
                />
                <input
                  v-else
                  v-model="valuesFor(row, field)[field.key]"
                  :type="field.kind === 'date' ? 'date' : 'text'"
                  :aria-label="field.label"
                  :required="field.required"
                />
              </td>
              <td data-label="Storage Box *">
                <select v-model="row.common.box_id" aria-label="Storage Box" :required="!defaultBox">
                  <option value="">{{ defaultBox ? 'Shared box' : '-- Select --' }}</option>
                  <option v-for="box in boxes" :key="box.id" :value="box.id">{{ box.storage_id }} - {{ box.box_name }}</option>
                </select>
              </td>
              <td data-label="Quantity">
                <input v-model.number="row.common.quantity" aria-label="Quantity" type="number" min="0" max="2147483647" step="1" />
              </td>
              <td data-label="Notes">
                <input v-model="row.common.notes" aria-label="Notes" type="text" />
              </td>
              <td class="row-actions" data-label="Actions">
                <button type="button" :aria-label="`Duplicate row ${index + 1}`" :title="`Duplicate row ${index + 1}`" @click="duplicateRow(row)"><Copy :size="16" /></button>
                <button type="button" :aria-label="`Remove row ${index + 1}`" :title="`Remove row ${index + 1}`" @click="removeRow(row)"><Trash2 :size="16" /></button>
                <span v-if="row.error" class="row-error" role="alert">{{ row.error }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <button v-if="type" type="button" class="add-row" @click="addRow"><Plus :size="16" /> Add Row</button>
      </fieldset>

      <div class="bulk-footer">
        <span role="status">{{ saving ? 'Saving items...' : `${rows.length} items` }}</span>
        <button type="submit" class="save-button" :disabled="saving || !type || !rows.length">Save All</button>
        <button type="button" :disabled="saving" @click="close">Cancel</button>
      </div>
    </form>
  </ModalShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Copy, Plus, Trash2 } from '@lucide/vue';
import ModalShell from './ModalShell.vue';
import { FORM_TYPES, blankCommon, buildPayload, enumTypesOf, formTypeByKey } from '../config/itemForms.js';
import { itemsService } from '../services/api.js';
import { useEnumOptions } from '../composables/useEnumOptions.js';
import { errorMessage, notifyInfo } from '../composables/useNotifications.js';

const props = defineProps({
  categories: { type: Array, default: () => [] },
  boxes: { type: Array, default: () => [] },
  categoryName: { type: String, default: '' }
});
const emit = defineEmits(['saved', 'close']);
const form = ref(null);
const typeKey = ref(FORM_TYPES.find((option) => option.belongsTo(props.categoryName))?.key ?? '');
const type = computed(() => formTypeByKey(typeKey.value));
const defaultBox = ref('');
const drafts = ref({});
const rows = computed(() => drafts.value[typeKey.value] ?? []);
const saving = ref(false);
let nextId = 1;

const newRow = () => ({ id: nextId++, common: blankCommon(), fields: type.value.blank(), error: '' });
const addRow = () => rows.value.push(newRow());
const duplicateRow = (row) => rows.value.push({ id: nextId++, common: { ...row.common }, fields: { ...row.fields }, error: '' });
const removeRow = (row) => { drafts.value[typeKey.value] = rows.value.filter((candidate) => candidate.id !== row.id); };
const valuesFor = (row, field) => field.target === 'common' ? row.common : row.fields;
const close = () => { if (!saving.value) emit('close'); };

watch(() => props.categoryName, (categoryName) => {
  if (!typeKey.value) typeKey.value = FORM_TYPES.find((option) => option.belongsTo(categoryName))?.key ?? '';
});

const { options: enumOptions, load: loadEnumOptions } = useEnumOptions();
watch(type, (current) => {
  if (!current) return;
  if (!drafts.value[current.key]) drafts.value[current.key] = [newRow(), newRow()];
  loadEnumOptions(enumTypesOf(current));
}, { immediate: true });

const saveAll = async () => {
  if (saving.value || !type.value || !rows.value.length || !form.value.reportValidity()) return;
  saving.value = true;
  let saved = 0;
  try {
    for (const row of [...rows.value]) {
      row.error = '';
      try {
        await itemsService.create(buildPayload(type.value, {
          common: { ...row.common, box_id: row.common.box_id || defaultBox.value },
          fields: row.fields
        }, props.categories));
        removeRow(row);
        saved++;
      } catch (failure) {
        row.error = errorMessage(failure, 'Could not save this item.');
      }
    }
  } finally {
    saving.value = false;
    if (saved) {
      emit('saved');
      notifyInfo(`${saved} ${saved === 1 ? 'item' : 'items'} added.`);
    }
    if (!rows.value.length) {
      delete drafts.value[typeKey.value];
      const remainingType = Object.keys(drafts.value).find((key) => drafts.value[key].length);
      if (remainingType) typeKey.value = remainingType;
      else emit('close');
    }
  }
};
</script>

<style scoped>
.bulk-modal {
  --modal-max-width: 1600px;
}

.bulk-form { padding: 1.25rem; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
.bulk-settings { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; }
.bulk-settings label { display: grid; gap: 0.5rem; font-weight: 500; }
input, select { width: 100%; min-width: 0; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font: inherit; background: white; color: #2c3e50; }
input:focus, select:focus { outline: 2px solid #3498db; outline-offset: 1px; }
input[type="checkbox"] { width: 1rem; height: 1rem; }
.bulk-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 0.85rem; }
th, td { padding: 0.4rem; text-align: left; vertical-align: top; overflow-wrap: anywhere; border-bottom: 1px solid #e0e0e0; }
thead th { background: #f5f5f5; }
th:first-child { width: 2rem; }
th:last-child { width: 5.5rem; }
button { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; border: 1px solid #ccc; border-radius: 4px; background: white; color: #2c3e50; padding: 0.6rem 0.9rem; font: inherit; cursor: pointer; }
button:hover { background: #f0f4f7; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
.row-actions button { width: 2rem; height: 2rem; padding: 0; margin-right: 0.2rem; }
.row-error { display: block; margin-top: 0.5rem; color: #b42318; }
.add-row { margin-top: 1rem; }
.bulk-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin-top: 1.25rem; }
.bulk-footer span { margin-right: auto; }
.save-button { background: #27ae60; color: white; border-color: #27ae60; }
.save-button:hover { background: #229954; }

@media (max-width: 1100px) {
  .bulk-table, tbody { display: block; }
  thead { display: none; }
  tr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; border-bottom: 1px solid #ccc; padding: 1rem 0; }
  th:first-child { width: auto; grid-column: 1 / -1; }
  td { border: 0; padding: 0; min-width: 0; }
  td::before { content: attr(data-label); display: block; margin-bottom: 0.4rem; font-weight: 500; }
  .row-actions { grid-column: 1 / -1; }
}

@media (max-width: 600px) {
  .bulk-settings { grid-template-columns: minmax(0, 1fr); }
  tr { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .bulk-form { padding: 1rem; }
}
</style>