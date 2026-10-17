import Database from 'better-sqlite3';

console.log('🔧 Adding missing columns to other_items table...');

const db = new Database('./inventory.db');

try {
  // Check current schema
  const schema = db.prepare('PRAGMA table_info(other_items)').all();
  const columns = schema.map(c => c.name);
  console.log('Current columns:', columns.join(', '));
  
  // Add missing columns
  const columnsToAdd = ['name', 'company'];
  for (const col of columnsToAdd) {
    if (!columns.includes(col)) {
      try {
        db.exec(`ALTER TABLE other_items ADD COLUMN ${col} VARCHAR(255)`);
        console.log(`✅ Added ${col} column`);
      } catch (e) {
        console.log(`⚠️  Could not add ${col}:`, e.message);
      }
    } else {
      console.log(`✅ ${col} column already exists`);
    }
  }
  
  // Verify
  const updated = db.prepare('PRAGMA table_info(other_items)').all();
  console.log('\nUpdated columns:', updated.map(c => c.name).join(', '));
  
} catch (error) {
  console.log('❌ Error:', error.message);
} finally {
  db.close();
  console.log('\n✅ Schema migration complete!');
}
