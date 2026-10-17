import { createRouter, createWebHashHistory } from 'vue-router';
import ItemsView from './views/ItemsView.vue';
import LocationsManageView from './views/LocationsManageView.vue';
import ManageView from './views/ManageView.vue';

// Hash URLs keep the existing links working: #/items, #/items/<category-slug>, #/locations, #/manage
export const routes = [
  { path: '/', redirect: '/items' },
  { path: '/items/:category?', name: 'items', component: ItemsView },
  { path: '/locations', name: 'locations', component: LocationsManageView },
  { path: '/manage', name: 'manage', component: ManageView },
  { path: '/:pathMatch(.*)*', redirect: '/items' }
];

export function createAppRouter(history = createWebHashHistory()) {
  return createRouter({ history, routes });
}
