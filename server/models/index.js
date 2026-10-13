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
      WHERE i.item_type NOT IN ('RC Parts', 'Screws', 'Nuts', 'Bearings', 'Oils/Pastes') AND i.item_type != 'Other Items'
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND i.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
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
    return await query('SELECT * FROM categories ORDER BY sort_order, name');
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

  static async getByShelfId(shelf_id) {
    const sql = `SELECT b.*, s.shelf_code FROM boxes b LEFT JOIN shelves s ON b.shelf_id = s.id WHERE b.shelf_id = ${isPostgresDB() ? '$1' : '?'} ORDER BY b.storage_id`;
    return await query(sql, [shelf_id]);
  }

  static async create(shelf_id, storage_id = null, box_name = '', box_type = '') {
    // If storage_id not provided, auto-generate based on shelf
    let finalStorageId = storage_id;
    let finalBoxName = box_name;
    
    if (!finalStorageId) {
      // Get shelf info
      const shelf = await Shelf.getById(shelf_id);
      if (!shelf) throw new Error('Shelf not found');
      
      // Get existing boxes for this shelf to determine next number
      const existingBoxes = await Box.getByShelfId(shelf_id);
      const nextNum = (existingBoxes.length + 1).toString().padStart(2, '0');
      
      finalStorageId = `${shelf.shelf_code}-B${nextNum}`;
      finalBoxName = finalBoxName || finalStorageId;
    }
    
    // Check if box already exists
    const existing = await Box.getByStorageId(finalStorageId);
    if (existing) return existing;

    const id = uuidv4();
    const now = NOW();
    const sql = `INSERT INTO boxes (id, shelf_id, storage_id, box_name, box_type, created_at) VALUES (${isPostgresDB() ? '$1, $2, $3, $4, $5' : '?, ?, ?, ?, ?'}, ${now})`;
    await exec(sql, [id, shelf_id, finalStorageId, finalBoxName, box_type]);
    return { id, shelf_id, storage_id: finalStorageId, box_name: finalBoxName, box_type };
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

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND r.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
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
    const { name, company, model, item_code, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `INSERT INTO rc_parts (id, name, company, model, item_code, box_id, category_id, quantity, notes, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, $8, $9, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    await exec(sql, [id, name || null, company || null, model || null, item_code || 'RC Part', box_id || null, category_id || null, quantity || 0, notes || null]);
    return await RCPart.getById(id);
  }

  static async update(id, data) {
    const { name, company, model, item_code, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `UPDATE rc_parts SET name = `;
    
    if (isPostgresDB()) {
      sql += `$1, company = $2, model = $3, item_code = $4, box_id = $5, category_id = $6, quantity = $7, notes = $8, updated_at = ${now} WHERE id = $9`;
    } else {
      sql += `?, company = ?, model = ?, item_code = ?, box_id = ?, category_id = ?, quantity = ?, notes = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    await exec(sql, [name || null, company || null, model || null, item_code || 'RC Part', box_id || null, category_id || null, quantity, notes || null, id]);
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
    const screws = await Screw.getAll(filters);
    const nuts = await Nut.getAll(filters);
    const bearings = await Bearing.getAll(filters);
    const oilPastes = await OilPaste.getAll(filters);
    const batteries = await Battery.getAll(filters);
    const otherItems = await OtherItem.getAll(filters);
    
    console.log(`[getAllCombined] items=${items.length}, rcParts=${rcParts.length}, screws=${screws.length}, nuts=${nuts.length}, bearings=${bearings.length}, oilPastes=${oilPastes.length}, batteries=${batteries.length}, otherItems=${otherItems.length}`);
    
    // Combine and format all types
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
      })),
      ...screws.map(s => ({
        ...s,
        id: s.id,
        source_type: 'screw',
        display_name: s.name,
        display_company: null,
        display_model: null,
        display_code: null,
        item_type: 'Screws'
      })),
      ...nuts.map(n => ({
        ...n,
        id: n.id,
        source_type: 'nut',
        display_name: n.name,
        display_company: null,
        display_model: null,
        display_code: null,
        item_type: 'Nuts'
      })),
      ...bearings.map(br => ({
        ...br,
        id: br.id,
        source_type: 'bearing',
        display_name: br.name,
        display_company: null,
        display_model: null,
        display_code: null,
        item_type: 'Bearings'
      })),
      ...oilPastes.map(op => ({
        ...op,
        id: op.id,
        source_type: 'oil_paste',
        display_name: op.name,
        display_company: null,
        display_model: null,
        display_code: null,
        item_type: 'Oils/Pastes'
      })),
      ...batteries.map(bat => ({
        ...bat,
        id: bat.id,
        source_type: 'battery',
        display_name: `${bat.company} ${bat.size}`,
        display_company: null,
        display_model: null,
        display_code: null,
        item_type: 'Batteries'
      })),
      ...otherItems.map(oi => ({
        ...oi,
        id: oi.id,
        source_type: 'other_item',
        display_name: oi.name,
        display_company: oi.company,
        display_model: oi.size,
        display_code: null,
        item_type: oi.item_type
      }))
    ];
    
    return combined;
  }
}

