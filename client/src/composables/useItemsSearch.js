import { onBeforeUnmount, ref, watch } from 'vue';
import { itemsService } from '../services/api.js';

const SEARCH_DELAY_MS = 350;

// Loads the item list for a category and search text.
// Typing waits until the user pauses before asking the server, and an answer to an out-of-date request is ignored.
export function useItemsSearch(categoryId, { onQueryChange } = {}) {
  const items = ref([]);
  const loading = ref(false);
  const error = ref('');
  const query = ref('');
  let latestRequest = 0;
  let timer;

  const cancelPendingSearch = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const load = async ({ preserveItems = false } = {}) => {
    cancelPendingSearch();
    const request = ++latestRequest;
    error.value = '';
    loading.value = true;
    if (!preserveItems) items.value = [];
    try {
      const response = await itemsService.getAll({ search: query.value, category_id: categoryId.value });
      if (request !== latestRequest) return;
      items.value = response.data || [];
    } catch (failure) {
      if (request !== latestRequest) return;
      console.error('Error loading items:', failure);
      items.value = [];
      error.value = failure.response?.data?.error || 'Could not load items. Try changing the search or selecting the category again.';
    } finally {
      if (request === latestRequest) loading.value = false;
    }
  };

  // Enter searches straight away
  const searchNow = () => load({ preserveItems: true });

  // A new search text makes any request still in flight out of date; it runs synchronously so Enter cannot race it
  watch(query, () => {
    onQueryChange?.();
    cancelPendingSearch();
    ++latestRequest;
    loading.value = false;
    timer = setTimeout(() => load({ preserveItems: true }), SEARCH_DELAY_MS);
  }, { flush: 'sync' });

  onBeforeUnmount(() => {
    cancelPendingSearch();
    ++latestRequest;
  });

  return { items, loading, error, query, load, searchNow };
}
