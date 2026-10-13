import { initializeDatabase, exec, query, closeDatabase } from './db.js';

await initializeDatabase();

// Get the Washers & Bearings category ID
const cat = await query('SELECT id FROM categories WHERE name = ?', ['Washers & Bearings']);
if (!cat || cat.length === 0) {
  console.error('❌ Washers & Bearings category not found');
  process.exit(1);
}

const categoryId = cat[0].id;
console.log('Found category ID:', categoryId);

// Update all washers_bearings to use the new category
await exec('UPDATE washers_bearings SET category_id = ? WHERE category_id IS NULL OR category_id IN (SELECT id FROM categories WHERE name IN (?, ?))', 
  [categoryId, 'Bearings', 'Other Items']);

// Verify
const count = await query('SELECT COUNT(*) as count FROM washers_bearings WHERE category_id = ?', [categoryId]);
console.log('✅ Updated', count[0].count, 'items to Washers & Bearings category');

await closeDatabase();
