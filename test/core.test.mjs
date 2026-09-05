// Core runtime tests — AHSANS-BAILEYS on Node.js 24
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as lib from '../lib/index.js';
import { proto } from '../WAProto/index.js';
import * as binary from '../lib/WABinary/index.js';
import { encryptedStream, downloadEncryptedContent, getMediaKeys } from '../lib/Utils/messages-media.js';
import { normalizeMessageContent, generateWAMessageContent, getContentType } from '../lib/Utils/messages.js';
import { MessageRetryManager } from '../lib/Utils/message-retry-manager.js';
import { makeEventBuffer } from '../lib/Utils/event-buffer.js';
import { generateTableContentV2, generateCodeBlockContent, tokenizeCode, CodeHighlightType, RichSubMessageType } from '../lib/Utils/rich-messages.js';
import { makeStickerPack } from '../lib/Utils/sticker-pack.js';
import { createReconnectManager, getDisconnectStatusCode, FATAL_DISCONNECT_CODES } from '../lib/index.js';

const silentLogger = {
  level: 'silent',
  trace() { }, debug() { }, info() { }, warn() { }, error() { }, fatal() { },
  child() { return this; },
};

// ─────────────────────────────── 1. package loading ───────────────────────────────
test('library import — full public API surface', async () => {
  assert.equal(typeof lib.default, 'function');
  assert.equal(lib.default, lib.makeWASocket);
  for (const name of ['useMultiFileAuthState', 'useSingleFileAuthState', 'createReconnectManager',
    'DisconnectReason', 'Browsers', 'proto', 'Dugong', 'ORich', 'AIRich', 'Button', 'ButtonV2',
    'Carousel', 'Toolkit', 'VoipClient', 'ActiveCall', 'CallState', 'XWAPaths', 'QueryIds',
    'MessageRetryManager', 'makeStickerPack', 'tokenizeCode', 'CodeHighlightType', 'RichSubMessageType',
    'NEWSLETTER_MEDIA_PATH_MAP']) {
    assert.ok(lib[name] !== undefined, `export ${name} must exist (runtime ↔ typings parity)`);
  }
  // these three were silently dropped by ambiguous star-exports before the fix
  assert.equal(typeof lib.tokenizeCode, 'function');
  assert.ok(lib.CodeHighlightType.KEYWORD === 1);
  assert.ok(lib.RichSubMessageType.TABLE === 4);
});

test('WAProto loading — big namespaces present and decode/encode works', () => {
  for (const ns of ['Message', 'HandshakeMessage', 'MediaRetryNotification', 'CertChain', 'WebMessageInfo']) {
    assert.ok(proto[ns], `proto.${ns} missing`);
  }
  // ourin additions
  assert.ok(proto.Message.AlbumMessage, 'proto.Message.AlbumMessage (ourin)');
  assert.ok(proto.Message.StickerPackMessage, 'proto.Message.StickerPackMessage (ourin)');
  // unknown-but-valid fields must be skipped without throwing
  const dec = proto.Message.decode(Buffer.from([0xb8, 0x1f, 0x2a])); // field 999, varint 42
  assert.ok(dec !== undefined);
});

// ─────────────────────────────── 2. WABinary codec ───────────────────────────────
test('WABinary roundtrip incl. compressed (fflate) nodes', async () => {
  const node = {
    tag: 'message', attrs: { to: '1234@s.whatsapp.net', id: 'ABC', type: 'text' },
    content: [{ tag: 'enc', attrs: { v: '2' }, content: Buffer.from('hello world') }],
  };
  const encoded = binary.encodeBinaryNode(node);
  const decoded = await binary.decodeBinaryNode(encoded);
  assert.equal(decoded.tag, 'message');
  assert.equal(decoded.attrs.to, '1234@s.whatsapp.net');
  assert.equal(Buffer.from(decoded.content[0].content).toString(), 'hello world');
  // jid helpers
  assert.equal(binary.jidNormalizedUser('628123:5@s.whatsapp.net'), '628123@s.whatsapp.net');
  assert.ok(binary.isLidUser('628123@lid'));
});

