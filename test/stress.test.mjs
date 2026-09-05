// Stress / long-running simulation — memory stability, listener counts, timer hygiene
// These tests are intentionally quick (<30s) but emulate 24/7 patterns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import makeWASocket, { MessageRetryManager, makeEventBuffer, createReconnectManager } from '../lib/index.js';
import { useSingleFileAuthState } from '../lib/Utils/use-single-file-auth-state.js';

const silentLogger = {
  level: 'silent',
  trace() { }, debug() { }, info() { }, warn() { }, error() { }, fatal() { },
  child() { return this; },
};

const heapUsedMb = () => process.memoryUsage().heapUsed / 1024 / 1024;
const gcIfPossible = () => globalThis.gc?.();

test('stress — 20k buffered message events: bounded heap, stable listener count', async () => {
  const ev = makeEventBuffer(silentLogger);
  let received = 0;
  ev.on('messages.upsert', () => received++);

  const sampleMsg = { key: { remoteJid: 'x@s.whatsapp.net', fromMe: false, id: 'X' }, message: { conversation: 'y'.repeat(120) } };
  gcIfPossible();
  const heapStart = heapUsedMb();

  const ROUNDS = 400;
  for (let r = 0; r < ROUNDS; r++) {
    ev.buffer();
    for (let i = 0; i < 50; i++) {
      ev.emit('messages.upsert', { messages: [sampleMsg], type: 'notify' });
    }
    ev.flush();
  }
  gcIfPossible();
  const heapEnd = heapUsedMb();
  assert.equal(received, ROUNDS, 'every flushed event batch delivered');
  assert.ok(heapEnd - heapStart < 60, `heap growth must stay bounded (${(heapEnd - heapStart).toFixed(1)} MB)`);
  ev.destroy();
});

test('stress — reconnect churn: 30 rapid disconnects never duplicate sockets or listeners', { timeout: 20000 }, async () => {
  const sockets = [];
  const conn = createReconnectManager({
    makeSocket: () => {
      const ev = makeEventBuffer(silentLogger);
      const s = { ev, end: async () => { }, listenerCheck: () => ev.listenerCount('connection.update') };
      sockets.push(s);
      return s;
    },
    config: {},
    initialDelayMs: 1,
    maxDelayMs: 2,
    jitter: false,
  });
  await conn.start();
  for (let round = 0; round < 30; round++) {
    const current = sockets[sockets.length - 1];
    current.ev.emit('connection.update', {
      connection: 'close',
      lastDisconnect: { error: Object.assign(new Error('t'), { output: { statusCode: 428 } }), date: new Date() },
    });
    // wait for exactly one new socket
    for (let i = 0; i < 500 && sockets.length === round + 1; i++) {
      await new Promise(r => setTimeout(r, 2));
    }
    assert.ok(sockets.length <= round + 2, `no socket duplication (round ${round})`);
  }
  assert.ok(sockets.length >= 30, 'all reconnect cycles happened');
  conn.stop('stress done');
  assert.equal(conn.running, false);
});

test('stress — auth write churn: 2000 key writes + periodic saves keep timer count flat', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-stress-'));
  const file = join(dir, 'auth.json');
  try {
    const { state, saveCreds, close } = await useSingleFileAuthState(file, { logger: silentLogger });
    const timersBefore = process.getActiveResourcesInfo().filter(r => r === 'Timeout').length;
    for (let i = 0; i < 2000; i++) {
      state.keys.set({ session: { [`jid${i}@s.whatsapp.net`]: { i, blob: 'z'.repeat(64) } } });
      if (i % 500 === 0) await saveCreds();
    }
    await close();
    const timersAfter = process.getActiveResourcesInfo().filter(r => r === 'Timeout').length;
    assert.ok(timersAfter <= timersBefore, `no timer accumulation (before=${timersBefore}, after=${timersAfter})`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('stress — message retry cache churn: LRU bound holds under 5k messages', () => {
  const rm = new MessageRetryManager(silentLogger, 5);
  for (let i = 0; i < 5000; i++) {
    rm.addRecentMessage(`jid${i}@s.whatsapp.net`, `id${i}`, { i });
  }
  // RECENT_MESSAGES_SIZE = 512 — the LRU must evict, never grow unbounded
  assert.ok(!rm.getRecentMessage('jid0@s.whatsapp.net', 'id0'), 'oldest entry evicted');
  assert.ok(rm.getRecentMessage('jid4999@s.whatsapp.net', 'id4999'), 'newest entry retained');
  rm.clear();
});

test('stress — real socket: 50 rapid connect attempts each get their own single ws (no stacking)', async () => {
  // makeWASocket with an unreachable endpoint 50 times in a row — every instance
  // must fail independently and leave no timer behind
  const sockets = [];
  for (let i = 0; i < 50; i++) {
    const sock = makeWASocket({
      auth: { creds: {}, keys: { get: async () => ({}), set: async () => { } } },
      waWebSocketUrl: 'ws://127.0.0.1:1/ws/chat',
      connectTimeoutMs: 50,
      keepAliveIntervalMs: 100,
      defaultQueryTimeoutMs: 50,
      logger: silentLogger,
      autoFollowNewsletterOnConnect: false,
      fireInitQueries: false,
    });
    sockets.push(sock);
  }
  await Promise.all(sockets.map(s => new Promise((resolve) => {
    const safety = setTimeout(resolve, 3000); // safety net
    const onUpdate = (u) => {
      if (u.connection === 'close') {
        s.ev.off('connection.update', onUpdate);
        clearTimeout(safety); // don't count our own safety timer as a leak
        resolve();
      }
    };
    s.ev.on('connection.update', onUpdate);
  })));
  assert.ok(sockets.every(s => s.ws.isClosed), 'all 50 sockets closed');
  const timers = process.getActiveResourcesInfo().filter(r => r === 'Timeout' || r === 'Immediate');
  assert.ok(timers.length < 10, `no timer leak after 50 sockets (${timers.length} timers)`);
});
