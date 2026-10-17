import { initializeDatabase, query, exec, closeDatabase, isPostgresDB } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

async function migrateBearingsAndWashersData() {
  try {
    console.log('\n📦 Starting migration: Bearings & Washers → Unified Table\n');
    await initializeDatabase();

    // 1. Migrate existing bearings from bearings table
    console.log('🔄 Migrating bearings from bearings table...');
    const bearingRows = await query('SELECT * FROM bearings WHERE quantity > 0 OR id IS NOT NULL', []);
    console.log(`Found ${bearingRows.length} bearings to migrate`);

    for (const bearing of bearingRows) {
      const wb_id = uuidv4();
      const sql = `
        INSERT INTO washers_bearings (
          id, category, name, inner_diameter, outer_diameter, thickness,
          subtype, material, quantity, box_id, category_id, notes,
          created_at, updated_at
        ) VALUES (
          ${isPostgresDB() ? '$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()' : '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\')'}
        )
      `;
      
      const params = [
        wb_id,
        'Bearing',
        bearing.name,
        bearing.id_inner || bearing.od_inner || null,
        bearing.od || null,
        bearing.width || null,
        bearing.type || bearing.seal_type || null,
        null, // material not in old table
        bearing.quantity || 0,
        bearing.box_id || null,
        bearing.category_id || null,
        bearing.notes || null
      ];

      try {
        await exec(sql, params);
      } catch (e) {
        console.log(`  ⚠️  Skipped bearing ${bearing.name}: ${e.message.substring(0, 50)}`);
      }
    }
    console.log(`✅ Migrated ${bearingRows.length} bearings\n`);

    // 2. Migrate washers from other_items table
    console.log('🔄 Migrating washers from other_items table...');
    const washerRows = await query('SELECT * FROM other_items WHERE item_type = ?', ['Washer']);
    console.log(`Found ${washerRows.length} washers to migrate`);

    for (const washer of washerRows) {
      const wb_id = uuidv4();
      
      // Parse washer size to extract dimensions
      let od = null, id = null, thickness = null, subtype = null;
      if (washer.size) {
        const sizeUpper = washer.size.toUpperCase();
        // Try OD x ID x Thickness pattern
        const match = sizeUpper.match(/(\d+\.?\d*)\s*[Xx]\s*(\d+\.?\d*)\s*[Xx]\s*(\d+\.?\d*)/);
        if (match) {
          od = parseFloat(match[1]);
          id = parseFloat(match[2]);
          thickness = parseFloat(match[3]);
        }
        // Try M-series
        const mMatch = sizeUpper.match(/M(\d+)/);
        if (mMatch) {
          const mSize = parseInt(mMatch[1]);
          const specs = { 2: {id:2.2, od:5, t:0.3}, 3: {id:3.2, od:7, t:0.5}, 4: {id:4.3, od:9, t:0.8}, 5: {id:5.3, od:10, t:1}, 6: {id:6.4, od:12, t:1.6}, 8: {id:8.4, od:16, t:1.6}, 10: {id:10.5, od:20, t:2}, 12: {id:13, od:24, t:2.5}};
          if (specs[mSize]) { id = specs[mSize].id; od = specs[mSize].od; thickness = specs[mSize].t; }
        }
      }
      
      // Detect subtype from name
      if (washer.name) {
        const nameUpper = washer.name.toUpperCase();
        if (nameUpper.includes('LOCKING')) {
          subtype = nameUpper.includes('TYPE 2') ? 'Locking type 2' : 'Locking';
        } else if (nameUpper.includes('NORMAL')) {
          subtype = 'Normal';
        }
      }

      const sql = `
        INSERT INTO washers_bearings (
          id, category, name, inner_diameter, outer_diameter, thickness,
          subtype, material, quantity, box_id, category_id, notes,
          created_at, updated_at
        ) VALUES (
          ${isPostgresDB() ? '$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()' : '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\')'}
        )
      `;

      const params = [
        wb_id,
        'Washer',
        washer.name || washer.size,
        id,
        od,
        thickness,
        subtype,
        null,
        washer.quantity || 0,
        washer.box_id || null,
        washer.category_id || null,
        washer.notes || null
      ];

      try {
        await exec(sql, params);
      } catch (e) {
        console.log(`  ⚠️  Skipped washer ${washer.name}: ${e.message.substring(0, 50)}`);
      }
    }
    console.log(`✅ Migrated ${washerRows.length} washers\n`);

    // 3. Summary
    const totalWB = await query('SELECT COUNT(*) as count FROM washers_bearings', []);
    console.log(`📊 Total items in washers_bearings table: ${totalWB[0].count}\n`);

    console.log('✅ Migration complete!\n');
    await closeDatabase();
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    await closeDatabase();
    process.exit(1);
  }
}

migrateBearingsAndWashersData();
