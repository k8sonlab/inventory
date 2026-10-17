import axios from 'axios';

// Use environment variable if available, fallback to relative path for dev
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const itemsService = {
  getAll(filters = {}) {
    return api.get('/items', { params: filters });
  },
  getById(id) {
    return api.get(`/items/${id}`);
  },
  create(item) {
    return api.post('/items', item);
  },
  update(id, item) {
    return api.put(`/items/${id}`, item);
  },
  updateQuantity(id, source_type, quantity, expected_quantity) {
    return api.patch(`/items/${id}/quantity`, { source_type, quantity, expected_quantity });
  },
  delete(id, sourceType) {
    return api.delete(`/items/${id}`, { params: { source_type: sourceType } });
  }
};

export const categoriesService = {
  getAll() {
    return api.get('/categories');
  },
  create(name) {
    return api.post('/categories', { name });
  },
  delete(id) {
    return api.delete(`/categories/${id}`);
  }
};

export const locationsService = {
  getShelves() {
    return api.get('/locations/shelves');
  },
  createShelf(shelf_code, location, notes = '') {
    return api.post('/locations/shelves', { shelf_code, location, notes });
  },
  getBoxes() {
    return api.get('/locations/boxes');
  },
  getBoxesByShelf(shelf_id) {
    return api.get(`/locations/boxes/shelf/${shelf_id}`);
  },
  createBox(shelf_id, storage_id = null, box_name = '', box_type = '') {
    return api.post('/locations/boxes', { shelf_id, storage_id, box_name, box_type });
  },
  deleteBox(id) {
    return api.delete(`/locations/boxes/${id}`);
  }
};

export const enumsService = {
  getTypes() {
    return api.get('/enums/types');
  },
  getValues(enum_type) {
    return api.get(`/enums/type/${enum_type}`);
  },
  createValue(enum_type, value) {
    return api.post(`/enums/type/${enum_type}/value`, { value });
  },
  deleteValue(enum_type, value) {
    return api.delete(`/enums/type/${enum_type}/value/${value}`);
  }
};
