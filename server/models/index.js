import { query, queryOne, exec, isPostgresDB } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const NOW = () => isPostgresDB() ? 'NOW()' : "datetime('now')";

export class Item {
  static async getAll(filters = {}) {
    let sql = `
      SELECT i.*, c.name as category_name, b.box_name, b.storage_id, s.location, 'item' as source_type
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN boxes b ON i.box_id = b.id
      LEFT JOIN shelves s ON b.shelf_id = s.id
      WHERE i.item_type != 'RC Parts'
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.box_id) {
      sql += ` AND i.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.item_type) {
      sql += ` AND i.item_type = ${ph()}`;
      params.push(filters.item_type);
    }
    if (filters.search) {
      sql += ` AND (i.name ${likeOp} ${ph()} OR b.storage_id ${likeOp} ${ph()} OR i.notes ${likeOp} ${ph()} OR i.parameters ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY i.name`;

    return await query(sql, params);
  }

  static async getById(id) {
    const sql = `SELECT i.*, c.name as category_name, b.box_name, b.storage_id, s.location
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN boxes b ON i.box_id = b.id
       LEFT JOIN shelves s ON b.shelf_id = s.id
       WHERE i.id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const { name, item_type, category_id, box_id, quantity, notes, parameters } = data;
    const now = NOW();
    
    let sql = `INSERT INTO items (id, name, item_type, category_id, box_id, quantity, notes, parameters, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, $8, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    await exec(sql, [id, name, item_type, category_id, box_id, quantity || 0, notes || null, JSON.stringify(parameters || {})]);
    return await Item.getById(id);
  }

  static async update(id, data) {
    const { name, item_type, category_id, box_id, quantity, notes, parameters } = data;
    const now = NOW();
    
    let sql = `UPDATE items SET name = `;
    
    if (isPostgresDB()) {
      sql += `$1, item_type = $2, category_id = $3, box_id = $4, quantity = $5, notes = $6, parameters = $7, updated_at = ${now} WHERE id = $8`;
    } else {
      sql += `?, item_type = ?, category_id = ?, box_id = ?, quantity = ?, notes = ?, parameters = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    await exec(sql, [name, item_type, category_id, box_id, quantity, notes || null, JSON.stringify(parameters || {}), id]);
    return await Item.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM items WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { id };
  }
}

export class Category {
  static async getAll() {
    return await query('SELECT * FROM categories ORDER BY name');
  }

  static async create(name) {
    // Check if category already exists
    const existing = await Category.getByName(name);
    if (existing) return existing;

    const id = uuidv4();
    const now = NOW();
    const sql = `INSERT INTO categories (id, name, created_at) VALUES (${isPostgresDB() ? '$1, $2' : '?, ?'}, ${now})`;
    await exec(sql, [id, name]);
    return { id, name };
  }

  static async getByName(name) {
    const sql = `SELECT * FROM categories WHERE name = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [name]);
  }

  static async delete(id) {
    const sql = `DELETE FROM categories WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { id };
  }
}

export class Shelf {
  static async getAll() {
    return await query('SELECT * FROM shelves ORDER BY shelf_code');
  }

  static async create(shelf_code, location, notes = '') {
    // Check if shelf already exists
    const existing = await Shelf.getByCode(shelf_code);
    if (existing) return existing;

    const id = uuidv4();
    const now = NOW();
    const sql = `INSERT INTO shelves (id, shelf_code, location, notes, created_at) VALUES (${isPostgresDB() ? '$1, $2, $3, $4' : '?, ?, ?, ?'}, ${now})`;
    await exec(sql, [id, shelf_code, location, notes]);
    return { id, shelf_code, location, notes };
  }

  static async getById(id) {
    const sql = `SELECT * FROM shelves WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async getByCode(shelf_code) {
    const sql = `SELECT * FROM shelves WHERE shelf_code = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [shelf_code]);
  }
}

export class Box {
  static async getAll() {
    const sql = `SELECT b.*, s.shelf_code, s.location FROM boxes b LEFT JOIN shelves s ON b.shelf_id = s.id ORDER BY b.storage_id`;
    return await query(sql);
  }

  static async create(shelf_id, storage_id, box_name, box_type = '') {
    // Check if box already exists
    const existing = await Box.getByStorageId(storage_id);
    if (existing) return existing;

    const id = uuidv4();
    const now = NOW();
    const sql = `INSERT INTO boxes (id, shelf_id, storage_id, box_name, box_type, created_at) VALUES (${isPostgresDB() ? '$1, $2, $3, $4, $5' : '?, ?, ?, ?, ?'}, ${now})`;
    await exec(sql, [id, shelf_id, storage_id, box_name, box_type]);
    return { id, shelf_id, storage_id, box_name, box_type };
  }

  static async getByStorageId(storage_id) {
    const sql = `SELECT * FROM boxes WHERE storage_id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [storage_id]);
  }

  static async delete(id) {
    const sql = `DELETE FROM boxes WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { id };
  }
}

export class CatalogEnum {
  static async getByType(enum_type) {
    const sql = `SELECT value FROM catalog_enums WHERE enum_type = ${isPostgresDB() ? '$1' : '?'} ORDER BY value`;
    const rows = await query(sql, [enum_type]);
    return rows.map(r => r.value);
  }

  static async getByTypeAndValue(enum_type, value) {
    const sql = `SELECT * FROM catalog_enums WHERE enum_type = ${isPostgresDB() ? '$1' : '?'} AND value = ${isPostgresDB() ? '$2' : '?'}`;
    return await queryOne(sql, [enum_type, value]);
  }

  static async create(enum_type, value) {
    // Check if this enum value already exists
    const existing = await CatalogEnum.getByTypeAndValue(enum_type, value);
    if (existing) return existing;

    const id = uuidv4();
    const now = NOW();
    const sql = `INSERT INTO catalog_enums (id, enum_type, value, created_at) VALUES (${isPostgresDB() ? '$1, $2, $3' : '?, ?, ?'}, ${now})`;
    await exec(sql, [id, enum_type, value]);
    return { id, enum_type, value };
  }

  static async getAllTypes() {
    const rows = await query(`SELECT DISTINCT enum_type FROM catalog_enums ORDER BY enum_type`);
    return rows.map(r => r.enum_type);
  }

  static async delete(enum_type, value) {
    const sql = `DELETE FROM catalog_enums WHERE enum_type = ${isPostgresDB() ? '$1' : '?'} AND value = ${isPostgresDB() ? '$2' : '?'}`;
    await exec(sql, [enum_type, value]);
    return { success: true };
  }
}

export class RCPart {
  static async getAll(filters = {}) {
    let sql = `
      SELECT r.*, b.box_name, b.storage_id, s.location, 'rc_part' as source_type
      FROM rc_parts r
      LEFT JOIN boxes b ON r.box_id = b.id
      LEFT JOIN shelves s ON b.shelf_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.box_id) {
      sql += ` AND r.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.search) {
      sql += ` AND (r.company ${likeOp} ${ph()} OR r.model ${likeOp} ${ph()} OR r.item_code ${likeOp} ${ph()} OR b.storage_id ${likeOp} ${ph()} OR r.notes ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY r.company, r.model, r.item_code`;

    return await query(sql, params);
  }

  static async getById(id) {
    const sql = `SELECT r.*, b.box_name, b.storage_id, s.location
       FROM rc_parts r
       LEFT JOIN boxes b ON r.box_id = b.id
       LEFT JOIN shelves s ON b.shelf_id = s.id
       WHERE r.id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const { company, model, item_code, box_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `INSERT INTO rc_parts (id, company, model, item_code, box_id, quantity, notes, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    await exec(sql, [id, company || null, model || null, item_code, box_id || null, quantity || 0, notes || null]);
    return await RCPart.getById(id);
  }

  static async update(id, data) {
    const { company, model, item_code, box_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `UPDATE rc_parts SET company = `;
    
    if (isPostgresDB()) {
      sql += `$1, model = $2, item_code = $3, box_id = $4, quantity = $5, notes = $6, updated_at = ${now} WHERE id = $7`;
    } else {
      sql += `?, model = ?, item_code = ?, box_id = ?, quantity = ?, notes = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    await exec(sql, [company || null, model || null, item_code, box_id || null, quantity, notes || null, id]);
    return await RCPart.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM rc_parts WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }

  static async getAllCombined(filters = {}) {
    const items = await Item.getAll(filters);
    const rcParts = await RCPart.getAll(filters);
    
    // Combine and format both types
    const combined = [
      ...items.map(i => ({
        ...i,
        source_type: 'item',
        display_name: i.name,
        display_company: null,
        display_model: null,
        display_code: null
      })),
      ...rcParts.map(r => ({
        ...r,
        id: r.id,
        source_type: 'rc_part',
        display_name: null,
        display_company: r.company,
        display_model: r.model,
        display_code: r.item_code,
        item_type: 'RC Parts'
      }))
    ];
    
    return combined;
  }
}

