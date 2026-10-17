<template>
  <div>
    <table class="items-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            class="sortable"
            :class="{ active: sortBy === column.key }"
            @click="toggleSort(column.key)"
          >
            {{ column.label }} {{ indicator(column.key) }}
          </th>
          <th class="sortable" :class="{ active: sortBy === 'storage' }" @click="toggleSort('storage')">
            Storage {{ indicator('storage') }}
          </th>
          <th class="sortable" :class="{ active: sortBy === 'quantity' }" @click="toggleSort('quantity')">
            Qty {{ indicator('quantity') }}
          </th>
          <th>Notes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in pageItems" :key="item.id" class="item-row" :class="ROW_CLASSES[item.source_type]">
          <td v-for="column in columns" :key="column.key" :class="[column.cellClass, column.statusClass?.(item)]">
            {{ column.value(item) }}
          </td>
          <td class="storage">{{ STORAGE_COLUMN.value(item) }}</td>
          <td class="quantity">
            <QuantityEditor :key="`${item.source_type}:${item.id}`" :item="item" @updated="emit('quantity-updated', item, $event)" />
          </td>
          <td class="details">
            <div class="details-cell">
              <button v-if="item.notes" class="notes-btn" title="Click to view notes" @click="emit('view-notes', item)">📝</button>
              <span v-if="notesMatchSearch(item)" class="badge-match" title="Match found in notes">📄</span>
            </div>
          </td>
          <td class="actions">
            <button class="btn-icon" title="Edit" @click="emit('edit', item)">✏️</button>
            <button class="btn-icon" title="Delete" :aria-label="`Delete ${itemName(item)}`" @click="emit('delete', item)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="items.length > 0" class="pagination">
      <div class="pagination-info">
        Showing {{ (page - 1) * PAGE_SIZE + 1 }} - {{ Math.min(page * PAGE_SIZE, items.length) }} of {{ items.length }} items
      </div>
      <div class="pagination-controls">
        <button :disabled="page === 1" class="btn-pagination" @click="goToPage(page - 1)">← Previous</button>
        <span class="page-numbers">
          <button
            v-for="number in totalPages"
            :key="number"
            :class="{ active: page === number }"
            class="page-number"
            @click="goToPage(number)"
          >
            {{ number }}
          </button>
        </span>
        <button :disabled="page === totalPages" class="btn-pagination" @click="goToPage(page + 1)">Next →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import QuantityEditor from './QuantityEditor.vue';
import { STORAGE_COLUMN, defaultSortKey, resolveTableKind, sortItems } from '../config/tableColumns.js';

const PAGE_SIZE = 20;
const ROW_CLASSES = {
  rc_part: 'rc-part', screw: 'screw', nut: 'nut', bearing: 'bearing', oil_paste: 'oil-paste', battery: 'battery'
};

const props = defineProps({
  items: { type: Array, required: true },
  categoryId: { type: [Number, String], default: '' },
  categoryName: { type: String, default: '' },
  searchQuery: { type: String, default: '' },
  // The current page (1-based); use as v-model
  modelValue: { type: Number, default: 1 }
});
const emit = defineEmits(['update:modelValue', 'edit', 'delete', 'view-notes', 'quantity-updated']);

const page = computed(() => props.modelValue);
const goToPage = (number) => emit('update:modelValue', number);

const kind = computed(() => resolveTableKind({
  categoryId: props.categoryId, categoryName: props.categoryName, items: props.items
}));
const columns = computed(() => kind.value.columns);

// Until the user picks a column, each layout sorts by its own default
const chosenSort = ref(null);
const sortOrder = ref('asc');
const sortBy = computed(() => chosenSort.value ?? defaultSortKey(kind.value));

watch(() => props.categoryId, () => {
  chosenSort.value = null;
  sortOrder.value = 'asc';
});

const toggleSort = (key) => {
  if (sortBy.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    chosenSort.value = key;
    sortOrder.value = 'asc';
  }
  goToPage(1);
};

