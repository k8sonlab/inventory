import { initializeDatabase, query, closeDatabase } from './db.js';

async function checkData() {
  try {
    await initializeDatabase();
    
    const items = await query('SELECT COUNT(*) as count FROM items', []);
    const screws = await query('SELECT COUNT(*) as count FROM screws', []);
    const nuts = await query('SELECT COUNT(*) as count FROM nuts', []);
    const batteries = await query('SELECT COUNT(*) as count FROM batteries', []);
    const bearings = await query('SELECT COUNT(*) as count FROM bearings', []);
    const oilPastes = await query('SELECT COUNT(*) as count FROM oil_pastes', []);
    const rcParts = await query('SELECT COUNT(*) as count FROM rc_parts', []);
    const otherItems = await query('SELECT COUNT(*) as count FROM other_items', []);
    
    console.log('\n📊 Database Content Summary:\n');
    console.log(`Items table:           ${items[0].count}`);
    console.log(`Screws table:          ${screws[0].count}`);
    console.log(`Nuts table:            ${nuts[0].count}`);
    console.log(`Batteries table:       ${batteries[0].count}`);
    console.log(`Bearings table:        ${bearings[0].count}`);
    console.log(`Oil Pastes table:      ${oilPastes[0].count}`);
    console.log(`RC Parts table:        ${rcParts[0].count}`);
    console.log(`Other Items table:     ${otherItems[0].count}`);
    
    const total = items[0].count + screws[0].count + nuts[0].count + batteries[0].count + bearings[0].count + oilPastes[0].count + rcParts[0].count + otherItems[0].count;
    console.log(`\n✅ TOTAL:              ${total} items`);
    
    await closeDatabase();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkData();