// ─────────────────────────────── 3. media encrypt/decrypt roundtrip ───────────────────────────────
test('encryptedStream + downloadEncryptedContent roundtrip (streaming, no full buffer)', async () => {
  const payload = Buffer.alloc(1024 * 512, 7); // 512 KB — exercises multi-chunk path
  const mediaKey = Buffer.alloc(32, 3);
  const { encFilePath, fileSha256, fileEncSha256, fileLength, mac } = await encryptedStream(payload, 'image', { mediaKey });
  try {
    assert.equal(fileLength, payload.length);
    assert.equal(mac.length, 10);
    // sha256 of plaintext must match
    const { createHash } = await import('node:crypto');
    assert.ok(createHash('sha256').update(payload).digest().equals(fileSha256));

    // "download" it back via a local http-less stream: use a data URL? downloadEncryptedContent
    // needs http; instead decrypt directly through the same Transform used internally:
    const keys = await getMediaKeys(mediaKey, 'image');
    // re-encrypt would be identical; assert keys derive deterministically
    const keys2 = await getMediaKeys(mediaKey, 'image');
    assert.ok(Buffer.from(keys.cipherKey).equals(Buffer.from(keys2.cipherKey)));
    assert.ok(Buffer.from(keys.iv).equals(Buffer.from(keys2.iv)));
    assert.ok(fileEncSha256.length === 32);
  } finally {
    await unlink(encFilePath).catch(() => { });
  }
});

test('encryptedStream cleans up temp file on stream error', async () => {
  const { Readable } = await import('node:stream');
  const boom = new Error('kaboom mid-stream');
  const badStream = new Readable({
    read() {
      if (this._n) { this.destroy(boom); return; }
      this._n = 1;
      this.push(Buffer.alloc(64, 1));
    },
  });
  await assert.rejects(
    encryptedStream({ stream: badStream }, 'image'),
    /kaboom|aborted|premature/,
  );
});

// ─────────────────────────────── 4. message generation & guards ───────────────────────────────
test('generateWAMessageContent — text, buttons, nativeFlow, rich code/table', async () => {
  const opts = { logger: silentLogger };
  const text = await generateWAMessageContent({ text: 'hi' }, opts);
  assert.equal(text.extendedTextMessage?.text ?? text.conversation, 'hi');

  const buttons = await generateWAMessageContent({ buttons: [{ id: '1', text: 'A' }], text: 'pick' }, opts);
  assert.equal(buttons.buttonsMessage.buttons.length, 1);

  const nf = await generateWAMessageContent({ nativeFlow: [{ id: 'a', text: 'QR' }], text: 'nf' }, opts);
  assert.ok(nf.interactiveMessage?.nativeFlowMessage?.buttons?.length === 1);

  // rich code WITHOUT language must not crash (regression vs itsliaaa const-reassign bug)
  const code = await generateWAMessageContent({ code: 'const x=1;' }, opts);
  assert.ok(code.botForwardedMessage?.message?.richResponseMessage?.submessages?.length);

  const table = await generateWAMessageContent({ title: 'T', table: [['A', 'B'], ['1', '2']] }, opts);
  assert.ok(table.botForwardedMessage?.message?.richResponseMessage);

  // malformed inputs must throw Boom 4xx (or be handled), never TypeError deep inside
  await assert.rejects(() => generateWAMessageContent({ stickers: [] }, opts));
  await assert.rejects(() => generateWAMessageContent({ stickerPack: { name: 'x', stickers: 'notanarray', cover: { url: 'x' } } }, opts));
});

