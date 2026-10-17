import { initializeDatabase, closeDatabase, exec } from './db.js';

console.log('📊 Checking current state...');

await initializeDatabase();

// Count items in washers_bearings
const countResult = await exec('SELECT COUNT(*) as count FROM washers_bearings');
console.log(`Current washers_bearings: ${countResult.length} items`);

// Clear washers_bearings table
console.log('\n🗑️  Clearing washers_bearings table...');
await exec('DELETE FROM washers_bearings');

console.log('✅ Cleared!');

await closeDatabase();
console.log('\n✅ Ready for fresh import!');
