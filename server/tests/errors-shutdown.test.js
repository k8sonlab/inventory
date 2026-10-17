import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { errorHandler, sendError } from '../utils/httpErrors.js';

const serverDirectory = path.dirname(fileURLToPath(new URL('../index.js', import.meta.url)));

async function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test('database details never reach clients; validation messages do', async (t) => {
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args));
  const pgError = Object.assign(new Error('relation "items" does not exist'), { code: '42P01' });
  const sqliteError = new Error('no such table: items');
  const uniqueError = Object.assign(new Error('duplicate key value violates unique constraint "shelves_pkey"'), { code: '23505' });
  const sqliteUnique = new Error('UNIQUE constraint failed: categories.name');
  const app = express();
  app.use(express.json());
  app.get('/pg', (req, res) => sendError(res, pgError, 400));
  app.get('/sqlite', (req, res) => sendError(res, sqliteError));
  app.get('/unique', (req, res) => sendError(res, uniqueError, 400));
  app.get('/sqlite-unique', (req, res) => sendError(res, sqliteUnique, 400));
  app.get('/validation', (req, res) => sendError(res, new Error('Name is required'), 400));
  app.get('/boom', () => { throw new Error('secret internals'); });
  app.use(errorHandler);
  const { server, base } = await listen(app);
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const results = {};
  for (const route of ['pg', 'sqlite', 'unique', 'sqlite-unique', 'validation', 'boom']) {
    const response = await fetch(`${base}/${route}`);
    results[route] = [response.status, await response.json()];
  }
  assert.deepEqual(results.pg, [500, { error: 'Internal server error' }]);
  assert.deepEqual(results.sqlite, [500, { error: 'Internal server error' }]);
  assert.deepEqual(results.unique, [409, { error: 'Request conflicts with existing data' }]);
  assert.deepEqual(results['sqlite-unique'], [409, { error: 'Request conflicts with existing data' }]);
  assert.deepEqual(results.validation, [400, { error: 'Name is required' }]);
  assert.deepEqual(results.boom, [500, { error: 'Internal server error' }]);
  assert.equal(JSON.stringify(results).match(/relation|no such table|secret|pkey|categories/), null);
  assert.ok(errors.length >= 5, 'details are still logged server-side');

  const malformed = express();
  malformed.use(express.json());
  malformed.post('/', (req, res) => res.sendStatus(200));
  malformed.use(errorHandler);
  const second = await listen(malformed);
  t.after(() => new Promise((resolve) => { second.server.close(resolve); second.server.closeAllConnections(); }));
  const response = await fetch(second.base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":' });
  assert.equal(response.status, 400);
});

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

for (const signal of ['SIGTERM', 'SIGINT']) {
  test(`${signal} saves the SQLite database and exits cleanly`, async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'inventory-shutdown-'));
    t.after(() => rm(directory, { recursive: true, force: true }));
    const databaseFile = path.join(directory, 'inventory.db');
    const port = await freePort();
    let output = '';
    const child = spawn(process.execPath, ['index.js'], {
      cwd: serverDirectory,
      env: { ...process.env, NODE_ENV: 'production', DB_TYPE: 'sqlite', DB_FILE: databaseFile, PORT: String(port) }
    });
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
    for (let attempt = 0; attempt < 200; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/healthz`);
        await response.text();
        if (response.status === 200) break;
      } catch { /* server still starting */ }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    child.kill(signal);
    const [code, receivedSignal] = await once(child, 'exit');
    assert.equal(code, 0, output);
    assert.equal(receivedSignal, null);
    assert.match(output, new RegExp(`Received ${signal}`));
    assert.ok((await stat(databaseFile)).size > 0, 'database file saved');
  });
}