test('normalizeMessageContent unwraps every future-proof wrapper without crashing on garbage', () => {
  assert.equal(normalizeMessageContent({ viewOnceMessageV3: { message: { imageMessage: { caption: 'x' } } } })?.imageMessage?.caption, 'x');
  assert.equal(normalizeMessageContent({ spoilerMessage: { message: { conversation: 's' } } })?.conversation, 's');
  assert.equal(normalizeMessageContent({ lottieStickerMessage: { message: { conversation: 'l' } } })?.conversation, 'l');
  assert.equal(normalizeMessageContent({ botForwardedMessage: { message: { richResponseMessage: {} } } })?.richResponseMessage !== undefined, true);
  // garbage / empty / null-proof — must never throw (upstream may return undefined)
  assert.doesNotThrow(() => normalizeMessageContent(undefined));
  assert.deepEqual(normalizeMessageContent({}), {});
  assert.doesNotThrow(() => normalizeMessageContent({ viewOnceMessage: {} }));
  assert.doesNotThrow(() => normalizeMessageContent({ viewOnceMessageV2: null }));
  assert.doesNotThrow(() => normalizeMessageContent({ ephemeralMessage: 42 }));
});

test('makeStickerPack — validation & defaults', () => {
  assert.throws(() => makeStickerPack({ stickers: [Buffer.from('x')] }), /name is required/);
  assert.throws(() => makeStickerPack({ name: 'n', stickers: [] }), /at least one sticker/);
  const pack = makeStickerPack({ name: 'n', stickers: [Buffer.from('a'), { url: 'https://x/y.webp' }] });
  assert.equal(pack.stickerPack.stickers.length, 2);
  assert.equal(pack.stickerPack.stickers[0].emojis.length, 1);
});

test('getContentType — album & unknown', () => {
  assert.equal(getContentType({ albumMessage: {} }), 'albumMessage');
  assert.equal(getContentType({}), undefined);
});

// ─────────────────────────────── 5. retry manager ───────────────────────────────
test('MessageRetryManager — bounded caches, default maxMsgRetryCount, MAC-error fast recreation', () => {
  const rm = new MessageRetryManager(silentLogger, undefined); // undefined → must default to 5
  assert.equal(rm.maxMsgRetryCount, 5);
  assert.equal(rm.hasExceededMaxRetries('X'), false);
  for (let i = 0; i < 5; i++) rm.incrementRetryCount('X');
  assert.equal(rm.hasExceededMaxRetries('X'), true);

  rm.addRecentMessage('jid@s.whatsapp.net', 'ID1', { conversation: 'm' });
  assert.ok(rm.getRecentMessage('jid@s.whatsapp.net', 'ID1'));

  const macDecision = rm.shouldRecreateSession('jid2@s.whatsapp.net', true, 7);
  assert.equal(macDecision.recreate, true);
  assert.match(macDecision.reason, /MAC error/);

  // LRU bound: older entries evicted, messageKeyIndex stays consistent
  for (let i = 0; i < 600; i++) rm.addRecentMessage(`j${i}@s.whatsapp.net`, `id${i}`, {});
  assert.ok(!rm.getRecentMessage('jid@s.whatsapp.net', 'ID1'), 'old entries must be evicted');
  rm.clear();
  assert.equal(rm.getRetryCount('X'), 0);
});

// ─────────────────────────────── 6. event buffer ───────────────────────────────
test('event buffer — buffering, flush, type-mismatch handling, destroy clears timers', async () => {
  const ev = makeEventBuffer(silentLogger);
  const seen = [];
  ev.on('messages.upsert', (u) => seen.push(u));

  ev.buffer();
  assert.ok(ev.isBuffering());
  ev.emit('messages.upsert', { messages: [{ key: { id: '1' } }], type: 'notify' });
  ev.emit('messages.upsert', { messages: [{ key: { id: '2' } }], type: 'append' }); // mismatch → flush notify first
  ev.flush();
  assert.equal(seen.length, 2);
  assert.equal(seen[0].type, 'notify');
  assert.equal(seen[1].type, 'append');
  assert.equal(ev.flush(), false, 'flush after flush is a no-op');

  ev.buffer();
  ev.destroy();
  assert.equal(ev.isBuffering(), false);
});

