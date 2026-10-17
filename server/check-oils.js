import Database from 'better-sqlite3';

const db = new Database('inventory.db');
const count = db.prepare('SELECT COUNT(*) as count FROM oil_pastes').get();
console.log('Oil Pastes count:', count.count);

const samples = db.prepare('SELECT id, name, company, type, characteristic FROM oil_pastes LIMIT 5').all();
console.log('Sample oils/pastes:');
console.log(samples);
