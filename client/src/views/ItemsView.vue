<template>
  <div class="items-view">
    <div class="search-bar">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Search items..."
        @input="handleSearch"
      />
      <select v-model="filterCategory" @change="handleFilter">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
      <button @click="showAddModal = true" class="btn-primary">+ Add Item</button>
    </div>

    <div class="items-list">
      <table class="items-table">
        <thead>
          <tr>
            <th @click="handleSort('name')" class="sortable" :class="{ active: sortBy === 'name' }">
              Name {{ sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th @click="handleSort('company')" class="sortable" :class="{ active: sortBy === 'company' }">
              Company {{ sortBy === 'company' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th @click="handleSort('model')" class="sortable" :class="{ active: sortBy === 'model' }">
              Model {{ sortBy === 'model' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th @click="handleSort('code')" class="sortable" :class="{ active: sortBy === 'code' }">
              Item Code {{ sortBy === 'code' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-for="col in getAllDisplayColumns()" :key="col">
              {{ getColumnLabel(col) }}
            </th>
            <th @click="handleSort('storage')" class="sortable" :class="{ active: sortBy === 'storage' }">
              Storage {{ sortBy === 'storage' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th @click="handleSort('quantity')" class="sortable" :class="{ active: sortBy === 'quantity' }">
              Qty {{ sortBy === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedItems()" :key="item.id" class="item-row" :class="{ 'rc-part': item.source_type === 'rc_part' }">
            <td class="item-name">{{ item.display_name || item.name || '-' }}</td>
            <td class="company">{{ item.display_company || '-' }}</td>
            <td class="model">{{ item.display_model || '-' }}</td>
            <td class="code">{{ item.display_code || '-' }}</td>
            <td v-for="col in getAllDisplayColumns()" :key="col" class="param-cell">
              {{ item.source_type === 'rc_part' ? '-' : (parseParameters(item.parameters)[col] || '-') }}
            </td>
            <td class="storage">{{ item.storage_id || item.box_name || '-' }}</td>
            <td class="quantity">{{ item.quantity }}</td>
            <td class="details">
              <div class="details-cell">
                <button v-if="item.notes" @click="viewNotes(item)" class="notes-btn" title="Click to view notes">📝</button>
                <span v-if="searchQuery && hasSearchMatch(item, 'notes')" class="badge-match" title="Match found in notes">📄</span>
                <span v-if="searchQuery && hasSearchMatch(item, 'parameters')" class="badge-match" title="Match found in parameters">⚙️</span>
              </div>
            </td>
            <td class="actions">
              <button @click="editItem(item)" class="btn-small btn-edit">Edit</button>
              <button @click="deleteItem(item.id)" class="btn-small btn-delete">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="items.length === 0" class="empty-state">
        <p>No items found. Try adjusting your search filters or add a new item.</p>
      </div>
      
      <!-- Pagination -->
      <div v-if="items.length > 0" class="pagination">
        <div class="pagination-info">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, items.length) }} of {{ items.length }} items
        </div>
        <div class="pagination-controls">
          <button @click="currentPage--" :disabled="currentPage === 1" class="btn-pagination">← Previous</button>
          <span class="page-numbers">
            <button 
              v-for="page in totalPages()" 
              :key="page"
              @click="currentPage = page"
              :class="{ active: currentPage === page }"
              class="page-number"
            >
              {{ page }}
            </button>
          </span>
          <button @click="currentPage++" :disabled="currentPage === totalPages()" class="btn-pagination">Next →</button>
        </div>
      </div>
    </div>

    <!-- View Notes Modal -->
    <div v-if="showNotesModal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h2>📝 Notes</h2>
          <button type="button" @click="closeNotesModal" class="close-btn">✕</button>
        </div>
        <div class="modal-content">
          <p class="notes-text">{{ viewingNotes }}</p>
        </div>
        <div class="modal-actions">
          <button @click="closeNotesModal" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h2>{{ editingItem ? 'Edit Item' : 'Add New Item' }}</h2>
          <button type="button" @click="closeModal" class="close-btn">✕</button>
        </div>
        
        <form @submit.prevent="saveItem" class="modal-form">
          <div class="form-group">
            <label>Item Type *</label>
            <select v-model="formData.item_type" required>
              <option value="">Select Item Type</option>
              <option value="Screws">🔩 Screws</option>
              <option value="Nuts">⚙️ Nuts</option>
              <option value="Bearings">🔄 Bearings</option>
              <option value="RC Parts">🏎️ RC Parts</option>
              <option value="Oils/Pastes">🛢️ Oils/Pastes</option>
              <option value="Batteries">🔋 Batteries</option>
              <option value="Other Items">📦 Other Items</option>
            </select>
          </div>

          <div class="form-group">
            <label>Category</label>
            <select v-model="formData.category_id">
              <option value="">-- No Category --</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
          </div>
          
          <div class="form-group">
            <label>Quantity</label>
            <input v-model.number="formData.quantity" type="number" placeholder="Quantity" />
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="formData.notes" placeholder="Additional notes"></textarea>
          </div>

          <!-- Dynamic Parameters based on Item Type -->
          <div v-if="parameterDefinitions.length > 0" class="form-section">
            <label class="section-title">📋 Item Parameters</label>
            <div v-for="param in parameterDefinitions" :key="param.key" class="form-group">
              <label>{{ param.label }}</label>
              <select 
                v-if="param.type === 'select'"
                v-model="formData.parameters[param.key]"
              >
                <option value="">-- Select --</option>
                <option v-for="value in enumOptions[param.enum_type] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
              <input 
                v-else-if="param.type !== 'checkbox'"
                v-model="formData.parameters[param.key]" 
                :type="param.type" 
                :placeholder="param.label"
              />
              <label v-else class="checkbox-label">
                <input 
                  v-model="formData.parameters[param.key]" 
                  type="checkbox"
                />
                {{ param.label }}
              </label>
            </div>
          </div>

          <!-- Display existing parameters in edit mode -->
          <div v-else-if="editingItem && formData.parameters && Object.keys(formData.parameters).length > 0" class="form-group">
            <label>📋 Parameters</label>
            <div class="parameters-display">
              <div v-for="(value, key) in parseParameters(formData.parameters)" :key="key" class="param-item">
                <strong>{{ key }}:</strong> <span>{{ value }}</span>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Save</button>
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { itemsService, categoriesService, enumsService } from '../services/api.js';

// Parameter definitions for each item type
// Types: 'text', 'number', 'date', 'checkbox', 'select' (dropdown)
const PARAMETER_DEFINITIONS = {
  'Screws': [
    { key: 'size', label: 'Size (e.g., M3, M5)', type: 'text', display: true },
    { key: 'length', label: 'Length (mm)', type: 'number', display: true },
    { key: 'head_type', label: 'Head Type', type: 'select', enum_type: 'screw_head_type', display: true },
    { key: 'drive_type', label: 'Drive Type', type: 'select', enum_type: 'screw_drive_type', display: true },
    { key: 'thread_type', label: 'Thread Type', type: 'select', enum_type: 'screw_thread_type', display: false }
  ],
  'Nuts': [
    { key: 'size', label: 'Size (e.g., M3)', type: 'text', display: true },
    { key: 'type', label: 'Type', type: 'select', enum_type: 'nut_type', display: true },
    { key: 'color', label: 'Color', type: 'select', enum_type: 'nut_color', display: true },
    { key: 'has_washer', label: 'Has Washer', type: 'checkbox', display: false }
  ],
  'Bearings': [
    { key: 'type', label: 'Type', type: 'text', display: true },
    { key: 'id', label: 'Inner Diameter (ID mm)', type: 'number', display: true },
    { key: 'od', label: 'Outer Diameter (OD mm)', type: 'number', display: true },
    { key: 'width', label: 'Width (mm)', type: 'number', display: true }
  ],
  'RC Parts': [
    { key: 'company', label: 'Company', type: 'select', enum_type: 'rc_company', display: true },
    { key: 'model', label: 'Model (Car/Vehicle)', type: 'select', enum_type: 'rc_model', display: true },
    { key: 'item_code', label: 'Item Code / Part Number', type: 'text', display: true }
  ],
  'Oils/Pastes': [
    { key: 'company', label: 'Company', type: 'select', enum_type: 'oil_paste_company', display: true },
    { key: 'type', label: 'Type', type: 'select', enum_type: 'oil_paste_type', display: true },
    { key: 'weight_type', label: 'Weight/Type', type: 'text', display: false },
    { key: 'ml', label: 'Volume (ml)', type: 'number', display: false }
  ],
  'Batteries': [
    { key: 'type', label: 'Type', type: 'select', enum_type: 'battery_type', display: true },
    { key: 'model', label: 'Model', type: 'text', display: true },
    { key: 'expiration', label: 'Expiration Date', type: 'date', display: true }
  ],
  'Other Items': [
    { key: 'item_type', label: 'Item Type', type: 'text', display: true },
    { key: 'size', label: 'Size', type: 'text', display: false }
  ]
};

export default {
  props: {
    selectedCategory: {
      type: [Number, String, null],
      default: null
    }
  },
  setup(props) {
    const items = ref([]);
    const categories = ref([]);
    const boxes = ref([]);
    const searchQuery = ref('');
    const filterCategory = ref('');
    const showAddModal = ref(false);
    const editingItem = ref(null);
    const showNotesModal = ref(false);
    const viewingNotes = ref('');
    const formData = ref({
      name: '',
      item_type: '',
      category_id: '',
      box_id: '',
      quantity: 0,
      notes: '',
      parameters: {}
    });
    const parameterDefinitions = ref([]);
    const enumOptions = ref({}); // Store enum options: { enum_type: [values] }
    const currentPage = ref(1);
    const itemsPerPage = 50;
    const sortBy = ref('name');
    const sortOrder = ref('asc'); // 'asc' or 'desc'

    const loadItems = async () => {
      try {
        const response = await itemsService.getAll({
          search: searchQuery.value,
          category_id: filterCategory.value
        });
        items.value = response.data || [];
      } catch (error) {
        console.error('Error loading items:', error);
      }
    };

    const loadCategories = async () => {
      try {
        const response = await categoriesService.getAll();
        categories.value = response.data || [];
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    const loadEnumOptions = async (enum_types) => {
      try {
        for (const enum_type of enum_types) {
          if (!enumOptions.value[enum_type]) {
            const response = await enumsService.getValues(enum_type);
            enumOptions.value[enum_type] = response.data || [];
          }
        }
      } catch (error) {
        console.error('Error loading enum options:', error);
      }
    };

    const updateParameterFields = async () => {
      const itemType = formData.value.item_type;
      const defs = PARAMETER_DEFINITIONS[itemType] || [];
      parameterDefinitions.value = defs;
      
      // Load enum options for this item type
      const enum_types = defs
        .filter(p => p.type === 'select' && p.enum_type)
        .map(p => p.enum_type);
      if (enum_types.length > 0) {
        await loadEnumOptions(enum_types);
      }
      
      // Initialize parameters object with empty values
      const newParams = {};
      defs.forEach(param => {
        if (formData.value.parameters && formData.value.parameters[param.key] !== undefined) {
          newParams[param.key] = formData.value.parameters[param.key];
        } else {
          newParams[param.key] = param.type === 'checkbox' ? false : '';
        }
      });
      formData.value.parameters = newParams;
    };

    // Watch for item_type changes
    watch(() => formData.value.item_type, () => {
      updateParameterFields();
    });

    const handleSearch = () => {
      loadItems();
    };

    const handleFilter = () => {
      loadItems();
    };

    const viewNotes = (item) => {
      viewingNotes.value = item.notes;
      showNotesModal.value = true;
    };

    const closeNotesModal = () => {
      showNotesModal.value = false;
      viewingNotes.value = '';
    };

    const closeModal = () => {
      showAddModal.value = false;
      editingItem.value = null;
      formData.value = {
        name: '',
        item_type: '',
        category_id: '',
        box_id: '',
        quantity: 0,
        notes: '',
        parameters: {}
      };
      parameterDefinitions.value = [];
    };

    const parseParameters = (params) => {
      if (!params) return {};
      if (typeof params === 'string') {
        try {
          return JSON.parse(params);
        } catch (e) {
          return {};
        }
      }
      return params;
    };

    const totalPages = () => {
      return Math.ceil(items.value.length / itemsPerPage);
    };

    const paginatedItems = () => {
      let sorted = [...items.value];
      
      // Sort based on current sort settings
      sorted.sort((a, b) => {
        let aVal, bVal;
        
        if (sortBy.value === 'name') {
          aVal = (a.display_name || a.name || '').toLowerCase();
          bVal = (b.display_name || b.name || '').toLowerCase();
        } else if (sortBy.value === 'company') {
          aVal = (a.display_company || '').toLowerCase();
          bVal = (b.display_company || '').toLowerCase();
        } else if (sortBy.value === 'model') {
          aVal = (a.display_model || '').toLowerCase();
          bVal = (b.display_model || '').toLowerCase();
        } else if (sortBy.value === 'code') {
          aVal = (a.display_code || '').toLowerCase();
          bVal = (b.display_code || '').toLowerCase();
        } else if (sortBy.value === 'quantity') {
          aVal = a.quantity || 0;
          bVal = b.quantity || 0;
        } else if (sortBy.value === 'storage') {
          aVal = (a.storage_id || a.box_name || '').toLowerCase();
          bVal = (b.storage_id || b.box_name || '').toLowerCase();
        }
        
        if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
      });
      
      const start = (currentPage.value - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return sorted.slice(start, end);
    };

    const handleSort = (column) => {
      if (sortBy.value === column) {
        // Toggle sort order
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        // Set new sort column
        sortBy.value = column;
        sortOrder.value = 'asc';
      }
      currentPage.value = 1;
    };

    const getDisplayColumns = (itemType) => {
      const defs = PARAMETER_DEFINITIONS[itemType] || [];
      return defs.filter(d => d.display).map(d => d.key);
    };

    const getAllDisplayColumns = () => {
      if (filterCategory.value) {
        // If filtering by category, find items of that type
        const itemsOfCategory = items.value.filter(i => i.category_id === filterCategory.value);
        const types = [...new Set(itemsOfCategory.map(i => i.item_type))];
        const allCols = new Set();
        types.forEach(type => {
          getDisplayColumns(type).forEach(col => allCols.add(col));
        });
        return Array.from(allCols);
      } else {
        // Show all possible columns
        const allCols = new Set();
        Object.values(PARAMETER_DEFINITIONS).forEach(defs => {
          defs.filter(d => d.display).forEach(d => allCols.add(d.key));
        });
        return Array.from(allCols);
      }
    };

    const getColumnLabel = (key) => {
      for (const defs of Object.values(PARAMETER_DEFINITIONS)) {
        const def = defs.find(d => d.key === key);
        if (def) return def.label;
      }
      return key;
    };

    const hasSearchMatch = (item, field) => {
      if (!searchQuery.value) return false;
      const query = searchQuery.value.toLowerCase();
      
      if (field === 'notes') {
        return item.notes && item.notes.toLowerCase().includes(query);
      } else if (field === 'parameters') {
        const params = parseParameters(item.parameters);
        return Object.values(params).some(val => 
          val && String(val).toLowerCase().includes(query)
        );
      }
      return false;
    };

    const editItem = (item) => {
      editingItem.value = item;
      formData.value = {
        name: item.name,
        item_type: item.item_type || '',
        category_id: item.category_id || '',
        box_id: item.box_id || '',
        quantity: item.quantity || 0,
        notes: item.notes || '',
        parameters: parseParameters(item.parameters) || {}
      };
      updateParameterFields();
      showAddModal.value = true;
    };

    const saveItem = async () => {
      try {
        if (editingItem.value) {
          await itemsService.update(editingItem.value.id, formData.value);
        } else {
          await itemsService.create(formData.value);
        }
        closeModal();
        loadItems();
      } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item: ' + error.message);
      }
    };

    const deleteItem = async (id) => {
      if (confirm('Are you sure you want to delete this item?')) {
        try {
          await itemsService.delete(id);
          loadItems();
        } catch (error) {
          console.error('Error deleting item:', error);
          alert('Error deleting item: ' + error.message);
        }
      }
    };

    onMounted(() => {
      loadItems();
      loadCategories();
    });

    watch(() => props.selectedCategory, (newVal) => {
      filterCategory.value = newVal || '';
      currentPage.value = 1;
      loadItems();
    });

    watch(() => searchQuery.value, () => {
      currentPage.value = 1;
    });

    watch(() => filterCategory.value, () => {
      currentPage.value = 1;
    });

    return {
      items,
      categories,
      boxes,
      searchQuery,
      filterCategory,
      showAddModal,
      editingItem,
      formData,
      parameterDefinitions,
      enumOptions,
      showNotesModal,
      viewingNotes,
      handleSearch,
      handleFilter,
      closeModal,
      closeNotesModal,
      viewNotes,
      parseParameters,
      getDisplayColumns,
      getAllDisplayColumns,
      getColumnLabel,
      hasSearchMatch,
      currentPage,
      totalPages,
      paginatedItems,
      itemsPerPage,
      sortBy,
      sortOrder,
      handleSort,
      editItem,
      saveItem,
      deleteItem
    };
  }
};
</script>

<style scoped>
.items-view {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.search-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-bar input,
.search-bar select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  flex: 1;
  min-width: 150px;
}

.search-bar input:focus,
.search-bar select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.items-list {
  overflow-x: auto;
}

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
  background: #f0f7ff;
}

.item-row.rc-part:hover {
  background: #e6f2ff;
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

.param-cell {
  font-size: 0.9rem;
  color: #555;
  padding: 0.75rem 0.75rem;
}

.param-cell:empty::before {
  content: '-';
  color: #bbb;
}

.category .badge {
  background: #e8f4f8;
  color: #0c5460;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
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

.params {
  display: inline-block;
  background: #d4edda;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
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

.btn-small {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.btn-edit {
  background: #3498db;
  color: white;
}

.btn-edit:hover {
  background: #2980b9;
}

.btn-delete {
  background: #e74c3c;
  color: white;
}

.btn-delete:hover {
  background: #c0392b;
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

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-box {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  transition: color 0.2s;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #2c3e50;
}

.modal-form {
  padding: 1.5rem;
}

.parameters-display {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.param-item {
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  gap: 0.5rem;
  word-break: break-word;
}

.param-item:last-child {
  border-bottom: none;
}

.param-item strong {
  min-width: 120px;
  color: #2c3e50;
  font-weight: 600;
}

.param-item span {
  color: #555;
  flex: 1;
}

.form-group {
  margin-bottom: 1.5rem;
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
  min-height: 80px;
}

.form-section {
  background: #f0f7ff;
  border-left: 4px solid #3498db;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.section-title {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.form-section .form-group {
  margin-bottom: 1rem;
}

.form-section .form-group:last-child {
  margin-bottom: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
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

@media (max-width: 768px) {
  .items-view {
    padding: 1rem;
  }

  .items-table {
    font-size: 0.85rem;
  }

  .items-table th,
  .items-table td {
    padding: 0.5rem;
  }

  .btn-small {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
  }

  .search-bar {
    flex-direction: column;
  }

  .search-bar input,
  .search-bar select {
    min-width: 100%;
  }
}
</style>