export class Screw {
  static async getAll(filters = {}) {
    let sql = `
      SELECT s.*, b.box_name, b.storage_id, sh.location, 'screw' as source_type
      FROM screws s
      LEFT JOIN boxes b ON s.box_id = b.id
      LEFT JOIN shelves sh ON b.shelf_id = sh.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND s.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
    if (filters.box_id) {
      sql += ` AND s.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.search) {
      sql += ` AND (s.name ${likeOp} ${ph()} OR s.size ${likeOp} ${ph()} OR s.length ${likeOp} ${ph()} OR s.head_type ${likeOp} ${ph()} OR s.drive_type ${likeOp} ${ph()} OR s.thread_type ${likeOp} ${ph()} OR s.color ${likeOp} ${ph()} OR s.material ${likeOp} ${ph()} OR b.storage_id ${likeOp} ${ph()} OR s.notes ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY s.size, s.length`;

    return await query(sql, params);
  }

  static async getById(id) {
    const sql = `SELECT s.*, b.box_name, b.storage_id, sh.location
       FROM screws s
       LEFT JOIN boxes b ON s.box_id = b.id
       LEFT JOIN shelves sh ON b.shelf_id = sh.id
       WHERE s.id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const { name, size, length, head_type, drive_type, thread_type, color, material, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `INSERT INTO screws (id, name, size, length, head_type, drive_type, thread_type, color, material, box_id, category_id, quantity, notes, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    await exec(sql, [id, name || null, size || null, length || null, head_type || null, drive_type || null, thread_type || null, color || null, material || null, box_id || null, category_id || null, quantity || 0, notes || null]);
    return await Screw.getById(id);
  }

  static async update(id, data) {
    const { name, size, length, head_type, drive_type, thread_type, color, material, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `UPDATE screws SET name = `;
    
    if (isPostgresDB()) {
      sql += `$1, size = $2, length = $3, head_type = $4, drive_type = $5, thread_type = $6, color = $7, material = $8, box_id = $9, category_id = $10, quantity = $11, notes = $12, updated_at = ${now} WHERE id = $13`;
    } else {
      sql += `?, size = ?, length = ?, head_type = ?, drive_type = ?, thread_type = ?, color = ?, material = ?, box_id = ?, category_id = ?, quantity = ?, notes = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    await exec(sql, [name || null, size || null, length || null, head_type || null, drive_type || null, thread_type || null, color || null, material || null, box_id || null, category_id || null, quantity || 0, notes || null, id]);
    return await Screw.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM screws WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }
}

export class Nut {
  static async getAll(filters = {}) {
    let sql = `
      SELECT n.*, b.box_name, b.storage_id, sh.location, 'nut' as source_type
      FROM nuts n
      LEFT JOIN boxes b ON n.box_id = b.id
      LEFT JOIN shelves sh ON b.shelf_id = sh.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND n.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
    if (filters.box_id) {
      sql += ` AND n.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.search) {
      sql += ` AND (n.name ${likeOp} ${ph()} OR n.size ${likeOp} ${ph()} OR n.type ${likeOp} ${ph()} OR n.color ${likeOp} ${ph()} OR b.storage_id ${likeOp} ${ph()} OR n.notes ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY n.size, n.type`;

    return await query(sql, params);
  }

  static async getById(id) {
    const sql = `SELECT n.*, b.box_name, b.storage_id, sh.location
       FROM nuts n
       LEFT JOIN boxes b ON n.box_id = b.id
       LEFT JOIN shelves sh ON b.shelf_id = sh.id
       WHERE n.id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const { name, size, type, color, has_washer, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `INSERT INTO nuts (id, name, size, type, color, has_washer, box_id, category_id, quantity, notes, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    await exec(sql, [id, name || null, size || null, type || null, color || null, has_washer ? 1 : 0, box_id || null, category_id || null, quantity || 0, notes || null]);
    return await Nut.getById(id);
  }

  static async update(id, data) {
    const { name, size, type, color, has_washer, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `UPDATE nuts SET name = `;
    
    if (isPostgresDB()) {
      sql += `$1, size = $2, type = $3, color = $4, has_washer = $5, box_id = $6, category_id = $7, quantity = $8, notes = $9, updated_at = ${now} WHERE id = $10`;
    } else {
      sql += `?, size = ?, type = ?, color = ?, has_washer = ?, box_id = ?, category_id = ?, quantity = ?, notes = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    await exec(sql, [name || null, size || null, type || null, color || null, has_washer ? 1 : 0, box_id || null, category_id || null, quantity || 0, notes || null, id]);
    return await Nut.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM nuts WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }
}

export class Bearing {
  static async getAll(filters = {}) {
    let sql = `
      SELECT b.*, bo.box_name, bo.storage_id, sh.location, 'bearing' as source_type
      FROM bearings b
      LEFT JOIN boxes bo ON b.box_id = bo.id
      LEFT JOIN shelves sh ON bo.shelf_id = sh.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND b.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
    if (filters.box_id) {
      sql += ` AND b.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.search) {
      sql += ` AND (b.name ${likeOp} ${ph()} OR b.type ${likeOp} ${ph()} OR b.seal_type ${likeOp} ${ph()} OR bo.storage_id ${likeOp} ${ph()} OR b.notes ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY b.type, b.name`;

    return await query(sql, params);
  }

  static async getById(id) {
    const sql = `SELECT b.*, bo.box_name, bo.storage_id, sh.location
       FROM bearings b
       LEFT JOIN boxes bo ON b.box_id = bo.id
       LEFT JOIN shelves sh ON bo.shelf_id = sh.id
       WHERE b.id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const { name, type, seal_type, id_inner, od, width, flanged, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `INSERT INTO bearings (id, name, type, seal_type, id_inner, od, width, flanged, box_id, category_id, quantity, notes, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    await exec(sql, [id, name || null, type || null, seal_type || null, id_inner || null, od || null, width || null, flanged ? 1 : 0, box_id || null, category_id || null, quantity || 0, notes || null]);
    return await Bearing.getById(id);
  }

  static async update(id, data) {
    const { name, type, seal_type, id_inner, od, width, flanged, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `UPDATE bearings SET name = `;
    
    if (isPostgresDB()) {
      sql += `$1, type = $2, seal_type = $3, id_inner = $4, od = $5, width = $6, flanged = $7, box_id = $8, category_id = $9, quantity = $10, notes = $11, updated_at = ${now} WHERE id = $12`;
    } else {
      sql += `?, type = ?, seal_type = ?, id_inner = ?, od = ?, width = ?, flanged = ?, box_id = ?, category_id = ?, quantity = ?, notes = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    await exec(sql, [name || null, type || null, seal_type || null, id_inner || null, od || null, width || null, flanged ? 1 : 0, box_id || null, category_id || null, quantity || 0, notes || null, id]);
    return await Bearing.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM bearings WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }
}

export class OilPaste {
  static async getAll(filters = {}) {
    let sql = `
      SELECT o.*, bo.box_name, bo.storage_id, sh.location, 'oil_paste' as source_type
      FROM oil_pastes o
      LEFT JOIN boxes bo ON o.box_id = bo.id
      LEFT JOIN shelves sh ON bo.shelf_id = sh.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND o.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
    if (filters.box_id) {
      sql += ` AND o.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.search) {
      sql += ` AND (o.name ${likeOp} ${ph()} OR o.company ${likeOp} ${ph()} OR o.type ${likeOp} ${ph()} OR o.characteristic ${likeOp} ${ph()} OR bo.storage_id ${likeOp} ${ph()} OR o.notes ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY o.company, o.type, o.name`;

    try {
      const result = await query(sql, params);
      console.log(`[OilPaste.getAll] Query result: ${result ? result.length : 0} rows`);
      if (result && result.length === 0) {
        console.log(`[OilPaste.getAll] DEBUG - SQL: ${sql}`);
      }
      return result;
    } catch (error) {
      console.error(`[OilPaste.getAll] ERROR:`, error.message);
      throw error;
    }
  }

  static async getById(id) {
    const sql = `SELECT o.*, bo.box_name, bo.storage_id, sh.location
       FROM oil_pastes o
       LEFT JOIN boxes bo ON o.box_id = bo.id
       LEFT JOIN shelves sh ON bo.shelf_id = sh.id
       WHERE o.id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const { name, company, type, characteristic, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `INSERT INTO oil_pastes (id, name, company, type, characteristic, box_id, category_id, quantity, notes, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, $8, $9, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    await exec(sql, [id, name || null, company || null, type || null, characteristic || null, box_id || null, category_id || null, quantity || 0, notes || null]);
    return await OilPaste.getById(id);
  }

  static async update(id, data) {
    const { name, company, type, characteristic, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `UPDATE oil_pastes SET name = `;
    
    if (isPostgresDB()) {
      sql += `$1, company = $2, type = $3, characteristic = $4, box_id = $5, category_id = $6, quantity = $7, notes = $8, updated_at = ${now} WHERE id = $9`;
    } else {
      sql += `?, company = ?, type = ?, characteristic = ?, box_id = ?, category_id = ?, quantity = ?, notes = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    await exec(sql, [name || null, company || null, type || null, characteristic || null, box_id || null, category_id || null, quantity || 0, notes || null, id]);
    return await OilPaste.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM oil_pastes WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }
}

export class Battery {
  static async getAll(filters = {}) {
    let sql = `
      SELECT b.*, bo.box_name, bo.storage_id, sh.location, 'battery' as source_type
      FROM batteries b
      LEFT JOIN boxes bo ON b.box_id = bo.id
      LEFT JOIN shelves sh ON bo.shelf_id = sh.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND b.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
    if (filters.box_id) {
      sql += ` AND b.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.search) {
      sql += ` AND (b.size ${likeOp} ${ph()} OR b.company ${likeOp} ${ph()} OR b.model ${likeOp} ${ph()} OR b.type ${likeOp} ${ph()} OR bo.storage_id ${likeOp} ${ph()} OR b.notes ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY b.size, b.company, b.model, b.type`;

    try {
      const result = await query(sql, params);
      console.log(`[Battery.getAll] Query result: ${result ? result.length : 0} rows`);
      if (result && result.length === 0) {
        console.log(`[Battery.getAll] DEBUG - SQL: ${sql}`);
      }
      return result;
    } catch (error) {
      console.error(`[Battery.getAll] ERROR:`, error.message);
      throw error;
    }
  }

  static async getById(id) {
    const sql = `SELECT b.*, bo.box_name, bo.storage_id, sh.location
       FROM batteries b
       LEFT JOIN boxes bo ON b.box_id = bo.id
       LEFT JOIN shelves sh ON bo.shelf_id = sh.id
       WHERE b.id = ${isPostgresDB() ? '$1' : '?'}`;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const { size, company, model, type, expiration_date, mah, rechargeable, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `INSERT INTO batteries (id, size, company, model, type, expiration_date, mah, rechargeable, box_id, category_id, quantity, notes, created_at, updated_at)
       VALUES (`;
    
    if (isPostgresDB()) {
      sql += `$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, ${now}, ${now})`;
    } else {
      sql += `?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${now}, ${now})`;
    }
    
    // Ensure rechargeable is 0 or 1, not boolean
    let rechargeableValue;
    if (isPostgresDB()) {
      rechargeableValue = rechargeable ? true : false;  // PostgreSQL expects boolean
    } else {
      rechargeableValue = rechargeable ? 1 : 0;  // SQLite expects integer
    }
    
    await exec(sql, [id, size || null, company || null, model || null, type || null, expiration_date || null, mah || null, rechargeableValue, box_id || null, category_id || null, quantity || 0, notes || null]);
    return await Battery.getById(id);
  }

  static async update(id, data) {
    const { size, company, model, type, expiration_date, mah, rechargeable, box_id, category_id, quantity, notes } = data;
    const now = NOW();
    
    let sql = `UPDATE batteries SET size = `;
    
    if (isPostgresDB()) {
      sql += `$1, company = $2, model = $3, type = $4, expiration_date = $5, mah = $6, rechargeable = $7, box_id = $8, category_id = $9, quantity = $10, notes = $11, updated_at = ${now} WHERE id = $12`;
    } else {
      sql += `?, company = ?, model = ?, type = ?, expiration_date = ?, mah = ?, rechargeable = ?, box_id = ?, category_id = ?, quantity = ?, notes = ?, updated_at = ${now} WHERE id = ?`;
    }
    
    // Ensure rechargeable is 0 or 1, not boolean
    let rechargeableValue;
    if (isPostgresDB()) {
      rechargeableValue = rechargeable ? true : false;  // PostgreSQL expects boolean
    } else {
      rechargeableValue = rechargeable ? 1 : 0;  // SQLite expects integer
    }
    
    const params = [size || null, company || null, model || null, type || null, expiration_date || null, mah || null, rechargeableValue, box_id || null, category_id || null, quantity || 0, notes || null, id];
    
    await exec(sql, params);
    return await Battery.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM batteries WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }
}

export class OtherItem {
  static async getAll(filters = {}) {
    let sql = `
      SELECT o.*, bo.box_name, bo.storage_id, sh.location, 'other_item' as source_type
      FROM other_items o
      LEFT JOIN boxes bo ON o.box_id = bo.id
      LEFT JOIN shelves sh ON bo.shelf_id = sh.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';
    
    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND o.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
    if (filters.box_id) {
      sql += ` AND o.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.search) {
      sql += ` AND (o.name ${likeOp} ${ph()} OR o.item_type ${likeOp} ${ph()} OR o.size ${likeOp} ${ph()} OR o.company ${likeOp} ${ph()} OR bo.storage_id ${likeOp} ${ph()} OR o.notes ${likeOp} ${ph()})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }
    
    sql += ` ORDER BY o.item_type, o.size`;
    return await query(sql, params);
  }

  static async getById(id) {
    const sql = `
      SELECT o.*, bo.box_name, bo.storage_id, sh.location, 'other_item' as source_type
      FROM other_items o
      LEFT JOIN boxes bo ON o.box_id = bo.id
      LEFT JOIN shelves sh ON bo.shelf_id = sh.id
      WHERE o.id = ${isPostgresDB() ? '$1' : '?'}
    `;
    return await queryOne(sql, [id]);
  }

  static async create(data) {
    const id = uuidv4();
    const now = NOW();
    const { item_type, size, name, company, quantity, box_id, category_id, notes } = data;
    
    const sql = `
      INSERT INTO other_items (id, item_type, size, name, company, quantity, box_id, category_id, notes, created_at, updated_at)
      VALUES (${isPostgresDB() ? '$1, $2, $3, $4, $5, $6, $7, $8, $9' : '?, ?, ?, ?, ?, ?, ?, ?, ?'}, ${now}, ${now})
    `;
    const params = [id, item_type || null, size || null, name || null, company || null, quantity || 0, box_id || null, category_id || null, notes || null];
    await exec(sql, params);
    return await OtherItem.getById(id);
  }

  static async update(id, data) {
    const { item_type, size, name, company, quantity, box_id, category_id, notes } = data;
    const sql = `
      UPDATE other_items 
      SET item_type = ${isPostgresDB() ? '$1' : '?'}, 
          size = ${isPostgresDB() ? '$2' : '?'}, 
          name = ${isPostgresDB() ? '$3' : '?'},
          company = ${isPostgresDB() ? '$4' : '?'},
          quantity = ${isPostgresDB() ? '$5' : '?'}, 
          box_id = ${isPostgresDB() ? '$6' : '?'}, 
          category_id = ${isPostgresDB() ? '$7' : '?'}, 
          notes = ${isPostgresDB() ? '$8' : '?'}, 
          updated_at = ${NOW()}
      WHERE id = ${isPostgresDB() ? '$9' : '?'}
    `;
    const params = [item_type || null, size || null, name || null, company || null, quantity || 0, box_id || null, category_id || null, notes || null, id];
    await exec(sql, params);
    return await OtherItem.getById(id);
  }

  static async delete(id) {
    const sql = `DELETE FROM other_items WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }
}