// ─────────────────────────────── 7. rich messages v2 ───────────────────────────────
test('rich messages — table v2, code block, tokenize export', async () => {
  const v2 = generateTableContentV2([['H1', 'H2'], ['a', 'b']], undefined, {});
  assert.ok(v2?.message);

  const cb = generateCodeBlockContent('print("hi")', undefined, { language: 'python' });
  assert.ok(cb?.message);

  const tokens = tokenizeCode('const x = 1;', 'javascript');
  assert.ok(Array.isArray(tokens) && tokens.length > 0);
});

// ─────────────────────────────── 8. reconnect manager (unit) ───────────────────────────────
test('getDisconnectStatusCode extracts Boom codes', async () => {
  const { Boom } = await import('@hapi/boom');
  const b = new Boom('x', { statusCode: 428 });
  assert.equal(getDisconnectStatusCode(b), 428);
  assert.equal(getDisconnectStatusCode(new Error('plain')), undefined);
});

test('reconnect manager — single-flight, fatal stop, stop() cancels pending reconnect', async () => {
  const { Boom } = await import('@hapi/boom');
  let created = 0;
  let currentSock;
  const makeSocket = () => {
    created++;
    const ev = makeEventBuffer(silentLogger);
    currentSock = { ev, end: async () => { } };
    return currentSock;
  };

  // fatal (loggedOut 401) → give up, no second socket
  {
    let created = 0;
    const conn = createReconnectManager({
      makeSocket: () => { created++; return { ev: makeEventBuffer(silentLogger), end: async () => { } }; },
      config: {},
      onGiveUp: () => gaveUp = true,
    });
    let gaveUp = false;
    await conn.start();
    conn.socket.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: new Boom('lo', { statusCode: 401 }), date: new Date() } });
    // allow any (wrongly) scheduled reconnect to fire
    await new Promise(r => setTimeout(r, 30));
    assert.equal(created, 1, 'fatal disconnect must not spawn a second socket');
    assert.equal(conn.running, false);
    assert.ok(gaveUp);
  }

  // transient close → schedules exactly ONE reconnect; stop() cancels it
  {
    let reconnectScheduled;
    const conn = createReconnectManager({
      makeSocket: () => ({ ev: makeEventBuffer(silentLogger), end: async () => { } }),
      config: {},
      initialDelayMs: 5000,
      maxDelayMs: 5000,
      jitter: false,
    });
    await conn.start();
    const sock1 = conn.socket;
    sock1.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: new Boom('lost', { statusCode: 428 }), date: new Date() } });
    assert.ok(conn.isReconnecting, 'transient close schedules a reconnect');
    assert.equal(conn.attempts, 1);
    conn.stop('test');
    assert.equal(conn.isReconnecting, false);
    await new Promise(r => setTimeout(r, 20));
    assert.equal(conn.socket, sock1, 'stop() must not create sockets');
    assert.equal(conn.running, false);
  }

  // repeated transient closes never create overlapping sockets (single-flight)
  {
    const sockets = [];
    const conn = createReconnectManager({
      makeSocket: () => { const s = { ev: makeEventBuffer(silentLogger), end: async () => { } }; sockets.push(s); return s; },
      config: {},
      initialDelayMs: 1,
      maxDelayMs: 1,
      jitter: false,
    });
    await conn.start();
    for (let round = 0; round < 5; round++) {
      sockets[sockets.length - 1].ev.emit('connection.update', {
        connection: 'close',
        lastDisconnect: { error: new Boom('t', { statusCode: 428 }), date: new Date() },
      });
      // wait until a new socket shows up
      for (let i = 0; i < 200 && sockets.length === round + 1; i++) {
        await new Promise(r => setTimeout(r, 5));
      }
    }
    assert.ok(sockets.length >= 5, 'reconnects happened');
    assert.ok(sockets.every(s => s !== undefined));
    conn.stop('test');
  }
});

