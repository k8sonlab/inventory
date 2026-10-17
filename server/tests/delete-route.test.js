import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import express from 'express';

const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-delete-'));
process.env.DB_TYPE = 'sqlite';
process.env.DB_FILE = path.join(directory, 'inventory.db');

const { initializeDatabase, closeDatabase, query } = await import('../db.js');
const { runMigrations } = await import('../migrations/run.js');
const { default: itemRoutes } = await import('../routes/items.js');

const TABLES = {
  screw: 'screws', nut: 'nuts', bearing: 'bearings', washer_bearing: 'washers_bearings',
  oil_paste: 'oil_pastes', battery: 'batteries', other_item: 'other_items', rc_part: 'rc_parts'
};

let server;
let base;

before(async () => {
  await initializeDatabase();
  await runMigrations();
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemRoutes);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}/api/items`;
});

after(async () => {
  await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
  await closeDatabase();
  await rm(directory, { recursive: true });
});

const create = async (sourceType) => {
  const response = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source_type: sourceType, name: 'Delete me', item_code: 'D', size: 'M3', item_type: 'Test', quantity: 1 })
  });
  assert.equal(response.status, 201);
  return (await response.json()).id;
};
const exists = async (table, id) => (await query(`SELECT COUNT(*) AS count FROM ${table} WHERE id = ?`, [id]))[0].count === 1;

for (const [sourceType, table] of Object.entries(TABLES)) {
  test(`${sourceType}: deleting with source_type in the query string removes the row (what the UI sends)`, async () => {
    const id = await create(sourceType);
    const other = await create(sourceType);
    const response = await fetch(`${base}/${id}?source_type=${sourceType}`, { method: 'DELETE' });
    assert.equal(response.status, 200);
    assert.equal(await exists(table, id), false);
    assert.equal(await exists(table, other), true, 'other rows are untouched');
  });

  test(`${sourceType}: deleting with source_type in the body still works`, async () => {
    const id = await create(sourceType);
    const response = await fetch(`${base}/${id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source_type: sourceType })
    });
    assert.equal(response.status, 200);
    assert.equal(await exists(table, id), false);
  });
}

test('generic items without a source_type are still deleted from the items table', async () => {
  const created = await fetch(base, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Generic', item_type: 'Misc', category_id: null, box_id: null, quantity: 1 })
  });
  const { id } = await created.json();
  assert.equal(await exists('items', id), true);
  const response = await fetch(`${base}/${id}`, { method: 'DELETE' });
  assert.equal(response.status, 200);
  assert.equal(await exists('items', id), false);
});

test('an id from one table is not deleted when another source_type is given', async () => {
  const id = await create('screw');
  await fetch(`${base}/${id}?source_type=nut`, { method: 'DELETE' });
  assert.equal(await exists('screws', id), true);
});
