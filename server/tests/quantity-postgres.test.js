import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.DB_TYPE = 'postgres';

const { initializeDatabase, getDatabase, closeDatabase } = await import('../db.js');
const { runMigrations } = await import('../migrations/run.js');
const { OtherItem } = await import('../models/index.js');

test('PostgreSQL schema migrates floating quantities to integers and models round down', async (t) => {
  await initializeDatabase();
  t.after(closeDatabase);
  const statements = [];
  const query = t.mock.method(getDatabase(), 'query', async (sql, params) => {
    statements.push(sql);
    if (sql.includes('INSERT INTO other_items')) {
      assert.equal(params[5], 1);
    }
    if (sql.includes('UPDATE other_items')) {
      assert.equal(params[4], 2);
    }
    return { rows: [] };
  });

  await runMigrations();
  const tables = ['items', 'rc_parts', 'screws', 'nuts', 'bearings',
    'washers_bearings', 'oil_pastes', 'batteries', 'other_items'];
  for (const table of tables) {
    const create = statements.find(sql => sql.includes(`CREATE TABLE IF NOT EXISTS ${table} (`));
    assert.match(create, /quantity INTEGER DEFAULT 0/);
  }
  const upgrade = statements.find(sql => sql.includes('ALTER COLUMN quantity TYPE'));
  assert.match(upgrade, /'double precision', 'numeric'/);
  assert.match(upgrade, /table_schema = current_schema\(\)/);
  for (const table of tables) assert.ok(upgrade.includes(`'${table}'`));
  assert.match(upgrade, /USING floor\(quantity\)::integer/);

  await OtherItem.create({ name: 'Fractional item', quantity: 1.5 });
  await OtherItem.update('test-id', { name: 'Fractional item', quantity: 2.75 });
  assert.ok(query.mock.callCount() > 0);
});
