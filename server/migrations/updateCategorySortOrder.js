import { initializeDatabase, exec, closeDatabase } from '../db.js';

async function migrate() {
  try {
    await initializeDatabase();
    
    // Add sort_order column and update with correct values
    const categories = {
      'Batteries': 1,
      'Bearings': 2,
      'Nuts': 3,
      'Oils/Pastes': 4,
      'RC Parts': 5,
      'Screws': 6,
      'Other Items': 7
    };
    
    for (const [name, order] of Object.entries(categories)) {
      const sql = 'UPDATE categories SET sort_order = ? WHERE name = ?';
      await exec(sql, [order, name]);
      console.log(`✓ Set sort_order=${order} for ${name}`);
    }
    
    console.log('✅ Migration completed successfully');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    await closeDatabase();
    process.exit(1);
  }
}

migrate();
