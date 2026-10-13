import { initializeDatabase, exec, query, closeDatabase } from './db.js';
import { v4 as uuidv4 } from 'uuid';

await initializeDatabase();

const id = uuidv4();
const sql = 'INSERT OR IGNORE INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, datetime("now"))';

await exec(sql, [id, 'Washers & Bearings', 3]);

const cats = await query('SELECT id, name, sort_order FROM categories ORDER BY sort_order, name', []);
console.log('✅ Categories:');
cats.forEach(c => console.log('  ' + c.name + ': sort_order=' + c.sort_order));

await closeDatabase();
