<template>
  <div class="manage-view">
    <FieldOptionsCard v-for="group in FIELD_GROUPS" :key="group.variant" v-bind="group" />

    <div class="manage-section">
      <h2>📂 Categories</h2>
      <div class="manage-form">
        <input v-model="newCategory" placeholder="Category name" aria-label="Category name" />
        <button type="button" class="btn-primary" @click="addCategory">Add Category</button>
      </div>
      <div class="manage-list">
        <div v-if="categories.length === 0" class="empty-state">No categories</div>
        <div v-for="cat in categories" :key="cat.id" class="manage-item">
          <span>{{ cat.name }}</span>
          <button type="button" class="btn-icon" title="Delete" :aria-label="`Delete category ${cat.name}`" @click="deleteCategory(cat)">🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import FieldOptionsCard from '../components/FieldOptionsCard.vue';
import { categoriesService } from '../services/api.js';
import { confirmAction, errorMessage, notifyError } from '../composables/useNotifications.js';

// One card per item family; `fields` are the catalog enum types shown in the item forms' dropdowns
const FIELD_GROUPS = [
  {
    variant: 'rc', title: '🏎️ RC Parts Fields', subject: 'RC',
    fields: [
      { value: 'rc_company', label: 'RC Company' },
      { value: 'rc_model', label: 'RC Model' }
    ]
  },
  {
    variant: 'screw', title: '🔩 Screw Fields', subject: 'Screw',
    fields: [
      { value: 'screw_size', label: 'Size' },
      { value: 'screw_head_type', label: 'Head Type' },
      { value: 'screw_drive_type', label: 'Drive Type' },
      { value: 'screw_thread_type', label: 'Thread Type' },
      { value: 'screw_color', label: 'Color' },
      { value: 'screw_material', label: 'Material' }
    ]
  },
  {
    variant: 'nut', title: '⚙️ Nut Fields', subject: 'Nut',
    fields: [
      { value: 'nut_size', label: 'Size' },
      { value: 'nut_type', label: 'Type' },
      { value: 'nut_color', label: 'Color' }
    ]
  },
  {
    variant: 'washer-bearing', title: '⚪ Washers & Bearings Fields', subject: 'Washer/Bearing',
    fields: [
      { value: 'washer_bearing_subtype', label: 'Subtype' },
      { value: 'washer_bearing_material', label: 'Material' }
    ]
  },
  {
    variant: 'battery', title: '🔋 Battery Fields', subject: 'Battery',
    fields: [
      { value: 'battery_size', label: 'Size' },
      { value: 'battery_company', label: 'Company' },
      { value: 'battery_model', label: 'Model' },
      { value: 'battery_type', label: 'Type' }
    ]
  },
  {
    variant: 'oil', title: '🛢️ Oil/Paste Fields', subject: 'Oil/Paste',
    fields: [
      { value: 'oil_paste_company', label: 'Company' },
      { value: 'oil_paste_type', label: 'Type' }
    ]
  }
];

const categories = ref([]);
const newCategory = ref('');

const loadCategories = async () => {
  try {
    const response = await categoriesService.getAll();
    categories.value = response.data || [];
  } catch (error) {
    console.error('Error loading categories:', error);
  }
};

const addCategory = async () => {
  if (!newCategory.value.trim()) return;
  try {
    await categoriesService.create(newCategory.value);
    newCategory.value = '';
    loadCategories();
  } catch (error) {
    console.error('Error adding category:', error);
    notifyError(errorMessage(error, 'Could not add the category.'));
  }
};

const deleteCategory = async (category) => {
  const confirmed = await confirmAction({ title: `Delete category "${category.name}"?`, message: 'This cannot be undone.' });
  if (!confirmed) return;
  try {
    await categoriesService.delete(category.id);
    loadCategories();
  } catch (error) {
    console.error('Error deleting category:', error);
    notifyError(errorMessage(error, 'Could not delete the category.'));
  }
};

onMounted(loadCategories);
</script>

<style>
/* Not scoped: the cards are rendered by FieldOptionsCard, so these rules are limited to the Manage page by prefix */
.manage-view {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.manage-view .manage-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.manage-view .manage-section--rc {
  background: #e3f2fd !important;
  border-left: 5px solid #1976d2 !important;
}

.manage-view .manage-section--screw {
  background: #fff3e0 !important;
  border-left: 5px solid #f57c00 !important;
}

.manage-view .manage-section--nut {
  background: #e8f5e9 !important;
  border-left: 5px solid #388e3c !important;
}

.manage-view .manage-section--battery {
  background: #fff9e6 !important;
  border-left: 5px solid #fbc02d !important;
}

.manage-view .manage-section--oil {
  background: #f3e5f5 !important;
  border-left: 5px solid #8e24aa !important;
}

.manage-view .manage-section h2 {
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.manage-view .manage-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.manage-view .manage-form input,
.manage-view .manage-form select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
}

.manage-view .manage-form input:focus,
.manage-view .manage-form select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.manage-view .manage-form .btn-primary {
  padding: 0.75rem;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s;
}

.manage-view .manage-form .btn-primary:hover {
  background: #229954;
}

.manage-view .manage-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.manage-view .manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #3498db;
  gap: 1rem;
}

.manage-view .empty-state {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
  font-style: italic;
}

@media (max-width: 768px) {
  .manage-view {
    grid-template-columns: 1fr;
  }

  .manage-view .manage-form {
    gap: 0.5rem;
  }
}
</style>
