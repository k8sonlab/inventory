import { initializeDatabase, query, closeDatabase } from '../db.js';
import { CatalogEnum } from '../models/index.js';

async function migrate() {
  try {
    await initializeDatabase();
    const rows = await query(`SELECT DISTINCT item_type FROM other_items WHERE item_type IS NOT NULL AND item_type <> ''`);
    for (const { item_type } of rows) {
      await CatalogEnum.create('other_item_type', item_type);
    }
    console.log(`✓ other_item_type: ${rows.length} values`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

migrate();
