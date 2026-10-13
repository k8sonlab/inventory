<template>
  <div class="manage-view">
    <div class="manage-section manage-section--rc">      <h2>🏎️ RC Parts Fields</h2>
      <div class="manage-form">
        <select v-model="selectedRCFieldType" placeholder="Select RC field">
          <option value="">-- Select RC Field --</option>
          <option value="rc_company">RC Company</option>
          <option value="rc_model">RC Model</option>
        </select>
        <input v-model="newRCFieldValue" placeholder="New value" />
        <button @click="addRCFieldValue" class="btn-primary" :disabled="!selectedRCFieldType || !newRCFieldValue">Add Value</button>
      </div>
      <div v-if="selectedRCFieldType" class="manage-list">
        <div v-if="rcFieldValuesList.length === 0" class="empty-state">No values for this field</div>
        <div v-for="value in rcFieldValuesList" :key="value" class="manage-item">
          <span>{{ value }}</span>
          <button @click="deleteRCFieldValue(value)" class="btn-icon" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
    <div class="manage-section manage-section--screw">
      <h2>🔩 Screw Fields</h2>
      <div class="manage-form">
        <select v-model="selectedScrewFieldType" placeholder="Select screw field">
          <option value="">-- Select Screw Field --</option>
          <option value="screw_size">Size</option>
          <option value="screw_head_type">Head Type</option>
          <option value="screw_drive_type">Drive Type</option>
          <option value="screw_thread_type">Thread Type</option>
          <option value="screw_color">Color</option>
          <option value="screw_material">Material</option>
        </select>
        <input v-model="newScrewFieldValue" placeholder="New value" />
        <button @click="addScrewFieldValue" class="btn-primary" :disabled="!selectedScrewFieldType || !newScrewFieldValue">Add Value</button>
      </div>
      <div v-if="selectedScrewFieldType" class="manage-list">
        <div v-if="screwFieldValuesList.length === 0" class="empty-state">No values for this field</div>
        <div v-for="value in screwFieldValuesList" :key="value" class="manage-item">
          <span>{{ value }}</span>
          <button @click="deleteScrewFieldValue(value)" class="btn-icon" title="Delete">🗑️</button>
        </div>
      </div>
    </div>    <div class="manage-section manage-section--nut">
      <h2>⚙️ Nut Fields</h2>
      <div class="manage-form">
        <select v-model="selectedNutFieldType" placeholder="Select nut field">
          <option value="">-- Select Nut Field --</option>
          <option value="nut_size">Size</option>
          <option value="nut_type">Type</option>
          <option value="nut_color">Color</option>
        </select>
        <input v-model="newNutFieldValue" placeholder="New value" />
        <button @click="addNutFieldValue" class="btn-primary" :disabled="!selectedNutFieldType || !newNutFieldValue">Add Value</button>
      </div>
      <div v-if="selectedNutFieldType" class="manage-list">
        <div v-if="nutFieldValuesList.length === 0" class="empty-state">No values for this field</div>
        <div v-for="value in nutFieldValuesList" :key="value" class="manage-item">
          <span>{{ value }}</span>
          <button @click="deleteNutFieldValue(value)" class="btn-icon" title="Delete">🗑️</button>
        </div>
      </div>    </div>    <div class="manage-section manage-section--bearing">
      <h2>🔄 Bearing Fields</h2>
      <div class="manage-form">
        <select v-model="selectedBearingFieldType" placeholder="Select bearing field">
          <option value="">-- Select Bearing Field --</option>
          <option value="bearing_type">Type</option>
          <option value="bearing_seal_type">Seal Type</option>
        </select>
        <input v-model="newBearingFieldValue" placeholder="New value" />
        <button @click="addBearingFieldValue" class="btn-primary" :disabled="!selectedBearingFieldType || !newBearingFieldValue">Add Value</button>
      </div>
      <div v-if="selectedBearingFieldType" class="manage-list">
        <div v-if="bearingFieldValuesList.length === 0" class="empty-state">No values for this field</div>
        <div v-for="value in bearingFieldValuesList" :key="value" class="manage-item">
          <span>{{ value }}</span>
          <button @click="deleteBearingFieldValue(value)" class="btn-icon" title="Delete">🗑️</button>
        </div>      </div>    </div>

    <div class="manage-section manage-section--battery">
      <h2>🔋 Battery Fields</h2>
      <div class="manage-form">
        <select v-model="selectedBatteryFieldType" placeholder="Select battery field">
          <option value="">-- Select Battery Field --</option>
          <option value="battery_size">Size</option>
          <option value="battery_company">Company</option>
          <option value="battery_model">Model</option>
          <option value="battery_type">Type</option>
        </select>
        <input v-model="newBatteryFieldValue" placeholder="New value" />
        <button @click="addBatteryFieldValue" class="btn-primary" :disabled="!selectedBatteryFieldType || !newBatteryFieldValue">Add Value</button>
      </div>
      <div v-if="selectedBatteryFieldType" class="manage-list">
        <div v-if="batteryFieldValuesList.length === 0" class="empty-state">No values for this field</div>
        <div v-for="value in batteryFieldValuesList" :key="value" class="manage-item">
          <span>{{ value }}</span>
          <button @click="deleteBatteryFieldValue(value)" class="btn-icon" title="Delete">🗑️</button>
        </div>      </div>    </div>    <div class="manage-section">      <h2>� Parameter Options</h2>
      <div class="manage-form">
        <select v-model="selectedEnumType" placeholder="Select parameter type">
          <option value="">-- Select Parameter Type --</option>
          <option value="screw_head_type">Screw Head Type</option>
          <option value="screw_drive_type">Screw Drive Type</option>
          <option value="screw_thread_type">Screw Thread Type</option>
          <option value="nut_type">Nut Type</option>
          <option value="nut_color">Nut Color</option>
          <option value="bearing_sealing_type">Bearing Sealing Type</option>
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
          <button @click="deleteEnumValue(value)" class="btn-icon" title="Delete">🗑️</button>
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
          <button @click="deleteCategory(cat.id)" class="btn-icon" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { categoriesService, enumsService } from '../services/api.js';

