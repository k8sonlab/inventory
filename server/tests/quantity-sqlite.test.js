import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const directory = await mkdtemp(path.join(os.tmpdir(), 'inventory-quantity-'));
process.env.DB_TYPE = 'sqlite';
process.env.DB_FILE = path.join(directory, 'inventory.db');

const { initializeDatabase, closeDatabase, query, exec } = await import('../db.js');
const { runMigrations } = await import('../migrations/run.js');
const { OtherItem } = await import('../models/index.js');

test('quantities round down on create, update and migration and survive database reload', async (t) => {
  t.after(async () => {
    await closeDatabase();
    await rm(directory, { recursive: true });
  });
  await initializeDatabase();
  await runMigrations();
  const created = await OtherItem.create({ name: 'Fractional item', quantity: 1.5 });
  assert.equal(created.quantity, 1);
  const updated = await OtherItem.update(created.id, { name: 'Fractional item', quantity: 2.75 });
  assert.equal(updated.quantity, 2);
  const whole = await OtherItem.create({ name: 'Whole item', quantity: 3 });
  assert.equal(whole.quantity, 3);
  await runMigrations();
  await closeDatabase();
  await initializeDatabase();
  assert.equal((await OtherItem.getById(created.id)).quantity, 2);

  await exec('CREATE TABLE legacy_quantity (quantity INTEGER DEFAULT 0)');
  await exec('INSERT INTO legacy_quantity (quantity) VALUES (?)', [1.5]);
  assert.equal((await query('SELECT quantity FROM legacy_quantity'))[0].quantity, 1.5);
  await exec('UPDATE other_items SET quantity = 1.5 WHERE id = ?', [created.id]);
  await runMigrations();
  assert.equal((await OtherItem.getById(created.id)).quantity, 1);
});
