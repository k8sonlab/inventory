import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('./inventory.db');

console.log('🔍 Checking Washers & Bearings category...');

// Get category ID
const category = db.prepare('SELECT id, name FROM categories WHERE name = ?').get('Washers & Bearings');
console.log('Category:', category);

if (!category) {
  console.log('❌ Washers & Bearings category not found!');
  db.close();
  process.exit(1);
}

console.log('\n📝 Adding test items to washers_bearings table...');

// Test data - some washers and bearings
const testItems = [
  {
    id: uuidv4(),
    category: 'Washer',
    name: 'Flat Washer M6',
    inner_diameter: 6.5,
    outer_diameter: 12,
    thickness: 1.5,
    subtype: 'Normal',
    material: 'Steel',
    quantity: 50,
    box_id: null,
    category_id: category.id,
    notes: 'Test washer'
  },
  {
    id: uuidv4(),
    category: 'Bearing',
    name: '6801',
    inner_diameter: 12,
    outer_diameter: 21,
    thickness: 5,
    subtype: 'Normal',
    material: 'Steel',
    quantity: 3,
    box_id: null,
    category_id: category.id,
    notes: 'Test bearing'
  }
];

const insert = db.prepare(`
  INSERT INTO washers_bearings 
  (id, category, name, inner_diameter, outer_diameter, thickness, subtype, material, quantity, box_id, category_id, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

for (const item of testItems) {
  insert.run(item.id, item.category, item.name, item.inner_diameter, item.outer_diameter, item.thickness, item.subtype, item.material, item.quantity, item.box_id, item.category_id, item.notes);
  console.log(`✅ Added: ${item.name} (${item.category})`);
}

// Verify
const count = db.prepare('SELECT COUNT(*) as count FROM washers_bearings').get();
console.log(`\n📊 Total items in washers_bearings: ${count.count}`);

db.close();
console.log('\n✅ Done!');
