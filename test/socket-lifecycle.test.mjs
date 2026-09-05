// Socket lifecycle tests — connection engine, reconnect boundaries, graceful shutdown
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer } from 'ws';
import { once } from 'node:events';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import makeWASocket from '../lib/index.js';

const silentLogger = {
  level: 'silent',
  trace() { }, debug() { }, info() { }, warn() { }, error() { }, fatal() { },
  child() { return this; },
};

const makeAuth = () => ({
  creds: {},
  keys: {
    get: async () => ({}),
    set: async () => { },
  },
});

test('socket lifecycle — connect to a local WS server that drops the connection', async () => {
  const wss = new WebSocketServer({ port: 0 });
  await once(wss, 'listening');
  const { port } = wss.address();
  // every client that connects gets its socket killed immediately (simulates flaky network)
  wss.on('connection', (ws) => setTimeout(() => ws.close(), 20));

  const unhandled = [];
  const onUnhandled = (err) => unhandled.push(err);
  process.on('unhandledRejection', onUnhandled);
  try {
    const sock = makeWASocket({
      auth: makeAuth(),
      waWebSocketUrl: `ws://127.0.0.1:${port}/ws/chat`,
      connectTimeoutMs: 2000,
      keepAliveIntervalMs: 60000,
      defaultQueryTimeoutMs: 1000,
      logger: silentLogger,
      autoFollowNewsletterOnConnect: false,
      fireInitQueries: false,
    });

    const updates = [];
    await new Promise((resolve) => {
      const onUpdate = (u) => {
        updates.push(u);
        if (u.connection === 'close') {
          sock.ev.off('connection.update', onUpdate);
          resolve();
        }
      };
      sock.ev.on('connection.update', onUpdate);
    });

    assert.equal(updates[0].connection, 'connecting');
    assert.equal(updates[updates.length - 1].connection, 'close');
    assert.ok(updates[updates.length - 1].lastDisconnect?.error, 'close carries the disconnect error');

    // socket internals cleaned up
    assert.equal(sock.ws.isClosed, true, 'ws must be closed');
    assert.ok(sock.ws.listenerCount('message') === 0, 'no message listeners left on ws');
    assert.ok(sock.ws.listenerCount('close') === 0, 'no close listeners left on ws');

    // end() must be idempotent
    await sock.end().catch(() => { });
    await sock.end().catch(() => { });

    // give any (wrong) async work a moment, then assert no crashes happened
    await new Promise(r => setTimeout(r, 100));
    assert.equal(unhandled.length, 0, `no unhandled rejections, got: ${unhandled.map(e => e?.message).join(' | ')}`);
  } finally {
    process.off('unhandledRejection', onUnhandled);
    await new Promise(r => wss.close(r));
  }
});

test('socket lifecycle — unreachable port produces a clean close (no hang, no crash)', async () => {
  const sock = makeWASocket({
    auth: makeAuth(),
    waWebSocketUrl: 'ws://127.0.0.1:1/ws/chat', // nothing listens here
    connectTimeoutMs: 500,
    keepAliveIntervalMs: 60000,
    defaultQueryTimeoutMs: 500,
    logger: silentLogger,
    autoFollowNewsletterOnConnect: false,
    fireInitQueries: false,
  });
  const last = await new Promise((resolve) => {
    const onUpdate = (u) => {
      if (u.connection === 'close') {
        sock.ev.off('connection.update', onUpdate);
        resolve(u);
      }
    };
    sock.ev.on('connection.update', onUpdate);
  });
  assert.equal(last.connection, 'close');
  assert.ok(last.lastDisconnect?.error);
  assert.equal(sock.ws.isClosed, true);
});

test('socket lifecycle — keepalive timer is cleared on close (process can exit)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-sock-'));
  try {
    const script = `
      import makeWASocket from ${JSON.stringify(join(process.cwd(), 'lib/index.js'))};
      const sock = makeWASocket({
        auth: { creds: {}, keys: { get: async () => ({}), set: async () => { } } },
        waWebSocketUrl: 'ws://127.0.0.1:1/ws/chat',
        connectTimeoutMs: 300,
        keepAliveIntervalMs: 100,
        defaultQueryTimeoutMs: 300,
        logger: { level: 'silent', trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } },
        autoFollowNewsletterOnConnect: false,
        fireInitQueries: false,
      });
      const t0 = Date.now();
      await new Promise((resolve) => {
        const onUpdate = (u) => {
          if (u.connection === 'close') { sock.ev.off('connection.update', onUpdate); resolve(); }
        };
        sock.ev.on('connection.update', onUpdate);
      });
      // if the keepalive interval (100ms) leaked, this 150ms timeout would never be reached
      await new Promise(r => setTimeout(r, 150));
      console.log('CAN_EXIT', Date.now() - t0 < 5000);
      process.exit(0);
    `;
    const started = Date.now();
    const out = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script], { timeout: 15000 })
      .then(r => r.stdout).catch(err => { throw new Error(err.stdout + String(err.stderr || '')); });
    assert.match(out, /CAN_EXIT true/);
    assert.ok(Date.now() - started < 12000);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('socket lifecycle — duplicate close storms (many close/error events) emit exactly one close', async () => {
  const wss = new WebSocketServer({ port: 0 });
  await once(wss, 'listening');
  const { port } = wss.address();
  wss.on('connection', (ws) => setTimeout(() => { ws.terminate(); }, 20));

  const sock = makeWASocket({
    auth: makeAuth(),
    waWebSocketUrl: `ws://127.0.0.1:${port}/ws/chat`,
    connectTimeoutMs: 2000,
    keepAliveIntervalMs: 60000,
    logger: silentLogger,
    autoFollowNewsletterOnConnect: false,
    fireInitQueries: false,
  });
  let closeEvents = 0;
  await new Promise((resolve) => {
    const onUpdate = (u) => {
      if (u.connection === 'close') {
        closeEvents++;
        // keep listening and hammer end() — must not emit a second close
        sock.end().catch(() => { });
        setTimeout(resolve, 150);
      }
    };
    sock.ev.on('connection.update', onUpdate);
    setTimeout(() => resolve(), 1000);
  });
  sock.ev.removeAllListeners?.('connection.update');
  assert.equal(closeEvents, 1, `exactly one close event expected, got ${closeEvents}`);
  await new Promise(r => wss.close(r));
});
