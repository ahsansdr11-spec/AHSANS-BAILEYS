// Auth state tests — atomicity, concurrency, crash recovery, shutdown flush
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { useMultiFileAuthState } from '../lib/Utils/use-multi-file-auth-state.js';
import { useSingleFileAuthState } from '../lib/Utils/use-single-file-auth-state.js';

const silentLogger = {
  level: 'silent',
  trace() { }, debug() { }, info() { }, warn() { }, error() { }, fatal() { },
  child() { return this; },
};

test('multi-file auth state — basic roundtrip + saveCreds', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  try {
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    state.creds.me = { id: '628123@s.whatsapp.net', name: 'Test' };
    state.creds.customField = { hello: 'world' };
    await saveCreds();

    // reopen — creds must survive
    const reopened = await useMultiFileAuthState(dir);
    assert.equal(reopened.state.creds.me?.id, '628123@s.whatsapp.net');
    assert.deepEqual(reopened.state.creds.customField, { hello: 'world' });

    // keys set/get roundtrip (incl. app-state-sync-key proto conversion)
    await reopened.state.keys.set({
      'pre-key': { '5': { privKey: Buffer.alloc(32, 1), pubKey: Buffer.alloc(32, 2) } },
      'app-state-sync-key': { '7': { keyData: Buffer.alloc(4, 1), timestamp: 12345 } },
    });
    const preKey = await reopened.state.keys.get('pre-key', ['5']);
    assert.ok(Buffer.isBuffer(preKey['5']?.privKey));
    const appState = await reopened.state.keys.get('app-state-sync-key', ['7']);
    assert.ok(appState['7']?.keyData, 'app-state-sync-key must be decoded back to a proto object');
    assert.equal(String(appState['7']?.timestamp), '12345');

    // deletion
    await reopened.state.keys.set({ 'pre-key': { '5': null } });
    const deleted = await reopened.state.keys.get('pre-key', ['5']);
    assert.ok(deleted['5'] == null, 'deleted key must read back as null/undefined');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('multi-file auth state — concurrent writes to the SAME key must not interleave (mutex)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  try {
    const { state } = await useMultiFileAuthState(dir);
    const WRITERS = 40;
    await Promise.all(Array.from({ length: WRITERS }, (_, i) =>
      state.keys.set({ session: { 'jid@s.whatsapp.net': { seq: i, payload: 'x'.repeat(2048) } } })));
    const final = await state.keys.get('session', ['jid@s.whatsapp.net']);
    assert.ok(final['jid@s.whatsapp.net'], 'final value exists');
    assert.equal(typeof final['jid@s.whatsapp.net'].seq, 'number');
    // no temp litter may remain
    const files = await readdir(dir);
    assert.ok(files.every(f => !f.endsWith('.tmp')), `no .tmp litter, got: ${files.join(',')}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('multi-file auth state — massive parallel key writes (pre-key churn) stay consistent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  try {
    const { state } = await useMultiFileAuthState(dir);
    const batches = [];
    for (let b = 0; b < 10; b++) {
      const data = { 'pre-key': {} };
      for (let i = 0; i < 50; i++) data['pre-key'][String(b * 50 + i)] = { id: b * 50 + i };
      batches.push(state.keys.set(data));
    }
    await Promise.all(batches);
    const ids = Array.from({ length: 500 }, (_, i) => String(i));
    const got = await state.keys.get('pre-key', ids);
    assert.equal(Object.values(got).filter(Boolean).length, 500, 'all 500 pre-keys must exist');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('multi-file auth state — crash recovery: pre-existing corrupted file does not kill startup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  try {
    await writeFile(join(dir, 'creds.json'), '{"noiseKey": TRUNCATED', 'utf-8');
    // must not throw — initAuthCreds fallback
    const { state } = await useMultiFileAuthState(dir);
    assert.ok(state.creds.noiseKey?.public, 'fresh creds generated');
    assert.ok(state.creds.signedIdentityKey);
    // secrets must be present but never printed by the library itself
    assert.equal(state.creds.advSecretKey.length, 44);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('multi-file auth state — rejects a non-directory path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  try {
    const filePath = join(dir, 'notadir');
    await writeFile(filePath, 'x');
    await assert.rejects(() => useMultiFileAuthState(filePath), /not a directory/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('single-file auth state — roundtrip, concurrent key writes, atomic temp cleanup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  const file = join(dir, 'auth.json');
  try {
    const s1 = await useSingleFileAuthState(file, { logger: silentLogger });
    s1.state.creds.me = { id: '628999@s.whatsapp.net', name: 'Single' };
    await s1.saveCreds();
    await s1.flush(); // force-write pending changes NOW (shutdown path)

    const raw = JSON.parse(await readFile(file, 'utf-8'));
    assert.equal(raw.creds?.me?.id, '628999@s.whatsapp.net');

    const s2 = await useSingleFileAuthState(file, { logger: silentLogger });
    assert.equal(s2.state.creds.me?.id, '628999@s.whatsapp.net');

    // hammer keys concurrently
    await Promise.all(Array.from({ length: 50 }, (_, i) =>
      s2.state.keys.set({ 'pre-key': { [String(i)]: { id: i, key: Buffer.alloc(32, i) } } })));
    await s2.flush();
    const got = s2.state.keys.get('pre-key', Array.from({ length: 50 }, (_, i) => String(i)));
    assert.equal(Object.values(got).filter(Boolean).length, 50);

    await s2.close();
    // no .temp litter in the directory
    const files = await readdir(dir);
    assert.ok(files.every(f => !f.includes('.temp')), `no temp litter, got: ${files.join(',')}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('single-file auth state — corrupted file starts fresh, no crash', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  const file = join(dir, 'auth.json');
  try {
    await writeFile(file, '{ not valid json !!!');
    const { state } = await useSingleFileAuthState(file, { logger: silentLogger });
    assert.ok(state.creds.noiseKey?.public, 'fresh creds on corrupted file');
    await state.keys.set({ 'session': { 'a@s.whatsapp.net': { ok: true } } });
    await state.close?.() ?? null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('single-file auth state — close() stops the debounce timer (process can exit)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  const file = join(dir, 'auth.json');
  try {
    const { execFile } = await import('node:child_process');
    const script = `
      import { useSingleFileAuthState } from ${JSON.stringify(join(process.cwd(), 'lib/Utils/use-single-file-auth-state.js'))};
      const { saveCreds, close } = await useSingleFileAuthState(${JSON.stringify(file)});
      await saveCreds();
      await close();
      // if the 3s debounce timer leaked, this setTimeout would NOT fire first
      const t0 = Date.now();
      await new Promise(r => setTimeout(r, 100));
      console.log('EXITED_FAST', Date.now() - t0 < 2000);
      process.exit(0);
    `;
    const started = Date.now();
    const stdout = await new Promise((resolve, reject) => {
      execFile(process.execPath, ['--input-type=module', '-e', script], { timeout: 10000 }, (err, out) => err ? reject(err) : resolve(out));
    });
    assert.match(stdout, /EXITED_FAST true/);
    assert.ok(Date.now() - started < 8000, 'process must not be held by leaked timers');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('single-file auth state — flush() after every write leaves NO pending 3s window', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  const file = join(dir, 'auth.json');
  try {
    const { state, close } = await useSingleFileAuthState(file, { logger: silentLogger });
    for (let i = 0; i < 25; i++) {
      state.keys.set({ 'session': { [`j${i}@s.whatsapp.net`]: { i } } });
    }
    await close();
    const raw = JSON.parse(await readFile(file, 'utf-8'));
    assert.equal(Object.keys(raw).filter(k => k.startsWith('session')).length, 25);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('single-file auth state — app-state-sync-key values are converted to protobuf objects', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'baileys-auth-'));
  const file = join(dir, 'auth.json');
  try {
    const { state, close } = await useSingleFileAuthState(file, { logger: silentLogger });
    await state.keys.set({ 'app-state-sync-key': { '3': { keyData: Buffer.alloc(4, 9), timestamp: 42 } } });
    const got = state.keys.get('app-state-sync-key', ['3']);
    assert.ok(got['3']?.keyData, 'proto conversion applied');
    assert.equal(String(got['3']?.timestamp), '42');
    await close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