export default {
  setup() {
    const categories = ref([]);
    const newCategory = ref('');
    const selectedEnumType = ref('');
    const newEnumValue = ref('');
    const enumValuesList = ref([]);
    const selectedRCFieldType = ref('');
    const newRCFieldValue = ref('');
    const rcFieldValuesList = ref([]);
    const selectedScrewFieldType = ref('');
    const newScrewFieldValue = ref('');
    const screwFieldValuesList = ref([]);

    const selectedNutFieldType = ref('');
    const newNutFieldValue = ref('');
    const nutFieldValuesList = ref([]);

    const selectedBearingFieldType = ref('');
    const newBearingFieldValue = ref('');
    const bearingFieldValuesList = ref([]);

    const selectedBatteryFieldType = ref('');
    const newBatteryFieldValue = ref('');
    const batteryFieldValuesList = ref([]);

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

    const loadRCFieldValues = async () => {
      if (selectedRCFieldType.value) {
        try {
          const response = await enumsService.getValues(selectedRCFieldType.value);
          rcFieldValuesList.value = response.data || [];
        } catch (error) {
          console.error('Error loading RC field values:', error);
        }
      }
    };

    const addRCFieldValue = async () => {
      if (!selectedRCFieldType.value || !newRCFieldValue.value.trim()) return;
      try {
        await enumsService.createValue(selectedRCFieldType.value, newRCFieldValue.value);
        newRCFieldValue.value = '';
        loadRCFieldValues();
      } catch (error) {
        console.error('Error adding RC field value:', error);
        alert('Error adding value: ' + error.message);
      }
    };

    const deleteRCFieldValue = async (value) => {
      if (confirm('Delete this value?')) {
        try {
          await enumsService.deleteValue(selectedRCFieldType.value, value);
          loadRCFieldValues();
        } catch (error) {
          console.error('Error deleting RC field value:', error);
          alert('Error deleting value: ' + error.message);
        }
      }
    };

    watch(() => selectedEnumType.value, () => {
      loadEnumValues();
    });

    watch(() => selectedRCFieldType.value, () => {
      loadRCFieldValues();
    });

    watch(() => selectedScrewFieldType.value, () => {
      loadScrewFieldValues();
    });

    watch(() => selectedNutFieldType.value, () => {
      loadNutFieldValues();
    });

    const loadScrewFieldValues = async () => {
      if (selectedScrewFieldType.value) {
        try {
          const response = await enumsService.getValues(selectedScrewFieldType.value);
          screwFieldValuesList.value = response.data || [];
        } catch (error) {
          console.error('Error loading screw field values:', error);
        }
      }
    };

    const loadNutFieldValues = async () => {
      if (selectedNutFieldType.value) {
        try {
          const response = await enumsService.getValues(selectedNutFieldType.value);
          nutFieldValuesList.value = response.data || [];
        } catch (error) {
          console.error('Error loading nut field values:', error);
        }
      }
    };

    const addScrewFieldValue = async () => {
      if (!selectedScrewFieldType.value || !newScrewFieldValue.value.trim()) return;
      try {
        await enumsService.createValue(selectedScrewFieldType.value, newScrewFieldValue.value);
        newScrewFieldValue.value = '';
        loadScrewFieldValues();
      } catch (error) {
        console.error('Error adding screw field value:', error);
        alert('Error adding value: ' + error.message);
      }
    };

    const addNutFieldValue = async () => {
      if (!selectedNutFieldType.value || !newNutFieldValue.value.trim()) return;
      try {
        await enumsService.createValue(selectedNutFieldType.value, newNutFieldValue.value);
        newNutFieldValue.value = '';
        loadNutFieldValues();
      } catch (error) {
        console.error('Error adding nut field value:', error);
        alert('Error adding value: ' + error.message);
      }
    };

    const deleteScrewFieldValue = async (value) => {
      if (confirm('Delete this value?')) {
        try {
          await enumsService.deleteValue(selectedScrewFieldType.value, value);
          loadScrewFieldValues();
        } catch (error) {
          console.error('Error deleting screw field value:', error);
          alert('Error deleting value: ' + error.message);
        }
      }
    };

    const deleteNutFieldValue = async (value) => {
      if (confirm('Delete this value?')) {
        try {
          await enumsService.deleteValue(selectedNutFieldType.value, value);
          loadNutFieldValues();
        } catch (error) {
          console.error('Error deleting nut field value:', error);
          alert('Error deleting value: ' + error.message);
        }
      }
    };

    watch(() => selectedBearingFieldType.value, () => {
      loadBearingFieldValues();
    });

    const loadBearingFieldValues = async () => {
      if (selectedBearingFieldType.value) {
        try {
          const response = await enumsService.getValues(selectedBearingFieldType.value);
          bearingFieldValuesList.value = response.data || [];
        } catch (error) {
          console.error('Error loading bearing field values:', error);
        }
      }
    };

    const addBearingFieldValue = async () => {
      if (!selectedBearingFieldType.value || !newBearingFieldValue.value.trim()) return;
      try {
        await enumsService.createValue(selectedBearingFieldType.value, newBearingFieldValue.value);
        newBearingFieldValue.value = '';
        loadBearingFieldValues();
      } catch (error) {
        console.error('Error adding bearing field value:', error);
        alert('Error adding value: ' + error.message);
      }
    };

    const deleteBearingFieldValue = async (value) => {
      if (confirm('Delete this value?')) {
        try {
          await enumsService.deleteValue(selectedBearingFieldType.value, value);
          loadBearingFieldValues();
        } catch (error) {
          console.error('Error deleting bearing field value:', error);
          alert('Error deleting value: ' + error.message);
        }
      }
    };

    watch(() => selectedBatteryFieldType.value, () => {
      loadBatteryFieldValues();
    });

    const loadBatteryFieldValues = async () => {
      if (selectedBatteryFieldType.value) {
        try {
          const response = await enumsService.getValues(selectedBatteryFieldType.value);
          batteryFieldValuesList.value = response.data || [];
        } catch (error) {
          console.error('Error loading battery field values:', error);
        }
      }
    };

    const addBatteryFieldValue = async () => {
      if (!selectedBatteryFieldType.value || !newBatteryFieldValue.value.trim()) return;
      try {
        await enumsService.createValue(selectedBatteryFieldType.value, newBatteryFieldValue.value);
        newBatteryFieldValue.value = '';
        loadBatteryFieldValues();
      } catch (error) {
        console.error('Error adding battery field value:', error);
        alert('Error adding value: ' + error.message);
      }
    };

    const deleteBatteryFieldValue = async (value) => {
      if (confirm('Delete this value?')) {
        try {
          await enumsService.deleteValue(selectedBatteryFieldType.value, value);
          loadBatteryFieldValues();
        } catch (error) {
          console.error('Error deleting battery field value:', error);
          alert('Error deleting value: ' + error.message);
        }
      }
    };

    onMounted(() => {
      loadCategories();
    });

    return {
      categories,
      newCategory,
      selectedEnumType,
      newEnumValue,
      enumValuesList,
      selectedRCFieldType,
      newRCFieldValue,
      rcFieldValuesList,
      selectedScrewFieldType,
      newScrewFieldValue,
      screwFieldValuesList,
      selectedNutFieldType,
      newNutFieldValue,
      nutFieldValuesList,
      selectedBearingFieldType,
      newBearingFieldValue,
      bearingFieldValuesList,
      selectedBatteryFieldType,
      newBatteryFieldValue,
      batteryFieldValuesList,
      addCategory,
      deleteCategory,
      addEnumValue,
      deleteEnumValue,
      addRCFieldValue,
      deleteRCFieldValue,
      addScrewFieldValue,
      deleteScrewFieldValue,
      loadNutFieldValues,
      addNutFieldValue,
      deleteNutFieldValue,
      loadBearingFieldValues,
      addBearingFieldValue,
      deleteBearingFieldValue,
      loadBatteryFieldValues,
      addBatteryFieldValue,
      deleteBatteryFieldValue
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

.manage-section--rc {
  background: #e3f2fd !important;
  border-left: 5px solid #1976d2 !important;
}

.manage-section--screw {
  background: #fff3e0 !important;
  border-left: 5px solid #f57c00 !important;
}

.manage-section--nut {
  background: #e8f5e9 !important;
  border-left: 5px solid #388e3c !important;
}

.manage-section--bearing {
  background: #f3e5f5 !important;
  border-left: 5px solid #7b1fa2 !important;
}

.manage-section--battery {
  background: #fff9e6 !important;
  border-left: 5px solid #fbc02d !important;
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
