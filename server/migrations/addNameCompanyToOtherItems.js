import { initializeDatabase, exec, isPostgresDB, closeDatabase } from '../db.js';

async function migrate() {
  try {
    await initializeDatabase();
    
    const isPG = isPostgresDB();
    
    if (isPG) {
      console.log('Adding name and company columns to PostgreSQL other_items table...');
      try {
        await exec('ALTER TABLE other_items ADD COLUMN name VARCHAR(255);');
        console.log('✓ Added name column');
      } catch (e) {
        if (!e.message.includes('already exists')) {
          throw e;
        }
        console.log('✓ name column already exists');
      }
      
      try {
        await exec('ALTER TABLE other_items ADD COLUMN company VARCHAR(255);');
        console.log('✓ Added company column');
      } catch (e) {
        if (!e.message.includes('already exists')) {
          throw e;
        }
        console.log('✓ company column already exists');
      }
    } else {
      console.log('Adding name and company columns to SQLite other_items table...');
      try {
        await exec('ALTER TABLE other_items ADD COLUMN name VARCHAR(255);');
        console.log('✓ Added name column');
      } catch (e) {
        if (!e.message.includes('duplicate column')) {
          throw e;
        }
        console.log('✓ name column already exists');
      }
      
      try {
        await exec('ALTER TABLE other_items ADD COLUMN company VARCHAR(255);');
        console.log('✓ Added company column');
      } catch (e) {
        if (!e.message.includes('duplicate column')) {
          throw e;
        }
        console.log('✓ company column already exists');
      }
    }
    
    console.log('\n✅ Migration completed successfully');
    await closeDatabase();
  } catch (err) {
    console.error('Migration error:', err.message);
    await closeDatabase();
    process.exit(1);
  }
}

migrate();
