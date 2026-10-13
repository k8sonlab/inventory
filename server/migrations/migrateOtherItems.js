import sqlite3 from 'better-sqlite3';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Detect database type
const usePostgres = process.env.DATABASE_URL ? true : false;

let db;
let isPostgresDB = false;

async function getConnection() {
  if (usePostgres) {
    isPostgresDB = true;
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    return pool;
  } else {
    const dbPath = path.join(__dirname, '..', 'inventory.db');
    const sqlite = new sqlite3(dbPath);
    return sqlite;
  }
}

async function queryOtherItems() {
  const db = await getConnection();
  
  try {
    let rows;
    if (isPostgresDB) {
      const result = await db.query(
        "SELECT id, name, parameters, box_id, category_id, quantity, notes FROM items WHERE item_type = 'Other Items' ORDER BY name"
      );
      rows = result.rows;
    } else {
      rows = db.prepare(
        "SELECT id, name, parameters, box_id, category_id, quantity, notes FROM items WHERE item_type = 'Other Items' ORDER BY name"
      ).all();
    }
    
    console.log(`Found ${rows.length} Other Items to migrate`);
    
    // Process and migrate each item
    for (const row of rows) {
      try {
        const params = row.parameters ? JSON.parse(row.parameters) : {};
        
        // Extract fields from parameters
        // Priority: direct field > parsed from parameters > empty string
        const itemType = params.item_type || params.type || 'Other';
        const size = params.size || '';
        const company = params.company || '';
        const quantity = row.quantity || 0;
        const name = row.name || '';
        const notes = row.notes || '';
        const boxId = row.box_id || null;
        const categoryId = row.category_id || null;
        
        console.log(`Migrating: ${name} (type: ${itemType}, size: ${size}, company: ${company})`);
        
        // Check if already exists in other_items
        let existsInOther;
        if (isPostgresDB) {
          const result = await db.query('SELECT id FROM other_items WHERE id = $1', [row.id]);
          existsInOther = result.rows.length > 0;
        } else {
          existsInOther = db.prepare('SELECT id FROM other_items WHERE id = ?').get(row.id);
        }
        
        if (!existsInOther) {
          // Insert into other_items
          if (isPostgresDB) {
            await db.query(
              `INSERT INTO other_items (id, item_type, size, name, company, quantity, box_id, category_id, notes, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              [row.id, itemType, size, name, company, quantity, boxId, categoryId, notes]
            );
          } else {
            db.prepare(
              `INSERT INTO other_items (id, item_type, size, name, company, quantity, box_id, category_id, notes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
            ).run(row.id, itemType, size, name, company, quantity, boxId, categoryId, notes);
          }
          console.log(`  ✓ Inserted into other_items`);
        } else {
          // Update existing record with correct data
          if (isPostgresDB) {
            await db.query(
              `UPDATE other_items SET item_type = $1, size = $2, name = $3, company = $4, quantity = $5, box_id = $6, category_id = $7, notes = $8, updated_at = NOW() WHERE id = $9`,
              [itemType, size, name, company, quantity, boxId, categoryId, notes, row.id]
            );
          } else {
            db.prepare(
              `UPDATE other_items SET item_type = ?, size = ?, name = ?, company = ?, quantity = ?, box_id = ?, category_id = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
            ).run(itemType, size, name, company, quantity, boxId, categoryId, notes, row.id);
          }
          console.log(`  ✓ Updated existing record in other_items`);
        }
      } catch (err) {
        console.error(`  ✗ Error processing item ${row.id}: ${err.message}`);
      }
    }
    
    console.log('\n✓ Migration complete!');
    
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    if (isPostgresDB) {
      await db.end();
    } else {
      db.close();
    }
  }
}

queryOtherItems();
