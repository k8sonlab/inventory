import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import cors from 'cors';
import { accessLog, debugLog } from '../utils/logging.js';

test('debug output is suppressed only in production', (t) => {
  const originalEnvironment = process.env.NODE_ENV;
  t.after(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
  });
  const debug = t.mock.method(console, 'debug', () => {});
  process.env.NODE_ENV = 'production';
  debugLog('SQL details');
  assert.equal(debug.mock.callCount(), 0);
  process.env.NODE_ENV = 'development';
  debugLog('SQL details');
  assert.equal(debug.mock.callCount(), 1);
});

test('access logs cover success, errors, missing routes, and CORS without sensitive data', async (t) => {
  const entries = [];
  t.mock.method(console, 'log', (line) => entries.push(JSON.parse(line)));
  const app = express();
  app.use(accessLog);
  app.use(cors());
  app.use(express.json());
  app.get('/healthz', (req, res) => res.sendStatus(200));
  app.get('/failure', (req, res) => res.sendStatus(503));
  app.use((err, req, res, next) => res.sendStatus(400));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, options, status] of [
    ['/healthz?token=secret', { headers: { authorization: 'Bearer secret' } }, 200],
    ['/failure', {}, 503],
    ['/missing', {}, 404],
    ['/healthz', { method: 'OPTIONS' }, 204],
    ['/healthz', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"secret":' }, 400]
  ]) {
    const response = await fetch(base + path, options);
    assert.equal(response.status, status);
    await response.text();
  }
  assert.equal(entries.length, 5);
  assert.deepEqual(entries.map((entry) => entry.status), [200, 503, 404, 204, 400]);
  assert.equal(entries[0].path, '/healthz');
  assert.equal(entries[3].method, 'OPTIONS');
  assert.equal(JSON.stringify(entries).includes('secret'), false);
  for (const entry of entries) {
    assert.equal(entry.type, 'access');
    assert.ok(Number.isFinite(entry.duration_ms) && entry.duration_ms >= 0);
    assert.ok(Number.isFinite(Date.parse(entry.timestamp)));
    assert.equal(entry.remote_address, '127.0.0.1');
  }
});

test('aborted requests are logged once with status 499', (t) => {
  const output = t.mock.method(console, 'log', () => {});
  const res = new EventEmitter();
  res.writableFinished = false;
  res.statusCode = 200;
  let nextCalled = false;
  accessLog({
    method: 'GET',
    originalUrl: '/slow?token=secret',
    socket: { remoteAddress: '127.0.0.1' }
  }, res, () => { nextCalled = true; });
  res.emit('close');
  res.emit('finish');
  assert.equal(nextCalled, true);
  assert.equal(output.mock.callCount(), 1);
  const entry = JSON.parse(output.mock.calls[0].arguments[0]);
  assert.equal(entry.status, 499);
  assert.equal(entry.aborted, true);
  assert.equal(entry.path, '/slow');
});
