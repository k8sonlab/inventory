import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Pool } from 'pg';
import XLSX from 'xlsx';

const run = promisify(execFile);
const serverDirectory = fileURLToPath(new URL('..', import.meta.url));

test('Excel imports round quantities down and preserve decimal dimensions in PostgreSQL', {
  skip: !process.env.TEST_POSTGRES_URL,
  timeout: 30000
}, async (t) => {
  const admin = new Pool({ connectionString: process.env.TEST_POSTGRES_URL });
  const databaseName = `inventory_test_${randomUUID().replaceAll('-', '')}`;
  const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-import-'));
  let database;
  let created = false;
  t.after(async () => {
    if (database) await database.end();
    if (created) await admin.query(`DROP DATABASE "${databaseName}"`);
    await admin.end();
    await rm(directory, { recursive: true });
  });
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  const parameters = await admin.connect();
  const config = parameters.connectionParameters;
  const env = {
    ...process.env,
    DB_TYPE: 'postgres',
    DB_HOST: config.host,
    DB_PORT: String(config.port),
    DB_USER: config.user,
    DB_PASSWORD: config.password || '',
    DB_NAME: databaseName,
    DB_SSL: 'disable'
  };
  parameters.release();
  database = new Pool({
    host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: databaseName, ssl: false
  });

  await run(process.execPath, ['--input-type=module', '-e', `
    import { initializeDatabase, closeDatabase, exec } from './db.js';
    import { runMigrations } from './migrations/run.js';
    await initializeDatabase();
    await runMigrations();
    await exec('ALTER TABLE other_items ALTER COLUMN quantity TYPE DOUBLE PRECISION');
    await exec("INSERT INTO other_items (id, name, quantity) VALUES ('00000000-0000-4000-8000-000000000001', 'Existing item', 1.5)");
    await runMigrations();
    await closeDatabase();
  `], { cwd: serverDirectory, env });
  const existing = await database.query("SELECT quantity FROM other_items WHERE name = 'Existing item'");
  assert.equal(existing.rows[0].quantity, 1);
  const column = await database.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'other_items' AND column_name = 'quantity'");
  assert.equal(column.rows[0].data_type, 'integer');

  const workbook = XLSX.utils.book_new();
  const sheets = {
    Shelves: [{ 'Shelf ID': 'S1', Location: 'Test shelf' }],
    Boxes: [{ 'Shelf ID': 'S1', 'Storage ID': 'S1-B01', 'Box Name': 'Test box' }],
    Screws: [{ 'Storage ID': 'S1-B01', Size: 'M3', Amount: 4 }],
    'Other Items': [
      { 'Storage ID': 'S1-B01', Name: 'Fractional item', 'Item Type': 'Other', Amount: 1.5 },
      { 'Storage ID': 'S1-B01', Name: 'Test washer', 'Item Type': 'Washer', Size: '3x5x0.1', Amount: 2.5 }
    ],
    Bearings: [{ 'Storage ID': 'S1-B01', Type: 'Test bearing', ID: 1.5, OD: 3.5, Width: 0.25, Amount: 1.5 }],
    'RC Parts': [], OilsPAstes: [], Batteries: []
  };
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  }
  const file = path.join(directory, 'fixture.xlsx');
  XLSX.writeFile(workbook, file);
  const result = await run(process.execPath, ['utils/importExcel.js', file], { cwd: serverDirectory, env });
  assert.match(result.stdout, /All data imported successfully/);
  const other = await database.query("SELECT quantity FROM other_items WHERE name = 'Fractional item'");
  assert.equal(other.rows[0].quantity, 1);
  const unified = await database.query('SELECT category, quantity, inner_diameter, thickness FROM washers_bearings ORDER BY category');
  assert.equal(unified.rows.length, 2);
  assert.equal(unified.rows[0].category, 'Bearing');
  assert.equal(unified.rows[0].quantity, 1);
  assert.equal(Number(unified.rows[0].inner_diameter), 1.5);
  assert.equal(Number(unified.rows[0].thickness), 0.25);
  assert.equal(unified.rows[1].category, 'Washer');
  assert.equal(unified.rows[1].quantity, 2);
  assert.equal(Number(unified.rows[1].thickness), 0.1);

  const before = (await database.query('SELECT id FROM boxes')).rows[0].id;
  await run(process.execPath, ['utils/importExcel.js', file], { cwd: serverDirectory, env });
  assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM screws')).rows[0].count, 2);
  await database.query("INSERT INTO catalog_enums (id, enum_type, value) VALUES ('00000000-0000-4000-8000-000000000002', 'test', 'stale')");
  await run(process.execPath, ['utils/importExcel.js', '--empty', file], { cwd: serverDirectory, env });
  assert.equal((await database.query('SELECT id FROM boxes')).rows[0].id, before);
  assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM screws')).rows[0].count, 1);
  assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM washers_bearings')).rows[0].count, 2);
  assert.equal((await database.query("SELECT COUNT(*)::int AS count FROM catalog_enums WHERE enum_type = 'test'")).rows[0].count, 0);
  for (let index = 0; index < 2; index++) {
    await run(process.execPath, ['utils/importExcel.js', file, '--clean'], { cwd: serverDirectory, env });
    assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM screws')).rows[0].count, 1);
    assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM washers_bearings')).rows[0].count, 2);
    assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM boxes')).rows[0].count, 1);
    assert.equal((await database.query('SELECT COUNT(*)::int AS count FROM categories')).rows[0].count, 7);
  }
  assert.notEqual((await database.query('SELECT id FROM boxes')).rows[0].id, before);
});