const indicator = (key) => (sortBy.value === key ? (sortOrder.value === 'asc' ? '↑' : '↓') : '');

const totalPages = computed(() => Math.ceil(props.items.length / PAGE_SIZE));
const pageItems = computed(() => {
  const sorted = sortItems(props.items, columns.value, sortBy.value, sortOrder.value);
  return sorted.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE);
});

// Deleting the last item of the last page must not leave an empty page behind
watch(totalPages, (total) => {
  if (total > 0 && page.value > total) goToPage(total);
});

const notesMatchSearch = (item) =>
  Boolean(props.searchQuery && item.notes && item.notes.toLowerCase().includes(props.searchQuery.toLowerCase()));

const itemName = (item) => item.display_name || item.name || item.item_code || item.size || 'item';
</script>

<style scoped>
.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.items-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #ddd;
}

.items-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
}

.item-row {
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
}

.item-row:hover {
  background: #f8f9fa;
}

.item-row.rc-part {
  background: #e3f2fd;
}

.item-row.rc-part:hover {
  background: #bbdefb;
}

.item-row.screw {
  background: #fff3e0;
}

.item-row.screw:hover {
  background: #ffe0b2;
}

.item-row.nut {
  background: #e8f5e9;
}

.item-row.nut:hover {
  background: #c8e6c9;
}

.item-row.bearing {
  background: #f3e5f5;
}

.item-row.bearing:hover {
  background: #e1bee7;
}

.item-row.oil-paste {
  background: #f0f4c3;
}

.item-row.oil-paste:hover {
  background: #e6f0a8;
}

.item-row.battery {
  background: #e8d4f1;
}

.item-row.battery:hover {
  background: #dfc4ea;
}

/* Expiration date styling */
.expiration-date {
  font-weight: 500;
}

.expiration-date.expired {
  background-color: #fee2e2;
  color: #991b1b;
  font-weight: 600;
}

.expiration-date.expiring-soon {
  background-color: #fef3c7;
  color: #92400e;
  font-weight: 600;
}

/* Table cell alignment and spacing */
.items-table td.size,
.items-table td.company,
.items-table td.model,
.items-table td.type,
.items-table td.mah,
.items-table td.rechargeable,
.items-table td.expiration-date {
  text-align: left;
  padding: 0.75rem 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.items-table td.rechargeable {
  text-align: center;
}

.items-table th {
  padding: 1rem 0.5rem;
  text-align: left;
}

.items-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.items-table th.sortable:hover {
  background: #e8eef7;
}

.items-table th.sortable.active {
  background: #d4dce8;
  font-weight: 600;
}

.items-table td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.item-name {
  font-weight: 500;
  color: #2c3e50;
  word-break: break-word;
}

.company, .model, .code {
  color: #2c5aa0;
  font-weight: 500;
}

.storage {
  color: #555;
  white-space: nowrap;
}

.quantity {
  font-weight: 600;
  color: #27ae60;
}

.details {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.details-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.notes-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.2rem;
  transition: transform 0.2s, opacity 0.2s;
}

.notes-btn:hover {
  transform: scale(1.2);
  opacity: 0.7;
}

.badge-match {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: help;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.badge-match:hover {
  opacity: 1;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.pagination {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.pagination-info {
  font-size: 0.9rem;
  color: #555;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-pagination {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-weight: 500;
}

.btn-pagination:hover:not(:disabled) {
  background: #2980b9;
}

.btn-pagination:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.6;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  background: white;
  color: #3498db;
  border: 1px solid #3498db;
  padding: 0.4rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  font-size: 0.9rem;
}

.page-number:hover {
  background: #ecf0f1;
}

.page-number.active {
  background: #3498db;
  color: white;
}

@media (max-width: 768px) {
  .items-table {
    font-size: 0.85rem;
  }

  .items-table th,
  .items-table td {
    padding: 0.5rem;
  }
}
</style>
