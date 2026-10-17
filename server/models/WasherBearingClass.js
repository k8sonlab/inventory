// Add this to the end of models/index.js - WasherBearing class

export class WasherBearing {
  static async getAll(filters = {}) {
    let sql = `
      SELECT wb.*, c.name as category_name, b.box_name, b.storage_id, s.location, 'washer_bearing' as source_type
      FROM washers_bearings wb
      LEFT JOIN categories c ON wb.category_id = c.id
      LEFT JOIN boxes b ON wb.box_id = b.id
      LEFT JOIN shelves s ON b.shelf_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';
    const likeOp = isPostgresDB() ? 'ILIKE' : 'LIKE';

    if (filters.category_id && filters.category_id !== '') {
      sql += ` AND wb.category_id = ${ph()}`;
      params.push(filters.category_id);
    }
    if (filters.box_id) {
      sql += ` AND wb.box_id = ${ph()}`;
      params.push(filters.box_id);
    }
    if (filters.wb_category) {
      sql += ` AND wb.category = ${ph()}`;
      params.push(filters.wb_category);
    }
    if (filters.subtype) {
      sql += ` AND wb.subtype = ${ph()}`;
      params.push(filters.subtype);
    }
    if (filters.search) {
      // Use COLLATE NOCASE for case-insensitive search in SQLite, or ILIKE for PostgreSQL
      const searchClause = isPostgresDB() 
        ? `(wb.name ${likeOp} ${ph()} OR b.storage_id ${likeOp} ${ph()} OR wb.notes ${likeOp} ${ph()} OR wb.subtype ${likeOp} ${ph()} OR wb.category ${likeOp} ${ph()} OR CAST(wb.inner_diameter AS TEXT) ${likeOp} ${ph()} OR CAST(wb.outer_diameter AS TEXT) ${likeOp} ${ph()} OR CAST(wb.thickness AS TEXT) ${likeOp} ${ph()})`
        : `(wb.name COLLATE NOCASE ${likeOp} ${ph()} OR b.storage_id COLLATE NOCASE ${likeOp} ${ph()} OR wb.notes COLLATE NOCASE ${likeOp} ${ph()} OR wb.subtype COLLATE NOCASE ${likeOp} ${ph()} OR wb.category COLLATE NOCASE ${likeOp} ${ph()} OR CAST(wb.inner_diameter AS TEXT) ${likeOp} ${ph()} OR CAST(wb.outer_diameter AS TEXT) ${likeOp} ${ph()} OR CAST(wb.thickness AS TEXT) ${likeOp} ${ph()})`;
      sql += ` AND ${searchClause}`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    sql += ` ORDER BY wb.name`;

    return await query(sql, params);
  }

  static async getById(id) {
    const sql = `SELECT wb.*, c.name as category_name, b.box_name, b.storage_id, s.location
       FROM washers_bearings wb
       LEFT JOIN categories c ON wb.category_id = c.id
       LEFT JOIN boxes b ON wb.box_id = b.id
       LEFT JOIN shelves s ON b.shelf_id = s.id
       WHERE wb.id = ${isPostgresDB() ? '$1' : '?'}`;

    const row = await queryOne(sql, [id]);
    return row;
  }

  static async create(data) {
    const id = uuidv4();
    const sql = `
      INSERT INTO washers_bearings (
        id, category, name, inner_diameter, outer_diameter, thickness, 
        subtype, material, quantity, box_id, category_id, notes, 
        created_at, updated_at
      ) VALUES (${isPostgresDB() ? '$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()' : '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\')'}
      )`;

    const params = [
      id,
      data.category || 'Bearing',
      data.name,
      data.inner_diameter || data.id_inner || null,
      data.outer_diameter || data.od || null,
      data.thickness || data.width || null,
      data.subtype || data.type || null,
      data.material || null,
      data.quantity || 0,
      data.box_id || null,
      data.category_id || null,
      data.notes || null
    ];

    await exec(sql, params);
    return { id, ...data };
  }

  static async update(id, data) {
    const updates = [];
    const params = [];
    let paramCount = 1;
    const ph = () => isPostgresDB() ? `$${paramCount++}` : '?';

    if (data.category) {
      updates.push(`category = ${ph()}`);
      params.push(data.category);
    }
    if (data.name) {
      updates.push(`name = ${ph()}`);
      params.push(data.name);
    }
    if (data.inner_diameter !== undefined) {
      updates.push(`inner_diameter = ${ph()}`);
      params.push(data.inner_diameter);
    }
    if (data.id_inner !== undefined) {
      updates.push(`inner_diameter = ${ph()}`);
      params.push(data.id_inner);
    }
    if (data.outer_diameter !== undefined) {
      updates.push(`outer_diameter = ${ph()}`);
      params.push(data.outer_diameter);
    }
    if (data.od !== undefined) {
      updates.push(`outer_diameter = ${ph()}`);
      params.push(data.od);
    }
    if (data.thickness !== undefined) {
      updates.push(`thickness = ${ph()}`);
      params.push(data.thickness);
    }
    if (data.width !== undefined) {
      updates.push(`thickness = ${ph()}`);
      params.push(data.width);
    }
    if (data.subtype) {
      updates.push(`subtype = ${ph()}`);
      params.push(data.subtype);
    }
    if (data.type) {
      updates.push(`subtype = ${ph()}`);
      params.push(data.type);
    }
    if (data.material) {
      updates.push(`material = ${ph()}`);
      params.push(data.material);
    }
    if (data.quantity !== undefined) {
      updates.push(`quantity = ${ph()}`);
      params.push(data.quantity);
    }
    if (data.box_id !== undefined) {
      updates.push(`box_id = ${ph()}`);
      params.push(data.box_id);
    }
    if (data.category_id !== undefined) {
      updates.push(`category_id = ${ph()}`);
      params.push(data.category_id);
    }
    if (data.notes) {
      updates.push(`notes = ${ph()}`);
      params.push(data.notes);
    }

    updates.push(`updated_at = ${isPostgresDB() ? 'NOW()' : "datetime('now')"}`);

    if (updates.length === 0) return { id };

    const sql = `UPDATE washers_bearings SET ${updates.join(', ')} WHERE id = ${ph()}`;
    params.push(id);

    await exec(sql, params);
    return { id, ...data };
  }

  static async delete(id) {
    const sql = `DELETE FROM washers_bearings WHERE id = ${isPostgresDB() ? '$1' : '?'}`;
    await exec(sql, [id]);
    return { success: true };
  }

  // Helper function to parse bearing model numbers (e.g., "6801RS" -> {id_inner: 8, od: 10, subtype: "RS"})
  static parseBearingModel(name) {
    const result = {
      inner_diameter: null,
      outer_diameter: null,
      thickness: null,
      subtype: null,
      name: name
    };

    // Common bearing seal types
    const sealTypes = ['RS', 'ZZ', 'OPEN', '2RS', 'METAL', 'RUBBER', 'RVF', 'VV', 'Z'];
    
    // Try to extract seal type
    for (const seal of sealTypes) {
      if (name.toUpperCase().includes(seal)) {
        result.subtype = seal;
        break;
      }
    }

    // Try to parse dimensions from model number
    // This is a simplified parser - real bearing models are complex
    // Common patterns: "6801RS" (8mm ID, 10mm OD), "688RS" (8mm ID, 16mm OD)
    const match = name.match(/^(\d)(\d)(\d)(\d)/);
    if (match) {
      // Decode bearing dimensions from model number
      const d = parseInt(match[1]) * 10;  // Inner diameter
      const D = parseInt(match[2]) * 10 + parseInt(match[3]);  // Outer diameter
      const B = parseInt(match[4]); // Thickness
      result.inner_diameter = d;
      result.outer_diameter = D;
      result.thickness = B;
    }

    return result;
  }

  // Helper function to parse washer size strings (e.g., "6X2.5x0.5" -> {outer_diameter: 6, inner_diameter: 2.5, thickness: 0.5})
  static parseWasherSize(size, name = '') {
    const result = {
      outer_diameter: null,
      inner_diameter: null,
      thickness: null,
      subtype: null,
      name: name || size
    };

    if (!size) return result;

    // Detect subtype from name
    const nameUpper = (name || '').toUpperCase();
    if (nameUpper.includes('LOCKING')) {
      result.subtype = nameUpper.includes('TYPE 2') ? 'Locking type 2' : 'Locking';
    } else if (nameUpper.includes('NORMAL')) {
      result.subtype = 'Normal';
    }

    // Parse size string: "6X2.5x0.5" or "6x2.5x0.5" or "M2" or "15x6x1.2"
    const sizeUpper = size.toUpperCase();
    
    // Try pattern: OD x ID x Thickness
    const match = sizeUpper.match(/(\d+\.?\d*)\s*[Xx]\s*(\d+\.?\d*)\s*[Xx]\s*(\d+\.?\d*)/);
    if (match) {
      result.outer_diameter = parseFloat(match[1]);
      result.inner_diameter = parseFloat(match[2]);
      result.thickness = parseFloat(match[3]);
      return result;
    }

    // Try M-series (metric, e.g., "M2", "M3", "M4")
    const mMatch = sizeUpper.match(/M(\d+)/);
    if (mMatch) {
      const mSize = parseInt(mMatch[1]);
      // Approximate standard dimensions for metric washers
      const metricWasherSpecs = {
        2: { id: 2.2, od: 5, thickness: 0.3 },
        3: { id: 3.2, od: 7, thickness: 0.5 },
        4: { id: 4.3, od: 9, thickness: 0.8 },
        5: { id: 5.3, od: 10, thickness: 1 },
        6: { id: 6.4, od: 12, thickness: 1.6 },
        8: { id: 8.4, od: 16, thickness: 1.6 },
        10: { id: 10.5, od: 20, thickness: 2 },
        12: { id: 13, od: 24, thickness: 2.5 }
      };
      if (metricWasherSpecs[mSize]) {
        result.inner_diameter = metricWasherSpecs[mSize].id;
        result.outer_diameter = metricWasherSpecs[mSize].od;
        result.thickness = metricWasherSpecs[mSize].thickness;
      }
    }

    return result;
  }
}
