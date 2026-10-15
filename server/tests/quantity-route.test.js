import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import express from 'express';
import initSqlJs from 'sql.js';
import { Pool } from 'pg';

const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-quantity-api-'));
const dbFile = path.join(directory, 'inventory.db');
let admin;
let databaseName;
if (process.env.TEST_POSTGRES_URL) {
  admin = new Pool({ connectionString: process.env.TEST_POSTGRES_URL });
  databaseName = `inventory_quantity_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  const client = await admin.connect();
  const config = client.connectionParameters;
  Object.assign(process.env, {
    DB_TYPE: 'postgres', DB_HOST: config.host, DB_PORT: String(config.port),
    DB_USER: config.user, DB_PASSWORD: config.password || '',
    DB_NAME: databaseName, DB_SSL: 'disable'
  });
  client.release();
} else {
  process.env.DB_TYPE = 'sqlite';
  process.env.DB_FILE = dbFile;
}
const { initializeDatabase, closeDatabase, exec, queryOne, getDatabase, isPostgresDB } = await import('../db.js');
const { runMigrations } = await import('../migrations/run.js');
const { default: itemRoutes } = await import('../routes/items.js');
const tables = {
  item: 'items', rc_part: 'rc_parts', screw: 'screws', nut: 'nuts',
  bearing: 'bearings', washer_bearing: 'washers_bearings', oil_paste: 'oil_pastes',
  battery: 'batteries', other_item: 'other_items'
};
const id = randomUUID();
const categoryId = randomUUID();
let server;
let baseUrl;
const select = table => queryOne(`SELECT * FROM ${table} WHERE id = ${isPostgresDB() ? '$1' : '?'}`, [id]);
const patch = (body, itemId = id) => fetch(`${baseUrl}/api/items/${itemId}/quantity`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});

before(async () => {
  await initializeDatabase();
  await runMigrations();
  await exec(`INSERT INTO categories (id, name) VALUES (${isPostgresDB() ? '$1, $2' : '?, ?'})`, [categoryId, 'Search test']);
  for (const table of Object.values(tables)) {
    const columns = ['id', 'quantity', 'notes', 'category_id'];
    const values = [id, 3, 'Keep these notes', categoryId];
    if (table !== 'batteries') { columns.push('name'); values.push('Keep this name'); }
    if (table === 'items') { columns.push('item_type', 'parameters'); values.push('Custom', '{"key":"keep"}'); }
    if (table === 'rc_parts') { columns.push('item_code'); values.push('Keep code'); }
    if (table === 'washers_bearings') { columns.push('category', 'inner_diameter'); values.push('Washer', 1.5); }
    const placeholders = values.map((value, index) => isPostgresDB() ? `$${index + 1}` : '?');
    await exec(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`, values);
  }
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemRoutes);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await closeDatabase();
  if (admin) {
    await admin.query(`DROP DATABASE "${databaseName}"`);
    await admin.end();
  }
  await rm(directory, { recursive: true });
});

test('every source type updates only its quantity and timestamp, preserving other data', async () => {
  for (const [source_type, table] of Object.entries(tables)) {
    const before = await select(table);
    const response = await patch({ source_type, quantity: 1, expected_quantity: 3 });
    assert.equal(response.status, 200, source_type);
    assert.deepEqual(await response.json(), { id, source_type, quantity: 1 });
    const after = await select(table);
    for (const field of Object.keys(before).filter(field => !['quantity', 'updated_at'].includes(field))) {
      assert.deepEqual(after[field], before[field], `${source_type}.${field}`);
    }
    assert.equal(after.quantity, 1);
  }
  const zero = await patch({ source_type: 'screw', quantity: 0, expected_quantity: 1 });
  assert.equal(zero.status, 200);
  assert.equal((await select('screws')).quantity, 0);
  assert.equal((await select('nuts')).quantity, 1);
  if (!isPostgresDB()) {
    const SQL = await initSqlJs();
    const persisted = new SQL.Database(await readFile(dbFile));
    assert.equal(persisted.exec('SELECT quantity FROM screws')[0].values[0][0], 0);
    persisted.close();
  }
});

test('global and category search work for every source, JSON parameters, and numeric dimensions', async () => {
  for (const filters of [
    { search: 'kEeP' },
    { search: 'kEeP', category_id: categoryId }
  ]) {
    const response = await fetch(`${baseUrl}/api/items?${new URLSearchParams(filters)}`);
    assert.equal(response.status, 200);
    const rows = await response.json();
    assert.deepEqual(rows.map(row => row.source_type).sort(), Object.keys(tables).sort());
    assert.equal(rows.find(row => row.source_type === 'washer_bearing').inner_diameter, 1.5);
  }
  const json = await fetch(`${baseUrl}/api/items?search=key`);
  assert.equal(json.status, 200);
  assert.deepEqual((await json.json()).map(row => row.source_type), ['item']);
  const numeric = await fetch(`${baseUrl}/api/items?${new URLSearchParams({ search: '1.5', category_id: categoryId })}`);
  assert.equal(numeric.status, 200);
  assert.deepEqual((await numeric.json()).map(row => row.source_type), ['washer_bearing']);
  const absent = await fetch(`${baseUrl}/api/items?search=definitely-no-match`);
  assert.equal(absent.status, 200);
  assert.deepEqual(await absent.json(), []);
});

test('invalid inputs and extra fields are rejected without changing data', async () => {
  const before = await select('screws');
  const valid = { source_type: 'screw', quantity: 2, expected_quantity: 0 };
  for (const body of [
    {}, { ...valid, quantity: -1 }, { ...valid, quantity: '2' },
    { ...valid, quantity: 1.5 }, { ...valid, quantity: 2147483648 },
    { ...valid, expected_quantity: 1.5 },
    { ...valid, quantity: null }, { ...valid, quantity: '' },
    { ...valid, expected_quantity: '0' }, { ...valid, expected_quantity: null },
    { ...valid, source_type: '__proto__' }, { ...valid, source_type: 'constructor' },
    { ...valid, source_type: { toString: null } }, { ...valid, notes: 'Must not overwrite' }
  ]) {
    const response = await patch(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.ok((await response.json()).error);
  }
  assert.deepEqual(await select('screws'), before);
  for (const method of ['POST', 'PUT']) {
    const response = await fetch(`${baseUrl}/api/items${method === 'PUT' ? `/${id}` : ''}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_type: 'screw', quantity: 1.5 })
    });
    assert.equal(response.status, 400);
  }
});

test('stale edits return 409 and missing items return 404', async () => {
  const response = await patch({ source_type: 'screw', quantity: 8, expected_quantity: 3 });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).quantity, 0);
  assert.equal((await select('screws')).quantity, 0);
  assert.equal((await patch({ source_type: 'screw', quantity: 2, expected_quantity: 0 }, randomUUID())).status, 404);
});

test('two concurrent edits cannot silently overwrite each other', async () => {
  const responses = await Promise.all([
    patch({ source_type: 'screw', quantity: 4, expected_quantity: 0 }),
    patch({ source_type: 'screw', quantity: 5, expected_quantity: 0 })
  ]);
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
  assert.ok([4, 5].includes((await select('screws')).quantity));
});

test('database errors return an explicit failure without reporting success', async (t) => {
  const method = isPostgresDB() ? 'query' : 'exec';
  t.mock.method(getDatabase(), method, () => { throw new Error('Test database failure'); });
  const log = t.mock.method(console, 'error', () => {});
  const response = await patch({ source_type: 'screw', quantity: 6, expected_quantity: 4 });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Failed to update item quantity' });
  assert.ok(log.mock.callCount() > 0);
});
