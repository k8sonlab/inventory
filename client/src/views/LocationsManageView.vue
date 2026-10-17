<template>
  <div class="locations-manage-view">
    <h1>📍 Manage Locations</h1>

    <div class="manage-section">
      <h2>🏭 Shelves/Locations</h2>
      <div class="manage-form">
        <input v-model="newShelf.shelf_code" placeholder="Shelf Code (e.g., S01, T01)" />
        <input v-model="newShelf.location" placeholder="Location/Description" />
        <input v-model="newShelf.notes" placeholder="Notes" />
        <button @click="addShelf" class="btn-primary" :disabled="!newShelf.shelf_code.trim()">Add Shelf</button>
      </div>
      <div class="manage-list">
        <div v-if="shelves.length === 0" class="empty-state">No shelves</div>
        <div v-for="shelf in shelves" :key="shelf.id" class="manage-item">
          <div class="item-content">
            <strong>{{ shelf.shelf_code }}</strong>
            <small>{{ shelf.location }} {{ shelf.notes ? '(' + shelf.notes + ')' : '' }}</small>
          </div>
          <button @click="deleteShelf(shelf.id)" class="btn-icon" title="Delete" :aria-label="`Delete shelf ${shelf.shelf_code}`">🗑️</button>
        </div>
      </div>
    </div>

    <div class="manage-section">
      <h2>📦 Boxes</h2>
      <div class="manage-form">
        <select v-model="newBox.shelf_id" placeholder="Select Shelf" required>
          <option value="">Select Shelf</option>
          <option v-for="shelf in shelves" :key="shelf.id" :value="shelf.id">
            {{ shelf.shelf_code }} - {{ shelf.location }}
          </option>
        </select>
        <input v-model="newBox.box_name" placeholder="Box Name (optional - auto-generated if empty)" />
        <button @click="addBox" class="btn-primary" :disabled="!newBox.shelf_id">Add Box</button>
      </div>
      <p v-if="newBox.shelf_id" class="hint">Auto-generates: <code>{{ nextBoxName }}</code></p>
      
      <div class="filter-section">
        <label>View boxes for:</label>
        <select v-model="filterShelfId">
          <option value="">All Boxes</option>
          <option v-for="shelf in shelves" :key="shelf.id" :value="shelf.id">
            {{ shelf.shelf_code }} - {{ shelf.location }}
          </option>
        </select>
      </div>
      
      <div class="manage-list">
        <div v-if="filteredBoxes.length === 0" class="empty-state">No boxes</div>
        <div v-for="box in filteredBoxes" :key="box.id" class="manage-item">
          <div class="item-content">
            <strong>{{ box.storage_id }}</strong>
            <small>{{ box.box_name }} (Shelf: {{ box.shelf_code }})</small>
          </div>
          <button @click="deleteBox(box)" class="btn-icon" title="Delete" :aria-label="`Delete box ${box.storage_id || box.box_name}`">🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { locationsService } from '../services/api.js';
import { confirmAction, errorMessage, notifyError, notifyInfo } from '../composables/useNotifications.js';

const shelves = ref([]);
const boxes = ref([]);
const filterShelfId = ref('');
const newShelf = ref({ shelf_code: '', location: '', notes: '' });
const newBox = ref({ shelf_id: '', storage_id: '', box_name: '', box_type: '' });

const filteredBoxes = computed(() => {
  if (!filterShelfId.value) return boxes.value;
  return boxes.value.filter(box => box.shelf_id === filterShelfId.value);
});

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
    notifyError(errorMessage(error, 'Could not add the shelf.'));
  }
};

// The API has no shelf deletion yet, so explain that up front instead of asking for a confirmation first
const deleteShelf = (id) => {
  const hasBoxes = boxes.value.some(box => box.shelf_id === id);
  notifyInfo(hasBoxes
    ? 'Cannot delete a shelf that still has boxes. Delete its boxes first.'
    : 'Shelf deletion is not available yet.');
};

const nextBoxName = computed(() => {
  if (!newBox.value.shelf_id) return '';
  const shelf = shelves.value.find(s => s.id === newBox.value.shelf_id);
  if (!shelf) return '';
  const boxesInShelf = boxes.value.filter(b => b.shelf_id === newBox.value.shelf_id);
  const nextNum = (boxesInShelf.length + 1).toString().padStart(2, '0');
  return `${shelf.shelf_code}-B${nextNum}`;
});

const addBox = async () => {
  if (!newBox.value.shelf_id) return;
  try {
    await locationsService.createBox(
      newBox.value.shelf_id,
      null,
      newBox.value.box_name || '',
      newBox.value.box_type || ''
    );
    newBox.value = { shelf_id: '', storage_id: '', box_name: '', box_type: '' };
    loadBoxes();
  } catch (error) {
    console.error('Error adding box:', error);
    notifyError(errorMessage(error, 'Could not add the box.'));
  }
};

const deleteBox = async (box) => {
  const name = box.storage_id || box.box_name || 'this box';
  const confirmed = await confirmAction({ title: `Delete box "${name}"?`, message: 'This cannot be undone.' });
  if (!confirmed) return;
  try {
    await locationsService.deleteBox(box.id);
    loadBoxes();
  } catch (error) {
    console.error('Error deleting box:', error);
    notifyError(errorMessage(error, 'Could not delete the box.'));
  }
};

onMounted(() => {
  loadShelves();
  loadBoxes();
});
</script>

<style scoped>
.locations-manage-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.locations-manage-view h1 {
  margin-bottom: 30px;
  font-size: 28px;
  color: #2c3e50;
}

.manage-section {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.manage-section h2 {
  margin-bottom: 15px;
  font-size: 18px;
  color: #34495e;
  border-bottom: 2px solid #ecf0f1;
  padding-bottom: 10px;
}

.manage-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.manage-form input,
.manage-form select {
  flex: 1;
  min-width: 150px;
  padding: 10px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 14px;
}

.manage-form input:focus,
.manage-form select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.btn-primary {
  background: #3498db;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-primary:disabled {
  background: #95a5a6;
  cursor: not-allowed;
  opacity: 0.6;
}

.hint {
  color: #7f8c8d;
  font-size: 12px;
  margin-bottom: 15px;
}

.hint code {
  background: #ecf0f1;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
  color: #2c3e50;
}

.filter-section {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 20px;
  padding: 12px;
  background: #f9f9f9;
  border: 1px solid #ecf0f1;
  border-radius: 4px;
}

.filter-section label {
  font-size: 14px;
  font-weight: 500;
  color: #34495e;
  white-space: nowrap;
}

.filter-section select {
  flex: 1;
  min-width: 200px;
  padding: 8px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 14px;
}

.filter-section select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.manage-list {
  margin-top: 15px;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #95a5a6;
  font-style: italic;
}

.manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ecf0f1;
  border-radius: 4px;
  margin-bottom: 8px;
  background: #f9f9f9;
  transition: background 0.2s;
}

.manage-item:hover {
  background: #f5f5f5;
}

.item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.item-content strong {
  color: #2c3e50;
  font-size: 16px;
}

.item-content small {
  color: #7f8c8d;
  font-size: 12px;
  margin-top: 4px;
}

.btn-danger {
  background: #e74c3c;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.btn-danger:hover {
  background: #c0392b;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}
</style>
