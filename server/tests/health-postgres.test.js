import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import express from 'express';

process.env.DB_TYPE = 'postgres';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '1';
process.env.DB_SSL = 'disable';

const { initializeDatabase, getDatabase, closeDatabase } = await import('../db.js');
const { default: healthRoutes } = await import('../routes/health.js');

let server;
let baseUrl;

before(async () => {
  await initializeDatabase();
  const app = express();
  app.use('/healthz', healthRoutes);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await closeDatabase();
});

test('liveness returns 200 without querying PostgreSQL', async (t) => {
  const query = t.mock.method(getDatabase(), 'query', () => {
    throw new Error('Liveness must not query PostgreSQL');
  });
  const response = await fetch(`${baseUrl}/healthz`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'OK' });
  assert.equal(query.mock.callCount(), 0);
});

test('readiness checks PostgreSQL with a bounded SELECT 1 query', async (t) => {
  const query = t.mock.method(getDatabase(), 'query', async () => ({ rows: [{ '?column?': 1 }] }));
  const response = await fetch(`${baseUrl}/healthz/ready`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'OK' });
  assert.deepEqual(query.mock.calls[0].arguments, [{ text: 'SELECT 1', query_timeout: 2000 }]);
});

test('readiness returns 503 and logs query failures', async (t) => {
  const error = new Error('PostgreSQL connection lost');
  t.mock.method(getDatabase(), 'query', async () => { throw error; });
  const log = t.mock.method(console, 'error', () => {});
  const response = await fetch(`${baseUrl}/healthz/ready`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'NOT_READY' });
  assert.equal(log.mock.calls[0].arguments[1], error);
});

test('an actual PostgreSQL connection failure returns 503 without affecting liveness', async (t) => {
  t.mock.method(console, 'error', () => {});
  const response = await fetch(`${baseUrl}/healthz/ready`);
  assert.equal(response.status, 503);
  assert.equal((await fetch(`${baseUrl}/healthz`)).status, 200);
});
