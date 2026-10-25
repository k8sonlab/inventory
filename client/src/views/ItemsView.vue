<template>
  <div class="items-view">
    <div class="search-bar">
      <input
        v-model="query"
        type="text"
        placeholder="Search items..."
        @keydown.enter.prevent="handleSearch"
      />
      <select v-model="filterCategory" @change="load()">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
      <button class="btn-primary" @click="openAddForm">+ Add Item</button>
      <button class="btn-primary" @click="showBulkForm = true">+ Add Multiple</button>
    </div>

    <p v-if="error" class="items-error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Loading items...</p>

    <div v-if="!filterCategory" class="category-summary">
      <div class="summary-header">
        <h3>Browse by category</h3>
        <span>{{ items.length }} matches</span>
      </div>
      <div class="summary-grid">
        <button
          v-for="cat in categorySummary"
          :key="cat.id"
          class="summary-card"
          @click="openCategory(cat.id)"
        >
          <span class="summary-name">{{ cat.name }}</span>
          <strong class="summary-count">{{ cat.count }}</strong>
          <small>items</small>
        </button>
      </div>
    </div>

    <div v-else class="items-list">
      <ItemsTable
        v-model="page"
        :items="items"
        :category-id="filterCategory"
        :category-name="currentCategory?.name ?? ''"
        :search-query="query"
        @edit="openEditForm"
        @delete="deleteItem"
        @view-notes="openNotes"
        @quantity-updated="updateQuantity"
      />
      <div v-if="items.length === 0 && !error && !loading" class="empty-state">
        <p>No items found. Try adjusting your search filters or add a new item.</p>
      </div>
    </div>

    <NotesModal v-if="viewingNotes !== null" :notes="viewingNotes" @close="viewingNotes = null" />

    <BulkItemFormModal
      v-if="showBulkForm"
      :categories="categories"
      :boxes="boxes"
      :category-name="currentCategory?.name ?? ''"
      @saved="load()"
      @close="showBulkForm = false"
    />

    <ItemFormModal
      v-if="showForm"
      :item="editingItem"
      :categories="categories"
      :boxes="boxes"
      :category-name="currentCategory?.name ?? ''"
      @saved="onSaved"
      @close="closeForm"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import ItemsTable from '../components/ItemsTable.vue';
import ItemFormModal from '../components/ItemFormModal.vue';
import BulkItemFormModal from '../components/BulkItemFormModal.vue';
import NotesModal from '../components/NotesModal.vue';
import { itemsService, categoriesService, locationsService } from '../services/api.js';
import { useItemsSearch } from '../composables/useItemsSearch.js';
import { confirmAction, errorMessage, notifyError, notifyInfo } from '../composables/useNotifications.js';
import { formTypeForItem } from '../config/itemForms.js';

const props = defineProps({
  selectedCategory: {
    type: [Number, String, null],
    default: null
  }
});
const emit = defineEmits(['select-category']);

const categories = ref([]);
const boxes = ref([]);
const filterCategory = ref(props.selectedCategory || '');
const page = ref(1);

const { items, loading, error, query, load, searchNow } = useItemsSearch(filterCategory, {
  onQueryChange: () => { page.value = 1; }
});

const currentCategory = computed(() => categories.value.find((cat) => cat.id === filterCategory.value));

const categorySummary = computed(() => {
  const counts = {};
  items.value.forEach((item) => {
    const categoryId = item.category_id || item.category_name;
    if (!categoryId) return;
    counts[categoryId] = (counts[categoryId] || 0) + 1;
  });
  return categories.value.map((cat) => ({ ...cat, count: counts[cat.id] || 0 }));
});

const loadCategories = async () => {
  try {
    const response = await categoriesService.getAll();
    categories.value = response.data || [];
  } catch (failure) {
    console.error('Error loading categories:', failure);
  }
};

const loadBoxes = async () => {
  try {
    const response = await locationsService.getBoxes();
    boxes.value = response.data || [];
  } catch (failure) {
    console.error('Error loading boxes:', failure);
  }
};

const openCategory = (categoryId) => {
  filterCategory.value = categoryId;
  page.value = 1;
  // The parent app reflects the category in the URL
  emit('select-category', categoryId);
  load();
};

const handleSearch = () => {
  page.value = 1;
  searchNow();
};

const updateQuantity = (item, quantity) => {
  item.quantity = quantity;
};

// Notes
const viewingNotes = ref(null);
const openNotes = (item) => {
  viewingNotes.value = item.notes;
};

// Add and edit
const showForm = ref(false);
const showBulkForm = ref(false);
const editingItem = ref(null);

const openAddForm = () => {
  editingItem.value = null;
  showForm.value = true;
};

const openEditForm = (item) => {
  if (!formTypeForItem(item)) {
    notifyInfo('This kind of item cannot be edited here.');
    return;
  }
  editingItem.value = item;
  showForm.value = true;
};

const closeForm = () => {
  showForm.value = false;
  editingItem.value = null;
};

const onSaved = () => {
  closeForm();
  load();
};

const deleteItem = async (item) => {
  const name = item.display_name || item.name || item.item_code || item.size || 'this item';
  const confirmed = await confirmAction({ title: `Delete "${name}"?`, message: 'This cannot be undone.' });
  if (!confirmed) return;
  try {
    await itemsService.delete(item.id, item.source_type);
    load({ preserveItems: true });
  } catch (failure) {
    console.error('Error deleting item:', failure);
    notifyError(errorMessage(failure, 'Could not delete the item.'));
  }
};

onMounted(() => {
  load();
  loadCategories();
  loadBoxes();
});

watch(() => props.selectedCategory, (newValue) => {
  filterCategory.value = newValue || '';
  page.value = 1;
  load();
});

watch(filterCategory, () => {
  page.value = 1;
});
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

.category-summary {
  margin-bottom: 2rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1rem;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  color: #334155;
}

.summary-header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.summary-card {
  border: 1px solid #dbeafe;
  background: white;
  color: #0f172a;
  border-radius: 12px;
  padding: 1rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.summary-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
}

.summary-name {
  font-weight: 600;
}

.summary-count {
  font-size: 1.8rem;
  line-height: 1.1;
  color: #1d4ed8;
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

.items-error {
  color: #c0392b;
  padding: 0.75rem;
  background: #fdf0ee;
  border-radius: 4px;
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

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .items-view {
    padding: 1rem;
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
