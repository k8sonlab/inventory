import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-clear-'));
process.env.DB_TYPE = 'sqlite';
process.env.DB_FILE = path.join(directory, 'inventory.db');
const { initializeDatabase, closeDatabase, getDatabase, clearApplicationData } = await import('../db.js');
const { runMigrations } = await import('../migrations/run.js');

test('clear modes cover every table, respect foreign keys and roll back failed clears', async (t) => {
  t.after(async () => {
    await closeDatabase();
    await rm(directory, { recursive: true });
  });
  await initializeDatabase();
  await runMigrations();
  const db = getDatabase();
  db.exec('PRAGMA foreign_keys = ON');
  const tables = ['items', 'rc_parts', 'screws', 'nuts', 'bearings', 'washers_bearings',
    'oil_pastes', 'batteries', 'other_items', 'boxes', 'shelves', 'categories', 'catalog_enums'];
  const seed = () => {
    db.exec(`
      INSERT INTO shelves (id, shelf_code, location) VALUES ('s', 'S1', 'Test');
      INSERT INTO boxes (id, shelf_id, storage_id) VALUES ('b', 's', 'S1-B01');
      INSERT INTO categories (id, name) VALUES ('c', 'Test');
      INSERT INTO catalog_enums (id, enum_type, value) VALUES ('e', 'test', 'Test');
      INSERT INTO items (id, name, item_type, box_id, category_id) VALUES ('i', 'Test', 'Other', 'b', 'c');
      INSERT INTO rc_parts (id, item_code, box_id, category_id) VALUES ('r', 'Test', 'b', 'c');
      INSERT INTO washers_bearings (id, category, name, box_id, category_id) VALUES ('w', 'Washer', 'Test', 'b', 'c');
    `);
    for (const table of ['screws', 'nuts', 'bearings', 'oil_pastes', 'batteries', 'other_items']) {
      db.exec(`INSERT INTO ${table} (id, box_id, category_id) VALUES ('${table}', 'b', 'c')`);
    }
  };
  const count = table => db.exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0];
  seed();
  await clearApplicationData({ preserveLocations: true });
  for (const table of tables) assert.equal(count(table), ['boxes', 'shelves'].includes(table) ? 1 : 0, table);
  await clearApplicationData();
  for (const table of tables) assert.equal(count(table), 0, table);
  seed();
  db.exec("CREATE TRIGGER prevent_clear BEFORE DELETE ON nuts BEGIN SELECT RAISE(ABORT, 'blocked'); END");
  const log = t.mock.method(console, 'error', () => {});
  await assert.rejects(clearApplicationData(), /blocked/);
  assert.equal(log.mock.callCount(), 1);
  for (const table of tables) assert.equal(count(table), 1, table);
  db.exec('DROP TRIGGER prevent_clear');
  await clearApplicationData();
  await closeDatabase();
  await initializeDatabase();
  for (const table of tables) {
    assert.equal(getDatabase().exec(`SELECT COUNT(*) FROM ${table}`)[0].values[0][0], 0, table);
  }
});
