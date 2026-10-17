import Database from 'better-sqlite3';

const db = new Database('./inventory.db');

console.log('🔍 Checking other_items table schema...');

// Check current schema
const tableInfo = db.prepare('PRAGMA table_info(other_items)').all();
console.log('Columns:', tableInfo.map(c => c.name).join(', '));

// Add 'name' column if it doesn't exist
const hasName = tableInfo.some(c => c.name === 'name');
if (!hasName) {
  console.log('\n➕ Adding name column...');
  db.exec('ALTER TABLE other_items ADD COLUMN name VARCHAR(255)');
  console.log('✅ Added name column');
} else {
  console.log('✅ name column already exists');
}

// Check updated schema
const updated = db.prepare('PRAGMA table_info(other_items)').all();
console.log('\nUpdated columns:', updated.map(c => c.name).join(', '));

db.close();
console.log('\n✅ Schema fixed!');
