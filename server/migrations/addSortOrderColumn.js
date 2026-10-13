import { initializeDatabase, exec, isPostgresDB, closeDatabase } from '../db.js';

async function migrate() {
  try {
    await initializeDatabase();
    
    const isPG = isPostgresDB();
    
    if (isPG) {
      console.log('Adding sort_order column to PostgreSQL...');
      try {
        await exec('ALTER TABLE categories ADD COLUMN sort_order INTEGER;');
        console.log('✓ Added sort_order column');
      } catch (e) {
        if (!e.message.includes('already exists')) {
          throw e;
        }
        console.log('✓ sort_order column already exists');
      }
    } else {
      console.log('Adding sort_order column to SQLite...');
      try {
        await exec('ALTER TABLE categories ADD COLUMN sort_order INTEGER;');
        console.log('✓ Added sort_order column');
      } catch (e) {
        if (!e.message.includes('duplicate column')) {
          throw e;
        }
        console.log('✓ sort_order column already exists');
      }
    }
    
    // Update sort_order values
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
      const sql = `UPDATE categories SET sort_order = ${isPG ? '$1' : '?'} WHERE name = ${isPG ? '$2' : '?'}`;
      await exec(sql, [order, name]);
      console.log(`✓ Set sort_order=${order} for ${name}`);
    }
    
    console.log('\n✅ Migration completed successfully');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    await closeDatabase();
    process.exit(1);
  }
}

migrate();
