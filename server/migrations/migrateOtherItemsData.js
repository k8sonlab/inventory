import { initializeDatabase, query, exec, isPostgresDB, closeDatabase } from '../db.js';

async function migrate() {
  try {
    await initializeDatabase();
    
    const isPG = isPostgresDB();
    
    console.log('\n🔄 Migrating Other Items data from items table to other_items table...');
    
    // Fetch all items from items table where item_type = 'Other Items'
    const sql = "SELECT id, name, parameters, box_id, category_id, quantity, notes FROM items WHERE item_type = 'Other Items' ORDER BY name";
    const rows = await query(sql, []);
    
    console.log(`Found ${rows.length} Other Items to process`);
    
    for (const row of rows) {
      try {
        // Parse parameters
        let params = {};
        if (row.parameters) {
          try {
            params = typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters;
          } catch (e) {
            params = {};
          }
        }
        
        // Extract fields
        const itemType = params.item_type || params.type || 'Other';
        const size = params.size || '';
        const company = params.company || '';
        const name = row.name || '';
        const notes = row.notes || '';
        const quantity = row.quantity || 0;
        const boxId = row.box_id || null;
        const categoryId = row.category_id || null;
        
        console.log(`  Processing: ${name} (type: ${itemType})`);
        
        // Check if record already exists in other_items
        const checkSql = `SELECT id FROM other_items WHERE id = ${isPG ? '$1' : '?'}`;
        const existing = await query(checkSql, [row.id]);
        
        if (existing.length === 0) {
          // Insert into other_items
          const insertSql = isPG ?
            `INSERT INTO other_items (id, item_type, size, name, company, quantity, box_id, category_id, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())` :
            `INSERT INTO other_items (id, item_type, size, name, company, quantity, box_id, category_id, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
          
          await exec(insertSql, [row.id, itemType, size, name, company, quantity, boxId, categoryId, notes]);
          console.log(`    ✓ Inserted into other_items`);
        } else {
          // Update existing record
          const updateSql = isPG ?
            `UPDATE other_items SET item_type = $1, size = $2, name = $3, company = $4, quantity = $5, box_id = $6, category_id = $7, notes = $8, updated_at = NOW() WHERE id = $9` :
            `UPDATE other_items SET item_type = ?, size = ?, name = ?, company = ?, quantity = ?, box_id = ?, category_id = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`;
          
          await exec(updateSql, [itemType, size, name, company, quantity, boxId, categoryId, notes, row.id]);
          console.log(`    ✓ Updated in other_items`);
        }
      } catch (err) {
        console.error(`  ✗ Error processing ${row.name}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Data migration completed successfully');
    await closeDatabase();
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    await closeDatabase();
    process.exit(1);
  }
}

migrate();
