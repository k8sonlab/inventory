import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';

process.env.DB_TYPE = 'sqlite';
process.env.DB_FILE = ':memory:';

const { initializeDatabase, getDatabase } = await import('../db.js');
const { default: healthRoutes } = await import('../routes/health.js');

test('SQLite liveness and readiness return 200 without database queries', async (t) => {
  await initializeDatabase();
  const db = getDatabase();
  t.after(() => db.close());
  const query = t.mock.method(db, 'exec', () => {
    throw new Error('SQLite health checks must not query the database');
  });
  const app = express();
  app.use('/healthz', healthRoutes);
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  for (const path of ['/healthz', '/healthz/ready']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'OK' });
  }
  assert.equal(query.mock.callCount(), 0);
});
