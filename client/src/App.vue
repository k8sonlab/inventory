<template>
  <div class="inventory-app">
    <header>
      <h1>📦 Inventory Manager</h1>
      <nav>
        <button @click="navigateTo('items')" :class="{ active: currentView === 'items' && selectedCategory === null }">Items</button>
        <button v-for="cat in categories" :key="cat.id" @click="navigateTo('items', cat.id)" :class="{ active: currentView === 'items' && selectedCategory === cat.id }" class="category-btn">
          {{ cat.name }}
        </button>
        <button @click="navigateTo('manage')" :class="{ active: currentView === 'manage' }">Manage</button>
      </nav>
    </header>

    <main>
      <ItemsView v-if="currentView === 'items'" :selectedCategory="selectedCategory" />
      <ManageView v-if="currentView === 'manage'" />
    </main>
  </div>
</template>

<script>
import ItemsView from './views/ItemsView.vue';
import ManageView from './views/ManageView.vue';
import { ref, onMounted } from 'vue';
import { categoriesService } from './services/api.js';

export default {
  components: {
    ItemsView,
    ManageView
  },
  setup() {
    const currentView = ref('items');
    const categories = ref([]);
    const selectedCategory = ref(null);
    
    const nameToSlug = (name) => {
      return name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    };
    
    const getCategoryIdBySlug = (slug) => {
      const cat = categories.value.find(c => nameToSlug(c.name) === slug);
      return cat ? cat.id : null;
    };
    
    const getCategorySlugById = (id) => {
      const cat = categories.value.find(c => c.id === id);
      return cat ? nameToSlug(cat.name) : null;
    };
    
    const parseHash = () => {
      const hash = window.location.hash.slice(1); // Remove #
      if (!hash) return { view: 'items', categoryId: null };
      
      if (hash.startsWith('manage')) {
        return { view: 'manage', categoryId: null };
      } else if (hash.startsWith('items/')) {
        const slug = hash.split('/')[1];
        const categoryId = getCategoryIdBySlug(slug);
        return { view: 'items', categoryId };
      } else if (hash === 'items') {
        return { view: 'items', categoryId: null };
      }
      return { view: 'items', categoryId: null };
    };
    
    const navigateTo = (view, categoryId = null) => {
      currentView.value = view;
      selectedCategory.value = categoryId;
      
      if (view === 'manage') {
        window.location.hash = '#/manage';
      } else if (categoryId) {
        const slug = getCategorySlugById(categoryId);
        if (slug) {
          window.location.hash = `#/items/${slug}`;
        }
      } else {
        window.location.hash = '#/items';
      }
    };
    
    const handleHashChange = () => {
      const { view, categoryId } = parseHash();
      currentView.value = view;
      selectedCategory.value = categoryId;
    };
    
    const loadCategories = async () => {
      try {
        const response = await categoriesService.getAll();
        categories.value = response.data || [];
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    
    onMounted(() => {
      loadCategories();
      
      // Set initial state from URL after categories load
      setTimeout(() => {
        const { view, categoryId } = parseHash();
        currentView.value = view;
        selectedCategory.value = categoryId;
      }, 100);
      
      // Listen for hash changes (back/forward buttons)
      window.addEventListener('hashchange', handleHashChange);
      
      // Set initial hash if none exists
      if (!window.location.hash) {
        window.location.hash = '#/items';
      }
    });
    
    return {
      currentView,
      categories,
      selectedCategory,
      navigateTo
    };
  }
};
</script>

<style scoped>
.inventory-app {
  min-height: 100vh;
  background: #f5f5f5;
}

header {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

header h1 {
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
}

nav button {
  background: #34495e;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  margin-right: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 0.9rem;
}

nav button.category-btn {
  background: #7f8c8d;
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
}

nav button:hover {
  background: #1a252f;
}

nav button.category-btn:hover {
  background: #5a6b70;
}

nav button.active {
  background: #3498db;
}

main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
