import { initializeDatabase, query } from './db.js';

await initializeDatabase();

const otherWashers = await query('SELECT COUNT(*) as count FROM other_items WHERE item_type = ?', ['Washer']);
const wbWashers = await query('SELECT COUNT(*) as count FROM washers_bearings WHERE category = ?', ['Washer']);

console.log('Washers in other_items:', otherWashers[0]?.count || 0);
console.log('Washers in washers_bearings:', wbWashers[0]?.count || 0);
console.log('Total washers:', (otherWashers[0]?.count || 0) + (wbWashers[0]?.count || 0));

process.exit(0);
