import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

console.log(`\n📦 Moving washers from Other Items to Washers & Bearings...`);
console.log(`Database path: ${dbPath}`);

try {
  const SQL = await initSqlJs();
  
  // Load the database file
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // Get categories
  const categoriesResult = db.exec(`SELECT id, name FROM categories`);
  const categories = categoriesResult[0]?.values.map(row => ({ id: row[0], name: row[1] })) || [];
  
  const otherItemsCategory = categories.find(c => c.name === 'Other Items');
  const washersBearingsCategory = categories.find(c => c.name === 'Washers & Bearings');
  
  if (!otherItemsCategory || !washersBearingsCategory) {
    console.error('❌ Categories not found');
    process.exit(1);
  }
  
  console.log(`  Other Items category ID: ${otherItemsCategory.id}`);
  console.log(`  Washers & Bearings category ID: ${washersBearingsCategory.id}`);
  
  // Get count of washers in Other Items
  const washerCountResult = db.exec(`
    SELECT COUNT(*) as count FROM other_items 
    WHERE item_type = 'Washer'
  `);
  
  const washerCount = washerCountResult[0]?.values[0][0] || 0;
  
  console.log(`\n  Found ${washerCount} washers in Other Items`);
  
  // Get the washers to move
  const washersResult = db.exec(`
    SELECT id, name, size, category_id FROM other_items 
    WHERE item_type = 'Washer'
    ORDER BY name
  `);
  
  const washers = washersResult[0]?.values.map(row => ({ 
    id: row[0], 
    name: row[1], 
    size: row[2], 
    category_id: row[3] 
  })) || [];
  
  console.log(`\n  Washers to move:`);
  washers.forEach((w, i) => {
    console.log(`    ${i + 1}. ${w.name} (${w.size})`);
  });
  
  // Move washers to washers_bearings table
  db.run(`
    INSERT INTO washers_bearings (
      id, category, name, inner_diameter, outer_diameter, 
      thickness, subtype, material, quantity, box_id, 
      category_id, notes, created_at, updated_at
    )
    SELECT 
      id, 'Washer', name, NULL, NULL,
      NULL, '', NULL, quantity, box_id,
      '${washersBearingsCategory.id}', notes, created_at, updated_at
    FROM other_items
    WHERE item_type = 'Washer'
  `);
  
  // Delete washers from other_items
  db.run(`DELETE FROM other_items WHERE item_type = 'Washer'`);
  
  console.log(`\n✅ Successfully moved ${washerCount} washers to Washers & Bearings`);
  
  // Save the database back to file
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  
  // Verify the move
  const newCountResult = db.exec(`
    SELECT COUNT(*) as count FROM washers_bearings 
    WHERE category = 'Washer'
  `);
  
  const newCount = newCountResult[0]?.values[0][0] || 0;
  
  const remainingWashersResult = db.exec(`
    SELECT COUNT(*) as count FROM other_items 
    WHERE item_type = 'Washer'
  `);
  
  const remainingWashers = remainingWashersResult[0]?.values[0][0] || 0;
  
  console.log(`\n📊 Verification:`);
  console.log(`  Washers in washers_bearings: ${newCount}`);
  console.log(`  Washers remaining in other_items: ${remainingWashers}`);
  
  db.close();
  console.log(`\n✅ Done!`);
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
