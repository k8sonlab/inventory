<template>
  <div class="items-view">
    <div class="search-bar">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Search items..."
        @input="handleSearch"
      />
      <select v-model="filterCategory" @change="handleFilter">
        <option value="">All Categories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
          {{ cat.name }}
        </option>
      </select>
      <button @click="showAddModal = true" class="btn-primary">+ Add Item</button>
    </div>

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
      <table class="items-table">
        <thead>
          <tr>
            <th v-if="filterCategory && isCurrentCategoryScrews()" @click="handleSort('size')" class="sortable" :class="{ active: sortBy === 'size' }">
              Size {{ sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryScrews()" @click="handleSort('length')" class="sortable" :class="{ active: sortBy === 'length' }">
              Length {{ sortBy === 'length' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryScrews()" @click="handleSort('head_type')" class="sortable" :class="{ active: sortBy === 'head_type' }">
              Head Type {{ sortBy === 'head_type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryScrews()" @click="handleSort('drive_type')" class="sortable" :class="{ active: sortBy === 'drive_type' }">
              Drive Type {{ sortBy === 'drive_type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryScrews()" @click="handleSort('thread_type')" class="sortable" :class="{ active: sortBy === 'thread_type' }">
              Thread Type {{ sortBy === 'thread_type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryScrews()" @click="handleSort('color')" class="sortable" :class="{ active: sortBy === 'color' }">
              Color {{ sortBy === 'color' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryScrews()" @click="handleSort('material')" class="sortable" :class="{ active: sortBy === 'material' }">
              Material {{ sortBy === 'material' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryNuts()" @click="handleSort('size')" class="sortable" :class="{ active: sortBy === 'size' }">
              Size {{ sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryNuts()" @click="handleSort('type')" class="sortable" :class="{ active: sortBy === 'type' }">
              Type {{ sortBy === 'type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryNuts()" @click="handleSort('color')" class="sortable" :class="{ active: sortBy === 'color' }">
              Color {{ sortBy === 'color' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryNuts()" @click="handleSort('has_washer')" class="sortable" :class="{ active: sortBy === 'has_washer' }">
              Has Washer {{ sortBy === 'has_washer' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBearings()" @click="handleSort('type')" class="sortable" :class="{ active: sortBy === 'type' }">
              Type {{ sortBy === 'type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBearings()" @click="handleSort('seal_type')" class="sortable" :class="{ active: sortBy === 'seal_type' }">
              Seal Type {{ sortBy === 'seal_type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBearings()" @click="handleSort('id_inner')" class="sortable" :class="{ active: sortBy === 'id_inner' }">
              ID (Inner) {{ sortBy === 'id_inner' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBearings()" @click="handleSort('od')" class="sortable" :class="{ active: sortBy === 'od' }">
              OD {{ sortBy === 'od' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBearings()" @click="handleSort('width')" class="sortable" :class="{ active: sortBy === 'width' }">
              Width {{ sortBy === 'width' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBearings()" @click="handleSort('flanged')" class="sortable" :class="{ active: sortBy === 'flanged' }">
              Flanged {{ sortBy === 'flanged' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryOilPastes()" @click="handleSort('company')" class="sortable" :class="{ active: sortBy === 'company' }">
              Company {{ sortBy === 'company' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryOilPastes()" @click="handleSort('type')" class="sortable" :class="{ active: sortBy === 'type' }">
              Type {{ sortBy === 'type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryOilPastes()" @click="handleSort('characteristic')" class="sortable" :class="{ active: sortBy === 'characteristic' }">
              Characteristic {{ sortBy === 'characteristic' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBatteries()" @click="handleSort('size')" class="sortable" :class="{ active: sortBy === 'size' }">
              Size {{ sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBatteries()" @click="handleSort('company')" class="sortable" :class="{ active: sortBy === 'company' }">
              Company {{ sortBy === 'company' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBatteries()" @click="handleSort('model')" class="sortable" :class="{ active: sortBy === 'model' }">
              Model {{ sortBy === 'model' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBatteries()" @click="handleSort('type')" class="sortable" :class="{ active: sortBy === 'type' }">
              Type {{ sortBy === 'type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBatteries()" @click="handleSort('mah')" class="sortable" :class="{ active: sortBy === 'mah' }">
              mAh {{ sortBy === 'mah' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBatteries()" @click="handleSort('rechargeable')" class="sortable" :class="{ active: sortBy === 'rechargeable' }">
              Rechargeable {{ sortBy === 'rechargeable' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryBatteries()" @click="handleSort('expiration_date')" class="sortable" :class="{ active: sortBy === 'expiration_date' }">
              Expiration {{ sortBy === 'expiration_date' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryOtherItems()" @click="handleSort('item_type')" class="sortable" :class="{ active: sortBy === 'item_type' }">
              Item Type {{ sortBy === 'item_type' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryOtherItems()" @click="handleSort('name')" class="sortable" :class="{ active: sortBy === 'name' }">
              Name {{ sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryOtherItems()" @click="handleSort('size')" class="sortable" :class="{ active: sortBy === 'size' }">
              Size {{ sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryOtherItems()" @click="handleSort('company')" class="sortable" :class="{ active: sortBy === 'company' }">
              Company {{ sortBy === 'company' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryWashersBearings()" @click="handleSort('category')" class="sortable" :class="{ active: sortBy === 'category' }">
              Type {{ sortBy === 'category' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryWashersBearings()" @click="handleSort('name')" class="sortable" :class="{ active: sortBy === 'name' }">
              Name {{ sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryWashersBearings()" @click="handleSort('inner_diameter')" class="sortable" :class="{ active: sortBy === 'inner_diameter' }">
              ID {{ sortBy === 'inner_diameter' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryWashersBearings()" @click="handleSort('outer_diameter')" class="sortable" :class="{ active: sortBy === 'outer_diameter' }">
              OD {{ sortBy === 'outer_diameter' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryWashersBearings()" @click="handleSort('thickness')" class="sortable" :class="{ active: sortBy === 'thickness' }">
              Thickness {{ sortBy === 'thickness' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryWashersBearings()" @click="handleSort('subtype')" class="sortable" :class="{ active: sortBy === 'subtype' }">
              Subtype {{ sortBy === 'subtype' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th v-if="filterCategory && isCurrentCategoryWashersBearings()" @click="handleSort('material')" class="sortable" :class="{ active: sortBy === 'material' }">
              Material {{ sortBy === 'material' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <template v-if="!isCurrentCategoryScrews() && !isCurrentCategoryNuts() && !isCurrentCategoryBearings() && !isCurrentCategoryOilPastes() && !isCurrentCategoryBatteries() && !isCurrentCategoryOtherItems() && !isCurrentCategoryWashersBearings()">
              <th @click="handleSort('company')" class="sortable" :class="{ active: sortBy === 'company' }">
                Company {{ sortBy === 'company' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
              </th>
              <th @click="handleSort('model')" class="sortable" :class="{ active: sortBy === 'model' }">
                Model {{ sortBy === 'model' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
              </th>
              <th @click="handleSort('code')" class="sortable" :class="{ active: sortBy === 'code' }">
                Item Code {{ sortBy === 'code' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
              </th>
              <th @click="handleSort('name')" class="sortable" :class="{ active: sortBy === 'name' }">
                Name {{ sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
              </th>
            </template>
            <th v-if="!isCurrentCategoryBearings() && !isCurrentCategoryOilPastes() && !isCurrentCategoryBatteries()" v-for="col in getAllDisplayColumns()" :key="col">
              {{ getColumnLabel(col) }}
            </th>
            <th @click="handleSort('storage')" class="sortable" :class="{ active: sortBy === 'storage' }">
              Storage {{ sortBy === 'storage' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th @click="handleSort('quantity')" class="sortable" :class="{ active: sortBy === 'quantity' }">
              Qty {{ sortBy === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : '' }}
            </th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in paginatedItems()" :key="item.id" class="item-row" :class="{ 'rc-part': item.source_type === 'rc_part', 'screw': item.source_type === 'screw', 'nut': item.source_type === 'nut', 'bearing': item.source_type === 'bearing', 'oil-paste': item.source_type === 'oil_paste', 'battery': item.source_type === 'battery' }">
            <template v-if="filterCategory && isCurrentCategoryScrews()">
              <td class="size">{{ item.size || '-' }}</td>
              <td class="length">{{ item.length || '-' }}</td>
              <td class="head-type">{{ item.head_type || '-' }}</td>
              <td class="drive-type">{{ item.drive_type || '-' }}</td>
              <td class="thread-type">{{ item.thread_type || '-' }}</td>
              <td class="color">{{ item.color || '-' }}</td>
              <td class="material">{{ item.material || '-' }}</td>
            </template>
            <template v-else-if="filterCategory && isCurrentCategoryNuts()">
              <td class="size">{{ item.size || '-' }}</td>
              <td class="type">{{ item.type || '-' }}</td>
              <td class="color">{{ item.color || '-' }}</td>
              <td class="has-washer">{{ item.has_washer ? '🟢' : '⚪' }}</td>
            </template>
            <template v-else-if="filterCategory && isCurrentCategoryBearings()">
              <td class="type">{{ item.type || '-' }}</td>
              <td class="seal-type">{{ item.seal_type || '-' }}</td>
              <td class="id-inner">{{ item.id_inner || '-' }}</td>
              <td class="od">{{ item.od || '-' }}</td>
              <td class="width">{{ item.width || '-' }}</td>
              <td class="flanged">{{ item.flanged ? '🟢' : '⚪' }}</td>
            </template>
            <template v-else-if="filterCategory && isCurrentCategoryOilPastes()">
              <td class="company">{{ item.company || '-' }}</td>
              <td class="type">{{ item.type || '-' }}</td>
              <td class="characteristic">{{ item.characteristic || '-' }}</td>
            </template>
            <template v-else-if="filterCategory && isCurrentCategoryBatteries()">
              <td class="size">{{ item.size || '-' }}</td>
              <td class="company">{{ item.company || '-' }}</td>
              <td class="model">{{ item.model || '-' }}</td>
              <td class="type">{{ item.type || '-' }}</td>
              <td class="mah">{{ item.mah ? item.mah + ' mAh' : '-' }}</td>
              <td class="rechargeable">{{ item.rechargeable ? '🟢' : '⚪' }}</td>
              <td class="expiration-date" :class="getExpirationStatusClass(item.expiration_date)">
                {{ formatExpirationDate(item.expiration_date) }}
              </td>
            </template>
            <template v-else-if="filterCategory && isCurrentCategoryOtherItems()">
              <td class="item-type">{{ item.item_type || '-' }}</td>
              <td class="name">{{ item.name || '-' }}</td>
              <td class="size">{{ item.size || '-' }}</td>
              <td class="company">{{ item.company || '-' }}</td>
            </template>
            <template v-else-if="filterCategory && isCurrentCategoryWashersBearings()">
              <td class="category">{{ item.category || '-' }}</td>
              <td class="name">{{ item.name || '-' }}</td>
              <td class="inner-diameter">{{ item.inner_diameter !== null ? item.inner_diameter : '-' }}</td>
              <td class="outer-diameter">{{ item.outer_diameter !== null ? item.outer_diameter : '-' }}</td>
              <td class="thickness">{{ item.thickness !== null ? item.thickness : '-' }}</td>
              <td class="subtype">{{ item.subtype || '-' }}</td>
              <td class="material">{{ item.material || '-' }}</td>
            </template>
            <template v-else>
              <td class="company">{{ item.display_company || '-' }}</td>
              <td class="model">{{ item.display_model || '-' }}</td>
              <td class="code">{{ item.display_code || '-' }}</td>
              <td class="item-name">{{ item.display_name || item.name || '-' }}</td>
            </template>
            <td v-if="!isCurrentCategoryBearings() && !isCurrentCategoryOilPastes() && !isCurrentCategoryBatteries() && !isCurrentCategoryOtherItems()" v-for="col in getAllDisplayColumns()" :key="col" class="param-cell">
              {{ item.source_type === 'rc_part' || item.source_type === 'screw' || item.source_type === 'nut' ? '-' : (parseParameters(item.parameters)[col] || '-') }}
            </td>
            <td class="storage">{{ item.storage_id || item.box_name || '-' }}</td>
            <td class="quantity">{{ item.quantity }}</td>
            <td class="details">
              <div class="details-cell">
                <button v-if="item.notes" @click="viewNotes(item)" class="notes-btn" title="Click to view notes">📝</button>
                <span v-if="searchQuery && hasSearchMatch(item, 'notes')" class="badge-match" title="Match found in notes">📄</span>
                <span v-if="searchQuery && hasSearchMatch(item, 'parameters')" class="badge-match" title="Match found in parameters">⚙️</span>
              </div>
            </td>
            <td class="actions">
              <button @click="() => editItem(item)" class="btn-icon" title="Edit">✏️</button>
              <button @click="deleteItem(item.id)" class="btn-icon" title="Delete">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="items.length === 0" class="empty-state">
        <p>No items found. Try adjusting your search filters or add a new item.</p>
      </div>
      
      <!-- Pagination -->
      <div v-if="items.length > 0" class="pagination">
        <div class="pagination-info">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, items.length) }} of {{ items.length }} items
        </div>
        <div class="pagination-controls">
          <button @click="currentPage--" :disabled="currentPage === 1" class="btn-pagination">← Previous</button>
          <span class="page-numbers">
            <button 
              v-for="page in totalPages()" 
              :key="page"
              @click="currentPage = page"
              :class="{ active: currentPage === page }"
              class="page-number"
            >
              {{ page }}
            </button>
          </span>
          <button @click="currentPage++" :disabled="currentPage === totalPages()" class="btn-pagination">Next →</button>
        </div>
      </div>
    </div>

    <!-- View Notes Modal -->
    <div v-if="showNotesModal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h2>📝 Notes</h2>
          <button type="button" @click="closeNotesModal" class="close-btn">✕</button>
        </div>
        <div class="modal-content">
          <p class="notes-text">{{ viewingNotes }}</p>
        </div>
        <div class="modal-actions">
          <button @click="closeNotesModal" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-box">
        <div class="modal-header">
          <h2>{{ editingItem ? 'Edit Item' : 'Add New Item' }}</h2>
          <button type="button" @click="closeModal" class="close-btn">✕</button>
        </div>
        
        <form @submit.prevent="saveItem" class="modal-form">
          <div class="form-group">
            <label>Item Type *</label>
            <select v-model="formData.item_type" required>
              <option value="">Select Item Type</option>
              <option value="Screws">🔩 Screws</option>
              <option value="Nuts">⚙️ Nuts</option>
              <option value="Washers & Bearings">⚪ Washers & Bearings</option>
              <option value="RC Parts">🏎️ RC Parts</option>
              <option value="Oils/Pastes">🛢️ Oils/Pastes</option>
              <option value="Batteries">🔋 Batteries</option>
              <option value="Other Items">📦 Other Items</option>
            </select>
          </div>

          <div v-if="formData.item_type === 'Screws'" class="screw-fields">
            <div class="form-group">
              <label>Size</label>
              <select v-model="formData.size">
                <option value="">-- Select Size --</option>
                <option v-for="value in enumOptions['screw_size'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Length</label>
              <input v-model="formData.length" type="text" placeholder="Length (mm)" />
            </div>
            <div class="form-group">
              <label>Head Type</label>
              <select v-model="formData.head_type">
                <option value="">-- Select Head Type --</option>
                <option v-for="value in enumOptions['screw_head_type'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Drive Type</label>
              <select v-model="formData.drive_type">
                <option value="">-- Select Drive Type --</option>
                <option v-for="value in enumOptions['screw_drive_type'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Thread Type</label>
              <select v-model="formData.thread_type">
                <option value="">-- Select Thread Type --</option>
                <option v-for="value in enumOptions['screw_thread_type'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Color</label>
              <select v-model="formData.color">
                <option value="">-- Select Color --</option>
                <option v-for="value in enumOptions['screw_color'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Material</label>
              <select v-model="formData.material">
                <option value="">-- Select Material --</option>
                <option v-for="value in enumOptions['screw_material'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="formData.item_type === 'Nuts'" class="nut-fields">
            <div class="form-group">
              <label>Size</label>
              <select v-model="formData.size">
                <option value="">-- Select Size --</option>
                <option v-for="value in enumOptions['nut_size'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Type</label>
              <select v-model="formData.type">
                <option value="">-- Select Type --</option>
                <option v-for="value in enumOptions['nut_type'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Color</label>
              <select v-model="formData.color">
                <option value="">-- Select Color --</option>
                <option v-for="value in enumOptions['nut_color'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="formData.has_washer" />
                Has Washer
              </label>
            </div>
          </div>

          <div v-if="formData.item_type === 'Oils/Pastes'" class="oil-paste-fields">
            <div class="form-group">
              <label>Company</label>
              <select v-model="formData.company">
                <option value="">-- Select Company --</option>
                <option v-for="value in enumOptions['oil_paste_company'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Type</label>
              <select v-model="formData.type">
                <option value="">-- Select Type --</option>
                <option v-for="value in enumOptions['oil_paste_type'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Characteristic</label>
              <input v-model="formData.characteristic" type="text" placeholder="e.g., Graphite, Light Oil, Heavy Grease, etc." />
            </div>
          </div>

          <div v-if="formData.item_type === 'Batteries'" class="battery-fields">
            <div class="form-group">
              <label>Size</label>
              <select v-model="formData.size">
                <option value="">-- Select Size --</option>
                <option v-for="value in enumOptions['battery_size'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Company</label>
              <select v-model="formData.company">
                <option value="">-- Select Company --</option>
                <option v-for="value in enumOptions['battery_company'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Model</label>
              <select v-model="formData.model">
                <option value="">-- Select Model --</option>
                <option v-for="value in enumOptions['battery_model'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Type</label>
              <select v-model="formData.type">
                <option value="">-- Select Type --</option>
                <option v-for="value in enumOptions['battery_type'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Expiration Date</label>
              <input v-model="formData.expiration_date" type="date" />
            </div>
            <div class="form-group">
              <label>Capacity (mAh)</label>
              <input v-model.number="formData.mah" type="number" placeholder="e.g., 2000" />
            </div>
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="formData.rechargeable" type="checkbox" />
                Rechargeable
              </label>
            </div>
          </div>

          <div v-if="formData.item_type === 'Other Items'" class="other-items-fields">
            <div class="form-group">
              <label>Item Type *</label>
              <input v-model="formData.other_item_type" type="text" placeholder="e.g., Connector, Washer, Switch, Resistor" required />
            </div>
            <div class="form-group">
              <label>Name</label>
              <input v-model="formData.other_item_name" type="text" placeholder="e.g., XT90 M, 6X2.5x05" />
            </div>
            <div class="form-group">
              <label>Size</label>
              <input v-model="formData.size" type="text" placeholder="e.g., Small, Medium, Large, 4mm" />
            </div>
            <div class="form-group">
              <label>Company</label>
              <input v-model="formData.other_item_company" type="text" placeholder="e.g., Noctua, No Name" />
            </div>
          </div>

          <div v-if="formData.item_type === 'Washers & Bearings'" class="washer-bearing-fields">
            <div class="form-group">
              <label>Type *</label>
              <select v-model="formData.wb_category" required>
                <option value="Washer">Washer</option>
                <option value="Bearing">Bearing</option>
              </select>
            </div>
            <div class="form-group">
              <label>Name</label>
              <input v-model="formData.name" type="text" placeholder="e.g., 6801RS, 6X2.5x0.5" />
            </div>
            <div class="form-group">
              <label>Inner Diameter (mm)</label>
              <input v-model.number="formData.inner_diameter" type="number" placeholder="e.g., 8" step="0.001" />
            </div>
            <div class="form-group">
              <label>Outer Diameter (mm)</label>
              <input v-model.number="formData.outer_diameter" type="number" placeholder="e.g., 22" step="0.001" />
            </div>
            <div class="form-group">
              <label>Thickness (mm)</label>
              <input v-model.number="formData.thickness" type="number" placeholder="e.g., 7" step="0.001" />
            </div>
            <div class="form-group">
              <label>Subtype</label>
              <select v-model="formData.subtype">
                <option value="">-- Select Subtype --</option>
                <option v-for="value in enumOptions['washer_bearing_subtype'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Material</label>
              <select v-model="formData.material">
                <option value="">-- Select Material --</option>
                <option v-for="value in enumOptions['washer_bearing_material'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="formData.item_type === 'RC Parts'" class="rc-part-fields">
            <div class="form-group">
              <label>Company</label>
              <select v-model="formData.company">
                <option value="">-- Select Company --</option>
                <option v-for="value in enumOptions['rc_company'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Model</label>
              <select v-model="formData.model">
                <option value="">-- Select Model --</option>
                <option v-for="value in enumOptions['rc_model'] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Item Code</label>
              <input v-model="formData.item_code" type="text" placeholder="Item code" />
            </div>
          </div>

          <div v-if="formData.item_type !== 'Batteries' && formData.item_type !== 'Washers & Bearings'" class="form-group">
            <label>Item Name *</label>
            <input v-model="formData.name" type="text" placeholder="Item name" required />
          </div>

          <div class="form-group">
            <label>Storage / Box Location *</label>
            <select v-model="formData.box_id" required>
              <option value="">-- Select Storage Box --</option>
              <option v-for="box in boxes" :key="box.id" :value="box.id">
                {{ box.storage_id }} - {{ box.box_name }} ({{ box.shelf_code }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Quantity</label>
            <input v-model.number="formData.quantity" type="number" min="0" step="any" placeholder="Quantity" />
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="formData.notes" placeholder="Additional notes"></textarea>
          </div>

          <!-- Dynamic Parameters based on Item Type -->
          <div v-if="parameterDefinitions.length > 0 && formData.item_type !== 'Nuts' && formData.item_type !== 'Oils/Pastes' && formData.item_type !== 'Batteries' && formData.item_type !== 'Other Items'" class="form-section">
            <label class="section-title">📋 Item Parameters</label>
            <div v-for="param in parameterDefinitions" :key="param.key" class="form-group">
              <label>{{ param.label }}</label>
              <select 
                v-if="param.type === 'select'"
                v-model="formData.parameters[param.key]"
              >
                <option value="">-- Select --</option>
                <option v-for="value in enumOptions[param.enum_type] || []" :key="value" :value="value">
                  {{ value }}
                </option>
              </select>
              <input 
                v-else-if="param.type !== 'checkbox'"
                v-model="formData.parameters[param.key]" 
                :type="param.type" 
                :placeholder="param.label"
              />
              <label v-else class="checkbox-label">
                <input 
                  v-model="formData.parameters[param.key]" 
                  type="checkbox"
                />
                {{ param.label }}
              </label>
            </div>
          </div>

          <!-- Display existing parameters in edit mode -->
          <div v-else-if="editingItem && formData.item_type !== 'Nuts' && formData.item_type !== 'Oils/Pastes' && formData.item_type !== 'Batteries' && formData.item_type !== 'Other Items' && formData.parameters && Object.keys(formData.parameters).length > 0" class="form-group">
            <label>📋 Parameters</label>
            <div class="parameters-display">
              <div v-for="(value, key) in parseParameters(formData.parameters)" :key="key" class="param-item">
                <strong>{{ key }}:</strong> <span>{{ value }}</span>
              </div>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Save</button>
            <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue';
import { itemsService, categoriesService, enumsService, locationsService } from '../services/api.js';

// Parameter definitions for each item type
// Types: 'text', 'number', 'date', 'checkbox', 'select' (dropdown)
const PARAMETER_DEFINITIONS = {
  'Screws': [],
  'Nuts': [
    { key: 'size', label: 'Size (e.g., M3)', type: 'text', display: true },
    { key: 'type', label: 'Type', type: 'select', enum_type: 'nut_type', display: true },
    { key: 'color', label: 'Color', type: 'select', enum_type: 'nut_color', display: true },
    { key: 'has_washer', label: 'Has Washer', type: 'checkbox', display: false }
  ],
  'Bearings': [
    { key: 'type', label: 'Type', type: 'text', display: true },
    { key: 'id', label: 'Inner Diameter (ID mm)', type: 'number', display: true },
    { key: 'od', label: 'Outer Diameter (OD mm)', type: 'number', display: true },
    { key: 'width', label: 'Width (mm)', type: 'number', display: true }
  ],
  'RC Parts': [],
  'Oils/Pastes': [
    { key: 'company', label: 'Company', type: 'select', enum_type: 'oil_paste_company', display: true },
    { key: 'type', label: 'Type', type: 'select', enum_type: 'oil_paste_type', display: true },
    { key: 'weight_type', label: 'Weight/Type', type: 'text', display: false },
    { key: 'ml', label: 'Volume (ml)', type: 'number', display: false }
  ],
  'Batteries': [
    { key: 'type', label: 'Type', type: 'select', enum_type: 'battery_type', display: true },
    { key: 'model', label: 'Model', type: 'text', display: true },
    { key: 'expiration', label: 'Expiration Date', type: 'date', display: true }
  ],
  'Other Items': [
    { key: 'item_type', label: 'Item Type', type: 'text', display: true },
    { key: 'size', label: 'Size', type: 'text', display: false }
  ]
};

export default {
  props: {
    selectedCategory: {
      type: [Number, String, null],
      default: null
    }
  },
  setup(props) {
    const items = ref([]);
    const categories = ref([]);
    const boxes = ref([]);
    const searchQuery = ref('');
    const filterCategory = ref('');
    const showAddModal = ref(false);
    const editingItem = ref(null);
    const showNotesModal = ref(false);
    const viewingNotes = ref('');
    const formData = ref({
      name: '',
      item_type: '',
      company: '',
      model: '',
      item_code: '',
      size: '',
      length: '',
      head_type: '',
      drive_type: '',
      thread_type: '',
      type: '',
      color: '',
      material: '',
      has_washer: false,
      id_inner: null,
      od: null,
      width: null,
      flanged: false,
      seal_type: '',
      characteristic: '',
      category_id: '',
      box_id: '',
      quantity: 0,
      notes: '',
      parameters: {}
    });
    const slugify = (value = '') => value.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    
    // Helper function to convert Excel serial date number to Date object
    const excelDateToJSDate = (excelDate) => {
      if (!excelDate) return null;
      // Excel serial number: days since 1/1/1900
      // JavaScript: ms since 1/1/1970
      const excelDateNum = Number(excelDate);
      if (isNaN(excelDateNum)) return null;
      const jsDate = new Date((excelDateNum - 25569) * 86400 * 1000);
      return jsDate;
    };

    // Format expiration date for display
    const formatExpirationDate = (dateValue) => {
      if (!dateValue) return '-';
      let date;
      if (typeof dateValue === 'string') {
        if (dateValue.match(/^\d+$/)) {
          // Excel serial number
          date = excelDateToJSDate(dateValue);
        } else {
          // ISO date string or other format
          date = new Date(dateValue);
        }
      } else if (typeof dateValue === 'number') {
        date = excelDateToJSDate(dateValue);
      } else {
        date = dateValue;
      }
      
      if (!date || isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Get expiration status class for styling
    const getExpirationStatusClass = (dateValue) => {
      if (!dateValue) return '';
      let date;
      if (typeof dateValue === 'string') {
        if (dateValue.match(/^\d+$/)) {
          date = excelDateToJSDate(dateValue);
        } else {
          date = new Date(dateValue);
        }
      } else if (typeof dateValue === 'number') {
        date = excelDateToJSDate(dateValue);
      } else {
        date = dateValue;
      }
      
      if (!date || isNaN(date.getTime())) return '';
      
      const today = new Date();
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      if (date < today) {
        return 'expired';
      } else if (date < threeMonthsFromNow) {
        return 'expiring-soon';
      }
      return '';
    };

    const parameterDefinitions = ref([]);
    const enumOptions = ref({}); // Store enum options: { enum_type: [values] }
    const currentPage = ref(1);
    const itemsPerPage = computed(() => 20);
    const sortBy = ref('company');
    const sortOrder = ref('asc'); // 'asc' or 'desc'

    const loadItems = async () => {
      try {
        const response = await itemsService.getAll({
          search: searchQuery.value,
          category_id: filterCategory.value
        });
        items.value = response.data || [];
      } catch (error) {
        console.error('Error loading items:', error);
      }
    };

    const loadCategories = async () => {
      try {
        const response = await categoriesService.getAll();
        categories.value = response.data || [];
      } catch (error) {
        console.error('Error loading categories:', error);
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

    const loadEnumOptions = async (enum_types) => {
      try {
        for (const enum_type of enum_types) {
          if (!enumOptions.value[enum_type]) {
            const response = await enumsService.getValues(enum_type);
            enumOptions.value[enum_type] = response.data || [];
          }
        }
      } catch (error) {
        console.error('Error loading enum options:', error);
      }
    };

    const updateParameterFields = async () => {
      const itemType = formData.value.item_type;
      
      // Nuts don't use parameters
      if (itemType === 'Nuts') {
        parameterDefinitions.value = [];
        formData.value.parameters = {};
        return;
      }
      
      const defs = PARAMETER_DEFINITIONS[itemType] || [];
      parameterDefinitions.value = defs;
      
      // Load enum options for this item type
      const enum_types = defs
        .filter(p => p.type === 'select' && p.enum_type)
        .map(p => p.enum_type);
      if (enum_types.length > 0) {
        await loadEnumOptions(enum_types);
      }
      
      // Initialize parameters object with empty values
      const newParams = {};
      defs.forEach(param => {
        if (formData.value.parameters && formData.value.parameters[param.key] !== undefined) {
          newParams[param.key] = formData.value.parameters[param.key];
        } else {
          newParams[param.key] = param.type === 'checkbox' ? false : '';
        }
      });
      formData.value.parameters = newParams;
    };

    // Watch for item_type changes
    watch(() => formData.value.item_type, async () => {
      await updateParameterFields();
      // Load enums based on item type
      if (formData.value.item_type === 'RC Parts') {
        await loadEnumOptions(['rc_company', 'rc_model']);
      } else if (formData.value.item_type === 'Screws') {
        await loadEnumOptions(['screw_size', 'screw_head_type', 'screw_drive_type', 'screw_thread_type', 'screw_color', 'screw_material']);
      } else if (formData.value.item_type === 'Nuts') {
        await loadEnumOptions(['nut_size', 'nut_type', 'nut_color']);
      } else if (formData.value.item_type === 'Oils/Pastes') {
        await loadEnumOptions(['oil_paste_company', 'oil_paste_type']);
      } else if (formData.value.item_type === 'Washers & Bearings') {
        await loadEnumOptions(['washer_bearing_subtype', 'washer_bearing_material']);
      }
    });

    const categorySummary = computed(() => {
      const counts = {};

      items.value.forEach(item => {
        const categoryId = item.category_id || item.category_name;
        if (!categoryId) return;
        counts[categoryId] = (counts[categoryId] || 0) + 1;
      });

      return categories.value.map(cat => ({
        ...cat,
        count: counts[cat.id] || 0
      }));
    });

    const openCategory = (categoryId) => {
      filterCategory.value = categoryId;
      // Set default sort by size for batteries, company for others
      const category = categories.value.find(cat => cat.id === categoryId);
      if (category && category.name.toLowerCase().includes('batter')) {
        sortBy.value = 'size';
      } else {
        sortBy.value = 'company';
      }
      sortOrder.value = 'asc';
      currentPage.value = 1;
      if (category) {
        window.location.hash = `#/items/${slugify(category.name)}`;
      }
      loadItems();
    };

    const handleSearch = () => {
      loadItems();
    };

    const handleFilter = () => {
      // Set default sort for batteries to Size
      if (filterCategory.value) {
        const batteryCategory = categories.value.find(c => c.name === 'Batteries');
        if (filterCategory.value === batteryCategory?.id) {
          sortBy.value = 'size';
          sortOrder.value = 'asc';
        }
      }
      loadItems();
    };

    const viewNotes = (item) => {
      viewingNotes.value = item.notes;
      showNotesModal.value = true;
    };

    const closeNotesModal = () => {
      showNotesModal.value = false;
      viewingNotes.value = '';
    };

    const closeModal = () => {
      showAddModal.value = false;
      editingItem.value = null;
      formData.value = {
        name: '',
        item_type: '',
        other_item_type: '',
        other_item_name: '',
        other_item_company: '',
        company: '',
        model: '',
        item_code: '',
        size: '',
        length: '',
        head_type: '',
        drive_type: '',
        thread_type: '',
        type: '',
        color: '',
        material: '',
        has_washer: false,
        id_inner: null,
        od: null,
        width: null,
        flanged: false,
        seal_type: '',
        characteristic: '',
        inner_diameter: null,
        outer_diameter: null,
        thickness: null,
        subtype: '',
        wb_category: 'Washer',
        category_id: '',
        box_id: '',
        quantity: 0,
        notes: '',
        expiration_date: '',
        mah: null,
        rechargeable: false,
        parameters: {}
      };
      parameterDefinitions.value = [];
    };

    const parseParameters = (params) => {
      if (!params) return {};
      if (typeof params === 'string') {
        try {
          return JSON.parse(params);
        } catch (e) {
          return {};
        }
      }
      return params;
    };

    const totalPages = () => {
      return Math.ceil(items.value.length / itemsPerPage.value);
    };

    const paginatedItems = () => {
      let sorted = [...items.value];
      
      // Sort based on current sort settings
      sorted.sort((a, b) => {
        let aVal, bVal;
        
        if (sortBy.value === 'size') {
          aVal = (a.size || '').toLowerCase();
          bVal = (b.size || '').toLowerCase();
        } else if (sortBy.value === 'length') {
          aVal = (a.length || '').toLowerCase();
          bVal = (b.length || '').toLowerCase();
        } else if (sortBy.value === 'head_type') {
          aVal = (a.head_type || '').toLowerCase();
          bVal = (b.head_type || '').toLowerCase();
        } else if (sortBy.value === 'drive_type') {
          aVal = (a.drive_type || '').toLowerCase();
          bVal = (b.drive_type || '').toLowerCase();
        } else if (sortBy.value === 'thread_type') {
          aVal = (a.thread_type || '').toLowerCase();
          bVal = (b.thread_type || '').toLowerCase();
        } else if (sortBy.value === 'color') {
          aVal = (a.color || '').toLowerCase();
          bVal = (b.color || '').toLowerCase();
        } else if (sortBy.value === 'material') {
          aVal = (a.material || '').toLowerCase();
          bVal = (b.material || '').toLowerCase();
        } else if (sortBy.value === 'type') {
          aVal = (a.type || '').toLowerCase();
          bVal = (b.type || '').toLowerCase();
        } else if (sortBy.value === 'seal_type') {
          aVal = (a.seal_type || '').toLowerCase();
          bVal = (b.seal_type || '').toLowerCase();
        } else if (sortBy.value === 'has_washer') {
          aVal = a.has_washer ? 1 : 0;
          bVal = b.has_washer ? 1 : 0;
        } else if (sortBy.value === 'id_inner') {
          aVal = a.id_inner || 0;
          bVal = b.id_inner || 0;
        } else if (sortBy.value === 'od') {
          aVal = a.od || 0;
          bVal = b.od || 0;
        } else if (sortBy.value === 'width') {
          aVal = a.width || 0;
          bVal = b.width || 0;
        } else if (sortBy.value === 'flanged') {
          aVal = a.flanged ? 1 : 0;
          bVal = b.flanged ? 1 : 0;
        } else if (sortBy.value === 'name') {
          aVal = (a.display_name || a.name || '').toLowerCase();
          bVal = (b.display_name || b.name || '').toLowerCase();
        } else if (sortBy.value === 'company') {
          aVal = (a.display_company || '').toLowerCase();
          bVal = (b.display_company || '').toLowerCase();
        } else if (sortBy.value === 'model') {
          aVal = (a.display_model || '').toLowerCase();
          bVal = (b.display_model || '').toLowerCase();
        } else if (sortBy.value === 'code') {
          aVal = (a.display_code || '').toLowerCase();
          bVal = (b.display_code || '').toLowerCase();
        } else if (sortBy.value === 'quantity') {
          aVal = a.quantity || 0;
          bVal = b.quantity || 0;
        } else if (sortBy.value === 'storage') {
          aVal = (a.storage_id || a.box_name || '').toLowerCase();
          bVal = (b.storage_id || b.box_name || '').toLowerCase();
        } else if (sortBy.value === 'expiration_date') {
          // Convert to comparable dates
          aVal = a.expiration_date ? new Date(a.expiration_date).getTime() : 0;
          bVal = b.expiration_date ? new Date(b.expiration_date).getTime() : 0;
        } else if (sortBy.value === 'mah') {
          aVal = a.mah || 0;
          bVal = b.mah || 0;
        } else if (sortBy.value === 'rechargeable') {
          aVal = a.rechargeable ? 1 : 0;
          bVal = b.rechargeable ? 1 : 0;
        } else if (sortBy.value === 'item_type') {
          aVal = (a.item_type || '').toLowerCase();
          bVal = (b.item_type || '').toLowerCase();
        } else if (sortBy.value === 'name') {
          aVal = (a.name || a.display_name || '').toLowerCase();
          bVal = (b.name || b.display_name || '').toLowerCase();
        } else if (sortBy.value === 'company') {
          aVal = (a.company || a.display_company || '').toLowerCase();
          bVal = (b.company || b.display_company || '').toLowerCase();
        }
        
        if (aVal < bVal) return sortOrder.value === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
      });
      
      const pageSize = itemsPerPage.value;
      const start = (currentPage.value - 1) * pageSize;
      const end = start + pageSize;
      return sorted.slice(start, end);
    };

    const handleSort = (column) => {
      if (sortBy.value === column) {
        // Toggle sort order
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        // Set new sort column
        sortBy.value = column;
        sortOrder.value = 'asc';
      }
      currentPage.value = 1;
    };

    const getDisplayColumns = (itemType) => {
      // Screws, Nuts, Bearings, and Oil Pastes use dedicated columns, not parameters
      if (itemType === 'Screws' || itemType === 'Nuts' || itemType === 'Bearings' || itemType === 'Oils/Pastes') {
        return [];
      }
      const defs = PARAMETER_DEFINITIONS[itemType] || [];
      return defs.filter(d => d.display).map(d => d.key);
    };

    const getAllDisplayColumns = () => {
      if (filterCategory.value) {
        // If filtering by category, find items of that type
        const itemsOfCategory = items.value.filter(i => i.category_id === filterCategory.value);
        const types = [...new Set(itemsOfCategory.map(i => i.item_type))];
        const allCols = new Set();
        types.forEach(type => {
          getDisplayColumns(type).forEach(col => allCols.add(col));
        });
        return Array.from(allCols);
      } else {
        // Show all possible columns
        const allCols = new Set();
        Object.values(PARAMETER_DEFINITIONS).forEach(defs => {
          defs.filter(d => d.display).forEach(d => allCols.add(d.key));
        });
        return Array.from(allCols);
      }
    };

    const getColumnLabel = (key) => {
      for (const defs of Object.values(PARAMETER_DEFINITIONS)) {
        const def = defs.find(d => d.key === key);
        if (def) return def.label;
      }
      return key;
    };

    const isCurrentCategoryScrews = () => {
      if (!filterCategory.value) return false;
      
      // Check category name first
      const currentCategory = categories.value.find(c => c.id === filterCategory.value);
      if (currentCategory && currentCategory.name.toLowerCase().includes('screw')) {
        return true;
      }
      
      // Fallback: check if any items in category are screws
      if (items.value.length === 0) return false;
      const categoryItems = items.value.filter(i => i.category_id === filterCategory.value);
      return categoryItems.some(i => i.source_type === 'screw');
    };

    const isCurrentCategoryNuts = () => {
      if (!filterCategory.value) return false;
      
      // Check category name first
      const currentCategory = categories.value.find(c => c.id === filterCategory.value);
      if (currentCategory && currentCategory.name.toLowerCase().includes('nut')) {
        return true;
      }
      
      // Fallback: check if any items in category are nuts
      if (items.value.length === 0) return false;
      const categoryItems = items.value.filter(i => i.category_id === filterCategory.value);
      return categoryItems.some(i => i.source_type === 'nut');
    };

    const isCurrentCategoryBearings = () => {
      if (!filterCategory.value) return false;
      
      // Check category name - must be exactly "Bearings", not "Washers & Bearings"
      const currentCategory = categories.value.find(c => c.id === filterCategory.value);
      if (currentCategory && currentCategory.name === 'Bearings') {
        return true;
      }
      
      // Fallback: check if any items in category are bearings (old type)
      if (items.value.length === 0) return false;
      const categoryItems = items.value.filter(i => i.category_id === filterCategory.value);
      return categoryItems.some(i => i.source_type === 'bearing');
    };

    const isCurrentCategoryOilPastes = () => {
      if (!filterCategory.value) return false;
      
      // Check category name first
      const currentCategory = categories.value.find(c => c.id === filterCategory.value);
      if (currentCategory && (currentCategory.name.toLowerCase().includes('oil') || currentCategory.name.toLowerCase().includes('paste'))) {
        return true;
      }
      
      // Fallback: check if any items in category are oil pastes
      if (items.value.length === 0) return false;
      const categoryItems = items.value.filter(i => i.category_id === filterCategory.value);
      return categoryItems.some(i => i.source_type === 'oil_paste');
    };

    const isCurrentCategoryBatteries = () => {
      if (!filterCategory.value) return false;
      
      // Check category name first
      const currentCategory = categories.value.find(c => c.id === filterCategory.value);
      if (currentCategory && currentCategory.name.toLowerCase().includes('batter')) {
        return true;
      }
      
      // Fallback: check if any items in category are batteries
      if (items.value.length === 0) return false;
      const categoryItems = items.value.filter(i => i.category_id === filterCategory.value);
      return categoryItems.some(i => i.source_type === 'battery');
    };

    const isCurrentCategoryOtherItems = () => {
      if (!filterCategory.value) return false;
      
      // Check category name first
      const currentCategory = categories.value.find(c => c.id === filterCategory.value);
      if (currentCategory && currentCategory.name.toLowerCase().includes('other')) {
        return true;
      }
      
      // Fallback: check if any items in category are other_items
      if (items.value.length === 0) return false;
      const categoryItems = items.value.filter(i => i.category_id === filterCategory.value);
      return categoryItems.some(i => i.source_type === 'other_item');
    };

    const isCurrentCategoryWashersBearings = () => {
      if (!filterCategory.value) return false;
      
      // Check category name - must be exactly "Washers & Bearings"
      const currentCategory = categories.value.find(c => c.id === filterCategory.value);
      if (currentCategory && currentCategory.name === 'Washers & Bearings') {
        return true;
      }
      
      // Fallback: check if any items in category are washer_bearing type
      if (items.value.length === 0) return false;
      const categoryItems = items.value.filter(i => i.category_id === filterCategory.value);
      return categoryItems.some(i => i.source_type === 'washer_bearing');
    };

    const hasSearchMatch = (item, field) => {
      if (!searchQuery.value) return false;
      const query = searchQuery.value.toLowerCase();
      
      if (field === 'notes') {
        return item.notes && item.notes.toLowerCase().includes(query);
      } else if (field === 'parameters') {
        // Nuts don't have parameters
        if (item.source_type === 'nut') return false;
        const params = parseParameters(item.parameters);
        return Object.values(params).some(val => 
          val && String(val).toLowerCase().includes(query)
        );
      }
      return false;
    };

    const editItem = async (item) => {
      editingItem.value = item;
      console.log('[EDIT] Item loaded:', item);
      console.log('[EDIT] Item subtype:', item.subtype);
      formData.value = {
        name: item.name || item.display_name || '',
        item_type: item.item_type || '',
        company: item.display_company || item.company || '',
        model: item.display_model || item.model || '',
        item_code: item.display_code || item.item_code || '',
        size: item.size || '',
        length: item.length || '',
        head_type: item.head_type || '',
        drive_type: item.drive_type || '',
        thread_type: item.thread_type || '',
        type: item.type || '',
        color: item.color || '',
        material: item.material || '',
        has_washer: item.has_washer || false,
        id_inner: item.id_inner || null,
        od: item.od || null,
        width: item.width || null,
        flanged: item.flanged || false,
        seal_type: item.seal_type || '',
        characteristic: item.characteristic || '',
        inner_diameter: item.inner_diameter,
        outer_diameter: item.outer_diameter,
        thickness: item.thickness,
        subtype: item.subtype || '',
        wb_category: item.category || 'Washer',
        expiration_date: item.expiration_date || '',
        mah: item.mah || null,
        rechargeable: item.rechargeable ? true : false,
        category_id: item.category_id || '',
        box_id: item.box_id || '',
        quantity: item.quantity || 0,
        notes: item.notes || '',
        parameters: parseParameters(item.parameters) || {}
      };
      await updateParameterFields();
      // Load enums based on item type
      if (formData.value.item_type === 'RC Parts') {
        await loadEnumOptions(['rc_company', 'rc_model']);
      } else if (formData.value.item_type === 'Screws') {
        await loadEnumOptions(['screw_size', 'screw_head_type', 'screw_drive_type', 'screw_thread_type', 'screw_color', 'screw_material']);
      } else if (formData.value.item_type === 'Nuts') {
        await loadEnumOptions(['nut_size', 'nut_type', 'nut_color']);
      } else if (formData.value.item_type === 'Oils/Pastes') {
        await loadEnumOptions(['oil_paste_company', 'oil_paste_type']);
      } else if (formData.value.item_type === 'Batteries') {
        await loadEnumOptions(['battery_size', 'battery_company', 'battery_model', 'battery_type']);
      } else if (formData.value.item_type === 'Washers & Bearings') {
        await loadEnumOptions(['washer_bearing_subtype', 'washer_bearing_material']);
      } else if (formData.value.item_type === 'Other Items') {
        // For Other Items, item.item_type contains the specific item type
        formData.value.other_item_type = item.item_type;
        formData.value.other_item_name = item.name || '';
        formData.value.other_item_company = item.company || '';
        // Set item_type back to 'Other Items' for the category selector
        formData.value.item_type = 'Other Items';
      }
      showAddModal.value = true;
    };

    const saveItem = async () => {
      try {
        const payload = { ...formData.value };
        console.log('[SAVE] Initial payload:', JSON.stringify(payload, null, 2));
        console.log('[SAVE] formData.inner_diameter:', formData.value.inner_diameter, 'type:', typeof formData.value.inner_diameter);
        console.log('[SAVE] formData.outer_diameter:', formData.value.outer_diameter, 'type:', typeof formData.value.outer_diameter);
        console.log('[SAVE] formData.thickness:', formData.value.thickness, 'type:', typeof formData.value.thickness);
        console.log('[SAVE] formData.subtype:', formData.value.subtype, 'type:', typeof formData.value.subtype);
        console.log('[SAVE] formData.material:', formData.value.material, 'type:', typeof formData.value.material);

        if (payload.item_type === 'Screws') {
          payload.size = payload.size || '';
          payload.length = payload.length || '';
          payload.head_type = payload.head_type || '';
          payload.drive_type = payload.drive_type || '';
          payload.thread_type = payload.thread_type || '';
          payload.color = payload.color || '';
          payload.material = payload.material || '';
          payload.source_type = 'screw';
          // Auto-assign Screws category
          const screwsCategory = categories.value.find(c => c.name === 'Screws');
          if (screwsCategory) payload.category_id = screwsCategory.id;
        } else if (payload.item_type === 'Nuts') {
          payload.size = payload.size || '';
          payload.type = payload.type || '';
          payload.color = payload.color || '';
          payload.has_washer = payload.has_washer || false;
          payload.source_type = 'nut';
          // Nuts don't use parameters
          delete payload.parameters;
          // Auto-assign Nuts category
          const nutsCategory = categories.value.find(c => c.name === 'Nuts');
          if (nutsCategory) payload.category_id = nutsCategory.id;
        } else if (payload.item_type === 'Oils/Pastes') {
          payload.company = payload.company || '';
          payload.type = payload.type || '';
          payload.characteristic = payload.characteristic || '';
          payload.source_type = 'oil_paste';
          // Oil Pastes don't use parameters
          delete payload.parameters;
          // Auto-assign Oil Pastes category
          const oilPastesCategory = categories.value.find(c => c.name.toLowerCase().includes('oil') || c.name.toLowerCase().includes('paste'));
          if (oilPastesCategory) payload.category_id = oilPastesCategory.id;
        } else if (payload.item_type === 'Batteries') {
          payload.size = payload.size || '';
          payload.company = payload.company || '';
          payload.model = payload.model || '';
          payload.type = payload.type || '';
          payload.expiration_date = payload.expiration_date || null;
          payload.mah = payload.mah || null;
          payload.rechargeable = payload.rechargeable ? 1 : 0;
          payload.source_type = 'battery';
          // Auto-generate battery name from components
          payload.name = [payload.size, payload.company, payload.model].filter(Boolean).join(' ') || 'Battery';
          // Batteries don't use parameters
          delete payload.parameters;
          // Auto-assign Batteries category
          const batteriesCategory = categories.value.find(c => c.name === 'Batteries');
          if (batteriesCategory) payload.category_id = batteriesCategory.id;
        } else if (payload.item_type === 'RC Parts') {
          payload.company = payload.company || '';
          payload.model = payload.model || '';
          // Fall back to name if item_code is empty
          payload.item_code = payload.item_code || payload.name || 'RC Part';
          payload.source_type = 'rc_part';
          // Auto-assign RC Parts category
          const rcCategory = categories.value.find(c => c.name === 'RC Parts');
          if (rcCategory) payload.category_id = rcCategory.id;
        } else if (payload.item_type === 'Other Items') {
          payload.item_type = payload.other_item_type || 'Unknown';
          payload.name = payload.other_item_name || '';
          payload.size = payload.size || '';
          payload.company = payload.other_item_company || '';
          payload.source_type = 'other_item';
          // Auto-assign Other Items category
          const otherItemsCategory = categories.value.find(c => c.name === 'Other Items');
          if (otherItemsCategory) payload.category_id = otherItemsCategory.id;
          // Clean up the other_item_* fields
          delete payload.other_item_type;
          delete payload.other_item_name;
          delete payload.other_item_company;
        } else if (payload.item_type === 'Washers & Bearings') {
          payload.category = payload.wb_category || 'Washer';
          // Only set dimensions if they have a value; preserve existing values if not provided
          if (payload.inner_diameter === null || payload.inner_diameter === undefined || payload.inner_diameter === '') {
            delete payload.inner_diameter;
          }
          if (payload.outer_diameter === null || payload.outer_diameter === undefined || payload.outer_diameter === '') {
            delete payload.outer_diameter;
          }
          if (payload.thickness === null || payload.thickness === undefined || payload.thickness === '') {
            delete payload.thickness;
          }
          // Delete old field names that might conflict
          delete payload.id_inner;
          delete payload.od;
          delete payload.width;
          payload.subtype = payload.subtype || '';
          payload.material = payload.material || '';
          payload.source_type = 'washer_bearing';
          // Auto-assign Washers & Bearings category
          const wbCategory = categories.value.find(c => c.name === 'Washers & Bearings');
          if (wbCategory) payload.category_id = wbCategory.id;
          // Clean up the wb_category field
          delete payload.wb_category;
        }

        if (editingItem.value) {
          console.log('[SAVE] Updating item with payload:', JSON.stringify(payload, null, 2));
          try {
            const response = await itemsService.update(editingItem.value.id, payload);
            console.log('[SAVE] Update response:', response);
            console.log('[SAVE] Response data:', JSON.stringify(response.data, null, 2));
          } catch (error) {
            console.error('[SAVE] Update error:', error);
            throw error;
          }
        } else {
          console.log('[SAVE] Creating item with payload:', JSON.stringify(payload, null, 2));
          await itemsService.create(payload);
        }
        closeModal();
        loadItems();
      } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item: ' + error.message);
      }
    };

    const deleteItem = async (id) => {
      if (confirm('Are you sure you want to delete this item?')) {
        try {
          await itemsService.delete(id);
          loadItems();
        } catch (error) {
          console.error('Error deleting item:', error);
          alert('Error deleting item: ' + error.message);
        }
      }
    };

    onMounted(() => {
      // Initialize filterCategory from selectedCategory prop
      filterCategory.value = props.selectedCategory || '';
      if (filterCategory.value) {
        sortBy.value = 'company';
        sortOrder.value = 'asc';
      }
      loadItems();
      loadCategories();
      loadBoxes();
    });

    watch(() => props.selectedCategory, (newVal) => {
      filterCategory.value = newVal || '';
      if (filterCategory.value) {
        sortBy.value = 'company';
        sortOrder.value = 'asc';
      }
      currentPage.value = 1;
      loadItems();
    });

    watch(() => searchQuery.value, () => {
      currentPage.value = 1;
      loadItems();
    });

    watch(() => filterCategory.value, () => {
      currentPage.value = 1;
    });

    return {
      items,
      categories,
      boxes,
      searchQuery,
      filterCategory,
      showAddModal,
      editingItem,
      formData,
      parameterDefinitions,
      enumOptions,
      categorySummary,
      openCategory,
      showNotesModal,
      viewingNotes,
      handleSearch,
      handleFilter,
      closeModal,
      closeNotesModal,
      viewNotes,
      parseParameters,
      getDisplayColumns,
      getAllDisplayColumns,
      getColumnLabel,
      hasSearchMatch,
      isCurrentCategoryScrews,
      isCurrentCategoryNuts,
      isCurrentCategoryBearings,
      isCurrentCategoryOilPastes,
      isCurrentCategoryBatteries,
      isCurrentCategoryOtherItems,
      isCurrentCategoryWashersBearings,
      currentPage,
      totalPages,
      paginatedItems,
      itemsPerPage,
      sortBy,
      sortOrder,
      handleSort,
      editItem,
      saveItem,
      deleteItem,
      formatExpirationDate,
      getExpirationStatusClass,
      excelDateToJSDate
    };
  }
};
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

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.items-table thead {
  background: #f8f9fa;
  border-bottom: 2px solid #ddd;
}

.items-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
}

.item-row {
  border-bottom: 1px solid #eee;
  transition: background 0.2s;
}

.item-row:hover {
  background: #f8f9fa;
}

.item-row.rc-part {
  background: #e3f2fd;
}

.item-row.rc-part:hover {
  background: #bbdefb;
}

.item-row.screw {
  background: #fff3e0;
}

.item-row.screw:hover {
  background: #ffe0b2;
}

.item-row.nut {
  background: #e8f5e9;
}

.item-row.nut:hover {
  background: #c8e6c9;
}

.item-row.bearing {
  background: #f3e5f5;
}

.item-row.bearing:hover {
  background: #e1bee7;
}

.item-row.oil-paste {
  background: #f0f4c3;
}

.item-row.oil-paste:hover {
  background: #e6f0a8;
}

.item-row.battery {
  background: #e8d4f1;
}

.item-row.battery:hover {
  background: #dfc4ea;
}

/* Expiration date styling */
.expiration-date {
  font-weight: 500;
}

.expiration-date.expired {
  background-color: #fee2e2;
  color: #991b1b;
  font-weight: 600;
}

.expiration-date.expiring-soon {
  background-color: #fef3c7;
  color: #92400e;
  font-weight: 600;
}

/* Table cell alignment and spacing */
.items-table td.size,
.items-table td.company,
.items-table td.model,
.items-table td.type,
.items-table td.mah,
.items-table td.rechargeable,
.items-table td.expiration-date {
  text-align: left;
  padding: 0.75rem 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.items-table td.rechargeable {
  text-align: center;
}

.items-table th {
  padding: 1rem 0.5rem;
  text-align: left;
}

.items-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.items-table th.sortable:hover {
  background: #e8eef7;
}

.items-table th.sortable.active {
  background: #d4dce8;
  font-weight: 600;
}

.items-table td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.item-name {
  font-weight: 500;
  color: #2c3e50;
  word-break: break-word;
}

.param-cell {
  font-size: 0.9rem;
  color: #555;
  padding: 0.75rem 0.75rem;
}

.param-cell:empty::before {
  content: '-';
  color: #bbb;
}

.category .badge {
  background: #e8f4f8;
  color: #0c5460;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.company, .model, .code {
  color: #2c5aa0;
  font-weight: 500;
}

.storage {
  color: #555;
  white-space: nowrap;
}

.quantity {
  font-weight: 600;
  color: #27ae60;
}

.details {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.details-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.notes-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.2rem;
  transition: transform 0.2s, opacity 0.2s;
}

.notes-btn:hover {
  transform: scale(1.2);
  opacity: 0.7;
}

.badge-match {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: help;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.badge-match:hover {
  opacity: 1;
}

.modal-content {
  max-height: 60vh;
  overflow-y: auto;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
}

.notes-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.6;
  color: #333;
  font-size: 0.95rem;
  margin: 0;
}

.params {
  display: inline-block;
  background: #d4edda;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.pagination {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.pagination-info {
  font-size: 0.9rem;
  color: #555;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-pagination {
  background: #3498db;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-weight: 500;
}

.btn-pagination:hover:not(:disabled) {
  background: #2980b9;
}

.btn-pagination:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  opacity: 0.6;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  background: white;
  color: #3498db;
  border: 1px solid #3498db;
  padding: 0.4rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
  font-size: 0.9rem;
}

.page-number:hover {
  background: #ecf0f1;
}

.page-number.active {
  background: #3498db;
  color: white;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;
}

.btn-edit {
  background: #3498db;
  color: white;
}

.btn-edit:hover {
  background: #2980b9;
}

.btn-delete {
  background: #e74c3c;
  color: white;
}

.btn-delete:hover {
  background: #c0392b;
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

.btn-secondary {
  background: #95a5a6;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-box {
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  transition: color 0.2s;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #2c3e50;
}

.modal-form {
  padding: 1.5rem;
}

.parameters-display {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.param-item {
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  gap: 0.5rem;
  word-break: break-word;
}

.param-item:last-child {
  border-bottom: none;
}

.param-item strong {
  min-width: 120px;
  color: #2c3e50;
  font-weight: 600;
}

.param-item span {
  color: #555;
  flex: 1;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-section {
  background: #f0f7ff;
  border-left: 4px solid #3498db;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
}

.section-title {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.form-section .form-group {
  margin-bottom: 1rem;
}

.form-section .form-group:last-child {
  margin-bottom: 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-group {
  margin-bottom: 1rem;
}

.checkbox-group .checkbox-label input[type="checkbox"] {
  width: auto;
  padding: 0;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.modal-actions button {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

@media (max-width: 768px) {
  .items-view {
    padding: 1rem;
  }

  .items-table {
    font-size: 0.85rem;
  }

  .items-table th,
  .items-table td {
    padding: 0.5rem;
  }

  .btn-small {
    padding: 0.3rem 0.6rem;
    font-size: 0.75rem;
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
