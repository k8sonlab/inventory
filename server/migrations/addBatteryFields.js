import { initializeDatabase, exec, isPostgresDB, closeDatabase } from '../db.js';

async function migrate() {
  try {
    await initializeDatabase();
    
    if (isPostgresDB()) {
      console.log('Running PostgreSQL migration...');
      await exec(`
        ALTER TABLE batteries 
        ADD COLUMN IF NOT EXISTS mah INTEGER,
        ADD COLUMN IF NOT EXISTS rechargeable BOOLEAN DEFAULT FALSE;
      `);
    } else {
      console.log('Running SQLite migration...');
      // SQLite doesn't support multiple columns in ALTER TABLE, so we do them separately
      try {
        await exec(`ALTER TABLE batteries ADD COLUMN mah INTEGER;`);
        console.log('✓ Added mah column');
      } catch (e) {
        if (!e.message.includes('duplicate column')) {
          throw e;
        }
        console.log('✓ mah column already exists');
      }
      
      try {
        await exec(`ALTER TABLE batteries ADD COLUMN rechargeable INTEGER DEFAULT 0;`);
        console.log('✓ Added rechargeable column');
      } catch (e) {
        if (!e.message.includes('duplicate column')) {
          throw e;
        }
        console.log('✓ rechargeable column already exists');
      }
    }
    
    console.log('✓ Migration completed successfully');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    await closeDatabase();
    process.exit(1);
  }
}

migrate();
