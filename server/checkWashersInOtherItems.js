import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'inventory.db');

console.log(`\n🔍 Checking washers in Other Items...\n`);

try {
  const SQL = await initSqlJs();
  
  // Load the database file
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // Get all items that look like washers in Other Items
  const result = db.exec(`
    SELECT id, item_type, name, size FROM other_items 
    WHERE name LIKE '%washer%' OR name LIKE '%Washer%'
    ORDER BY name
  `);
  
  if (result[0]) {
    const rows = result[0].values;
    console.log(`Found ${rows.length} washer-like items in Other Items:\n`);
    
    rows.forEach((row, i) => {
      console.log(`${i + 1}. Name: "${row[2]}" | Type: "${row[1]}" | Size: "${row[3]}"`);
    });
    
    // Get all items in washers_bearings
    const wbResult = db.exec(`
      SELECT COUNT(*) as count FROM washers_bearings
    `);
    
    const wbCount = wbResult[0]?.values[0][0] || 0;
    
    console.log(`\n📊 Summary:`);
    console.log(`  Washer-like items in Other Items: ${rows.length}`);
    console.log(`  Total items in Washers & Bearings: ${wbCount}`);
    
  } else {
    console.log('No washer-like items found in Other Items');
  }
  
  db.close();
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
