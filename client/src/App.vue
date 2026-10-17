<template>
  <div class="inventory-app">
    <header>
      <div class="header-row">
        <h1>📦 Inventory Manager</h1>
        <span class="app-version">{{ appVersion }}</span>
      </div>
      <nav aria-label="Main">
        <router-link to="/items" exact-active-class="active">Items</router-link>
        <router-link
          v-for="cat in categories"
          :key="cat.id"
          :to="categoryRoute(cat)"
          class="category-link"
          exact-active-class="active"
        >{{ cat.name }}</router-link>
        <router-link :to="{ name: 'locations' }" exact-active-class="active">Manage Locations</router-link>
        <router-link :to="{ name: 'manage' }" exact-active-class="active">Manage</router-link>
      </nav>
    </header>

    <main v-if="ready">
      <router-view v-slot="{ Component, route: current }">
        <component
          :is="Component"
          v-bind="current.name === 'items' ? { selectedCategory, onSelectCategory: openCategory } : {}"
        />
      </router-view>
    </main>

    <NotificationHost />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NotificationHost from './components/NotificationHost.vue';
import { categoriesService } from './services/api.js';

const buildVersion = import.meta.env.VITE_APP_VERSION || 'dev';
const appVersion = /^\d+\.\d+\.\d+/.test(buildVersion) ? `v${buildVersion}` : buildVersion;

const route = useRoute();
const router = useRouter();
const categories = ref([]);
// The first view waits for the categories so a #/items/<slug> link loads its items once
const ready = ref(false);

const slugify = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
const categoryRoute = (category) => ({ name: 'items', params: { category: slugify(category.name) } });

const selectedCategory = computed(() => {
  const slug = route.params.category;
  if (!slug) return null;
  return categories.value.find((cat) => slugify(cat.name) === slug)?.id ?? null;
});

const openCategory = (categoryId) => {
  const category = categories.value.find((cat) => cat.id === categoryId);
  if (category) router.push(categoryRoute(category));
};

onMounted(async () => {
  try {
    const response = await categoriesService.getAll();
    categories.value = response.data || [];
  } catch (error) {
    console.error('Error loading categories:', error);
  } finally {
    ready.value = true;
  }
});
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

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

header h1 {
  margin: 0 0 1rem 0;
  font-size: 1.8rem;
}

.app-version {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ecf0f1;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

nav a {
  display: inline-block;
  background: #34495e;
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  margin-right: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
  font-size: 0.9rem;
}

nav a.category-link {
  background: #7f8c8d;
  font-size: 0.85rem;
  padding: 0.4rem 0.8rem;
}

nav a:hover {
  background: #1a252f;
}

nav a.category-link:hover {
  background: #5a6b70;
}

nav a.active {
  background: #3498db;
}

main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s, transform 0.1s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
}

.btn-icon:hover {
  background: #ddd;
  transform: scale(1.1);
}

.btn-icon:active {
  transform: scale(0.95);
}
</style>