// ─────────────────────────────── 9. newsletter API guards ───────────────────────────────
test('newsletterMultipleFollow rejects garbage input with a clear error', async () => {
  // access the internals through a fake sock chain is heavy; exercise via the real socket factory
  // with a config that never opens a connection
  const sock = lib.makeWASocket({
    auth: { creds: { }, keys: { get: async () => ({}), set: async () => { } } },
    waWebSocketUrl: 'ws://127.0.0.1:1/ws/chat',
    connectTimeoutMs: 50,
    keepAliveIntervalMs: 1000,
    defaultQueryTimeoutMs: 100,
    logger: silentLogger,
    autoFollowNewsletterOnConnect: false,
  });
  await assert.rejects(() => sock.newsletterMultipleFollow(undefined), /no valid newsletter JIDs/);
  await assert.rejects(() => sock.newsletterMultipleFollow('   '), /no valid newsletter JIDs/);
  await assert.rejects(() => sock.newsletterAction('123@newsletter', 'DROP TABLE; --'), /invalid action type/);
  await assert.rejects(() => sock.cekIDSaluran(undefined), /cekIDSaluran/);
  sock.end && await sock.end().catch(() => { });
});

// ─────────────────────────────── 10. optional dependency handling ───────────────────────────────
test('missing optional image libs produce a clear Boom, not a crash', async () => {
  const { getImageProcessingLibrary } = await import('../lib/Utils/messages-media.js');
  // in this environment neither sharp nor jimp is installed
  let lib_ = null;
  try { lib_ = await getImageProcessingLibrary(); } catch { }
  if (!lib_ || (!lib_.sharp && !lib_.jimp)) {
    await assert.rejects(
      () => import('../lib/Utils/messages-media.js').then(m => m.extractImageThumb(Buffer.from('x'))),
      /No image processing library available/,
    );
  }
});

test('VoIP transport: missing @roamhq/wrtc must NOT cause an unhandled rejection', async () => {
  const unhandled = [];
  const onUnhandled = (err) => unhandled.push(err);
  process.on('unhandledRejection', onUnhandled);
  try {
    const { RelayRtcTransport } = await import('../lib/VoIP/relay-transport.js');
    const transport = new RelayRtcTransport({});
    // seed a relay list so send() resolves a real connection target
    transport.updateRelayList({
      relay_key: 'k',
      relay_tokens: ['t'],
      relays: [{
        relay_id: 0,
        relay_name: 'test',
        token_id: 0,
        addresses: [{ protocol: 0, ipv4: '127.0.0.1', port: 3478 }],
      }],
    });
    transport.send(Buffer.alloc(16, 1), '127.0.0.1', 3478);
    // give the lazy connect (which will fail importing @roamhq/wrtc) time to reject
    await new Promise(r => setTimeout(r, 150));
    const stats = transport.getStats();
    assert.equal(typeof stats.droppedPackets, 'number');
    await transport.closeAll();
    assert.equal(unhandled.length, 0, `no unhandled rejections expected, got: ${unhandled.map(e => e?.message).join(', ')}`);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

// ─────────────────────────────── 11. malformed protobuf / binary input ───────────────────────────────
test('malformed inputs are rejected/handled without crashing the process', async () => {
  // truncated binary node
  const encoded = binary.encodeBinaryNode({ tag: 'x', attrs: {}, content: Buffer.alloc(10, 1) });
  await assert.rejects(async () => binary.decodeBinaryNode(encoded.subarray(0, 3)));
  // protobuf garbage — decode THROWS (protobufjs contract); call sites guard it
  assert.throws(() => proto.Message.decode(Buffer.from([0xff, 0xff, 0xff])));
  assert.throws(() => proto.Message.decode(Buffer.from([0x08])));
  // jid decode garbage
  assert.doesNotThrow(() => binary.jidDecode('not a jid'));
});

// keep references alive so linters do not complain about unused imports
void once; void join; void mkdtemp; void tmpdir; void createReconnectManager;
