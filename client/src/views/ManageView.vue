<template>
  <div class="manage-view">
    <div class="manage-section">
      <h2>� Parameter Options</h2>
      <div class="manage-form">
        <select v-model="selectedEnumType" placeholder="Select parameter type">
          <option value="">-- Select Parameter Type --</option>
          <option value="screw_head_type">Screw Head Type</option>
          <option value="screw_drive_type">Screw Drive Type</option>
          <option value="screw_thread_type">Screw Thread Type</option>
          <option value="nut_type">Nut Type</option>
          <option value="nut_color">Nut Color</option>
          <option value="bearing_sealing_type">Bearing Sealing Type</option>
          <option value="rc_company">RC Company</option>
          <option value="rc_model">RC Model</option>
          <option value="oil_paste_company">Oil/Paste Company</option>
          <option value="oil_paste_type">Oil/Paste Type</option>
          <option value="battery_type">Battery Type</option>
          <option value="other_item_type">Other Item Type</option>
        </select>
        <input v-model="newEnumValue" placeholder="New option value" />
        <button @click="addEnumValue" class="btn-primary" :disabled="!selectedEnumType || !newEnumValue">Add Option</button>
      </div>
      <div v-if="selectedEnumType" class="manage-list">
        <div v-if="enumValuesList.length === 0" class="empty-state">No options for this type</div>
        <div v-for="value in enumValuesList" :key="value" class="manage-item">
          <span>{{ value }}</span>
          <button @click="deleteEnumValue(value)" class="btn-danger btn-small">Delete</button>
        </div>
      </div>
    </div>

    <div class="manage-section">
      <h2>�📚 Shelves</h2>
      <div class="manage-form">
        <input v-model="newShelf.shelf_code" placeholder="Shelf Code (e.g., S01, T21)" />
        <input v-model="newShelf.location" placeholder="Location (e.g., Brown Kallax)" />
        <input v-model="newShelf.notes" placeholder="Notes" />
        <button @click="addShelf" class="btn-primary">Add Shelf</button>
      </div>
      <div class="manage-list">
        <div v-if="shelves.length === 0" class="empty-state">No shelves</div>
        <div v-for="shelf in shelves" :key="shelf.id" class="manage-item">
          <div class="item-content">
            <strong>{{ shelf.shelf_code }}</strong>
            <small>{{ shelf.location }}</small>
            <span v-if="shelf.notes" class="note">{{ shelf.notes }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="manage-section">
      <h2>📦 Boxes</h2>
      <div class="manage-form">
        <select v-model="newBox.shelf_id" placeholder="Select Shelf">
          <option value="">Select Shelf</option>
          <option v-for="shelf in shelves" :key="shelf.id" :value="shelf.id">
            {{ shelf.shelf_code }} - {{ shelf.location }}
          </option>
        </select>
        <input v-model="newBox.storage_id" placeholder="Storage ID (e.g., S01-B01)" />
        <input v-model="newBox.box_name" placeholder="Box Name" />
        <button @click="addBox" class="btn-primary">Add Box</button>
      </div>
      <div class="manage-list">
        <div v-if="boxes.length === 0" class="empty-state">No boxes</div>
        <div v-for="box in boxes" :key="box.id" class="manage-item">
          <div class="item-content">
            <strong>{{ box.storage_id }}</strong>
            <small>{{ box.box_name }} (Shelf: {{ box.shelf_code }})</small>
          </div>
          <button @click="deleteBox(box.id)" class="btn-danger btn-small">Delete</button>
        </div>
      </div>
    </div>

    <div class="manage-section">
      <h2>📂 Categories</h2>
      <div class="manage-form">
        <input v-model="newCategory" placeholder="Category name" />
        <button @click="addCategory" class="btn-primary">Add Category</button>
      </div>
      <div class="manage-list">
        <div v-if="categories.length === 0" class="empty-state">No categories</div>
        <div v-for="cat in categories" :key="cat.id" class="manage-item">
          <span>{{ cat.name }}</span>
          <button @click="deleteCategory(cat.id)" class="btn-danger btn-small">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { categoriesService, locationsService, enumsService } from '../services/api.js';

export default {
  setup() {
    const categories = ref([]);
    const shelves = ref([]);
    const boxes = ref([]);
    const newCategory = ref('');
    const newShelf = ref({ shelf_code: '', location: '', notes: '' });
    const newBox = ref({ shelf_id: '', storage_id: '', box_name: '', box_type: '' });
    const selectedEnumType = ref('');
    const newEnumValue = ref('');
    const enumValuesList = ref([]);

    const loadCategories = async () => {
      try {
        const response = await categoriesService.getAll();
        categories.value = response.data || [];
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    const loadShelves = async () => {
      try {
        const response = await locationsService.getShelves();
        shelves.value = response.data || [];
      } catch (error) {
        console.error('Error loading shelves:', error);
      }
    };

    const loadBoxes = async () => {
      try {
        const response = await locationsService.getBoxes();
        boxes.value = response.data || [];
      } catch (error) {
        console.error('Error loading boxes:', error);
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
        alert('Error adding category: ' + error.message);
      }
    };

    const deleteCategory = async (id) => {
      if (confirm('Delete this category?')) {
        try {
          await categoriesService.delete(id);
          loadCategories();
        } catch (error) {
          console.error('Error deleting category:', error);
          alert('Error deleting category: ' + error.message);
        }
      }
    };

    const addShelf = async () => {
      if (!newShelf.value.shelf_code.trim() || !newShelf.value.location.trim()) return;
      try {
        await locationsService.createShelf(
          newShelf.value.shelf_code,
          newShelf.value.location,
          newShelf.value.notes
        );
        newShelf.value = { shelf_code: '', location: '', notes: '' };
        loadShelves();
      } catch (error) {
        console.error('Error adding shelf:', error);
        alert('Error adding shelf: ' + error.message);
      }
    };

    const addBox = async () => {
      if (!newBox.value.shelf_id || !newBox.value.storage_id.trim() || !newBox.value.box_name.trim()) return;
      try {
        await locationsService.createBox(
          newBox.value.shelf_id,
          newBox.value.storage_id,
          newBox.value.box_name,
          newBox.value.box_type
        );
        newBox.value = { shelf_id: '', storage_id: '', box_name: '', box_type: '' };
        loadBoxes();
      } catch (error) {
        console.error('Error adding box:', error);
        alert('Error adding box: ' + error.message);
      }
    };

    const deleteBox = async (id) => {
      if (confirm('Delete this box?')) {
        try {
          await locationsService.deleteBox(id);
          loadBoxes();
        } catch (error) {
          console.error('Error deleting box:', error);
          alert('Error deleting box: ' + error.message);
        }
      }
    };

    const loadEnumValues = async () => {
      if (selectedEnumType.value) {
        try {
          const response = await enumsService.getValues(selectedEnumType.value);
          enumValuesList.value = response.data || [];
        } catch (error) {
          console.error('Error loading enum values:', error);
        }
      }
    };

    const addEnumValue = async () => {
      if (!selectedEnumType.value || !newEnumValue.value.trim()) return;
      try {
        await enumsService.createValue(selectedEnumType.value, newEnumValue.value);
        newEnumValue.value = '';
        loadEnumValues();
      } catch (error) {
        console.error('Error adding enum value:', error);
        alert('Error adding option: ' + error.message);
      }
    };

    const deleteEnumValue = async (value) => {
      if (confirm('Delete this option?')) {
        try {
          await enumsService.deleteValue(selectedEnumType.value, value);
          loadEnumValues();
        } catch (error) {
          console.error('Error deleting enum value:', error);
          alert('Error deleting option: ' + error.message);
        }
      }
    };

    watch(() => selectedEnumType.value, () => {
      loadEnumValues();
    });

    onMounted(() => {
      loadCategories();
      loadShelves();
      loadBoxes();
    });

    return {
      categories,
      shelves,
      boxes,
      newCategory,
      newShelf,
      newBox,
      selectedEnumType,
      newEnumValue,
      enumValuesList,
      addCategory,
      deleteCategory,
      addShelf,
      addBox,
      deleteBox,
      addEnumValue,
      deleteEnumValue
    };
  }
};
</script>

<style scoped>
.manage-view {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
}

.manage-section {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.manage-section h2 {
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.manage-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.manage-form input,
.manage-form select {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
}

.manage-form input:focus,
.manage-form select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.manage-form .btn-primary {
  padding: 0.75rem;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s;
}

.manage-form .btn-primary:hover {
  background: #229954;
}

.manage-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #3498db;
  gap: 1rem;
}

.item-content {
  flex: 1;
}

.manage-item strong {
  display: block;
  color: #2c3e50;
  font-weight: 600;
}

.manage-item small {
  display: block;
  color: #7f8c8d;
  font-size: 0.85rem;
  margin: 0.25rem 0;
}

.manage-item .note {
  display: block;
  color: #666;
  font-size: 0.85rem;
  font-style: italic;
  margin-top: 0.25rem;
}

.btn-danger {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.3s;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
  font-style: italic;
}

@media (max-width: 768px) {
  .manage-view {
    grid-template-columns: 1fr;
  }

  .manage-form {
    gap: 0.5rem;
  }
}
</style>
