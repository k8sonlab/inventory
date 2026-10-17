#!/usr/bin/env node
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  try {
    // Load the database
    const dbPath = path.join(__dirname, 'inventory.db');
    const buffer = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(buffer);

    // First, check what's currently stored
    console.log('\n=== BEFORE UPDATE ===');
    let stmt = db.prepare('SELECT id, name, subtype FROM washers_bearings WHERE name = ?');
    stmt.bind(['6X2.5x05']);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log('Current record:', row);
    }
    stmt.free();

    // Update the subtype to NULL for the 6X2.5x05 washer
    console.log('\n=== UPDATING ===');
    db.run('UPDATE washers_bearings SET subtype = NULL WHERE name = ?', ['6X2.5x05']);
    console.log('Updated subtype to NULL for 6X2.5x05');

    // Verify the update
    console.log('\n=== AFTER UPDATE ===');
    stmt = db.prepare('SELECT id, name, subtype FROM washers_bearings WHERE name = ?');
    stmt.bind(['6X2.5x05']);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log('Updated record:', row);
    }
    stmt.free();

    // Save the database back to disk
    const data = db.export();
    const buffer2 = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer2);
    console.log('\n✓ Database updated and saved');
    db.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
