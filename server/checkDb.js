import Database from 'better-sqlite3';
const db = new Database('./inventory.db');

// Check item_types in items table
const itemTypes = db.prepare('SELECT DISTINCT item_type, COUNT(*) as count FROM items GROUP BY item_type').all();
console.log('Item types in items table:');
console.log(JSON.stringify(itemTypes, null, 2));

// Check how many items in each category
const categories = db.prepare('SELECT id, name FROM categories ORDER BY sort_order').all();
console.log('\nCategories:');
console.log(JSON.stringify(categories, null, 2));

// Check total items and other_items count
const itemCount = db.prepare('SELECT COUNT(*) as count FROM items').get();
const otherItemsCount = db.prepare('SELECT COUNT(*) as count FROM other_items').get();
console.log(`\nTotal items in items table: ${itemCount.count}`);
console.log(`Total items in other_items table: ${otherItemsCount.count}`);

db.close();
