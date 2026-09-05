import { jidNormalizedUser } from '../lib/WABinary/index.js';
import * as binary from '../lib/WABinary/index.js';
import { proto } from '../WAProto/index.js';
import { encryptedStream } from '../lib/Utils/messages-media.js';
import { getContentType, normalizeMessageContent } from '../lib/Utils/messages.js';
import { generateTableContent, generateListContent } from '../lib/Utils/rich-messages.js';
import { getButtonType, NATIVE_FLOW_BUTTON_MAP } from '../lib/Socket/messages-send.js';
import { generateWAMessageContent } from '../lib/Utils/messages.js';
import { NEWSLETTER_MEDIA_PATH_MAP } from '../lib/Defaults/index.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK: ' : 'FAIL: ') + m); if (!c) fails++; };

// 1) binary codec roundtrip
const node = { tag: 'message', attrs: { to: '1234@s.whatsapp.net', id: 'ABC' }, content: [{ tag: 'enc', attrs: { v: '2' }, content: Buffer.from('hello') }] };
const encoded = binary.encodeBinaryNode(node);
const decoded = await binary.decodeBinaryNode(encoded);
ok(decoded.tag === 'message' && decoded.attrs.to === '1234@s.whatsapp.net' && Buffer.from(decoded.content[0].content).toString() === 'hello', 'WABinary encode/decode roundtrip');

// 2) proto roundtrip incl AlbumMessage & StickerPackMessage (ourin protos)
const msg = proto.Message.fromObject({ albumMessage: { expectedImageCount: 2 } });
const bytes = proto.Message.encode(msg).finish();
const dec = proto.Message.decode(bytes);
ok(!!dec.albumMessage && dec.albumMessage.expectedImageCount === 2, 'proto AlbumMessage roundtrip');
const sp = proto.Message.fromObject({ stickerPackMessage: { name: 'test' } });
const spDec = proto.Message.decode(proto.Message.encode(sp).finish());
ok(!!spDec.stickerPackMessage?.name, 'proto StickerPackMessage roundtrip (ourin WAProto)');

// 3) encryptedStream with mediaKey reuse (merged feature)
import { createReadStream } from 'fs';
import { once } from 'events';
const key = Buffer.alloc(32, 7);
const r1 = await encryptedStream(Buffer.from('test-media-data-123'), 'image', { saveOriginalFileIfRequired: false });
const r2 = await encryptedStream(Buffer.from('test-media-data-123'), 'image', { mediaKey: key });
ok(r1.mediaKey?.length === 32 && r2.mediaKey && Buffer.compare(r2.mediaKey, key) === 0, 'encryptedStream returns & reuses provided mediaKey (ourin x rc14 merge)');
ok(typeof r1.encFilePath === 'string', 'encryptedStream new API (rc14 encFilePath)');
const { unlink } = await import('fs/promises');
await unlink(r1.encFilePath).catch(()=>{}); await unlink(r2.encFilePath).catch(()=>{});

// 4) viewOnceMessageV3 normalization (ourin anti-crash port)
const content = normalizeMessageContent({ viewOnceMessageV3: { message: { imageMessage: { caption: 'x' } } } });
ok(content?.imageMessage?.caption === 'x', 'normalizeMessageContent unwraps viewOnceMessageV3 (ourin port)');

// 5) rich messages (ourin)
const table = generateTableContent('Title', ['A','B'], [['1','2']], undefined, {});
ok(!!table?.message?.listMessage || !!table?.message, 'generateTableContent (ourin rich-messages)');
const list = generateListContent('T', [{ title: 'x', rows: [{ title: 'r', id: '1' }] }], undefined, {});
ok(!!list?.message, 'generateListContent (ourin rich-messages)');

// 6) getButtonType + native flow map (ourin interactive fix)
ok(NATIVE_FLOW_BUTTON_MAP.review_and_pay === 'order_details', 'NATIVE_FLOW_BUTTON_MAP present');
const bt = getButtonType({ interactiveMessage: { nativeFlowMessage: { buttons: [{ name: 'review_and_pay' }] } } });
ok(bt === 'order_details', 'getButtonType maps native flow buttons');

// 7) album content type (rc14 album + upstream)
const ct = getContentType({ albumMessage: {} });
ok(ct === 'albumMessage', 'getContentType albumMessage (rc14)');


// 8) [itsliaaa port] interactive & rich content branches
const genOpts = { logger: { trace(){},debug(){},info(){},warn(){},error(){},fatal(){},child(){ return this; } } };
const b = await generateWAMessageContent({ buttons: [{ id: '1', text: 'Hi' }, { copy: 'abc', text: 'Copy' }], text: 'pilih', footer: 'f' }, genOpts);
ok(b.buttonsMessage?.buttons?.length === 2, 'buttons message (itsliaaa port)');
const tb = await generateWAMessageContent({ templateButtons: [{ url: 'https://a.com', text: 'Go' }, { call: '+6281', text: 'Call' }], text: 't' }, genOpts);
ok(tb.templateMessage?.hydratedTemplate?.hydratedButtons?.length === 2, 'templateButtons (itsliaaa port)');
const nf = await generateWAMessageContent({ nativeFlow: [{ id: 'a', text: 'QR' }, { url: 'https://g.com', text: 'Open' }], text: 'nf' }, genOpts);
ok(nf.interactiveMessage?.nativeFlowMessage?.buttons?.length === 2, 'nativeFlow interactive (itsliaaa port)');
const ss = await generateWAMessageContent({ buttons: [{ id: 'q', text: 'Pick', sections: [{ title: 'S', rows: [{ title: 'R', rowId: '1' }] }] }], text: 'x' }, genOpts);
ok(ss.buttonsMessage?.buttons?.[0]?.nativeFlowInfo?.name === 'single_select', 'single_select shortcut (itsliaaa port)');
const raw = await generateWAMessageContent({ raw: true, conversation: 'raw body' }, genOpts);
ok(raw.conversation === 'raw body', 'raw passthrough (itsliaaa port)');
const kp = await generateWAMessageContent({ keep: { id: 'X', remoteJid: 'a@s.whatsapp.net' }, type: 1 }, genOpts);
ok(!!kp.keepInChatMessage, 'keepInChat (itsliaaa port)');
const fr = await generateWAMessageContent({ flowReply: { text: 'ok', name: 'flow' } }, genOpts);
ok(!!fr.interactiveResponseMessage?.nativeFlowResponseMessage, 'flowReply (itsliaaa port)');
const pr = await generateWAMessageContent({ pollResult: { name: 'n', votes: [{ name: 'a', voteCount: '3' }] } }, genOpts);
ok(!!pr.pollResultSnapshotMessage, 'pollResult snapshot (itsliaaa port)');
const pi = await generateWAMessageContent({ paymentInviteServiceType: 2 }, genOpts);
ok(!!pi.paymentInviteMessage, 'paymentInvite (itsliaaa port)');
const vo2 = await generateWAMessageContent({ text: 'x', viewOnceV2: true }, genOpts);
ok(!!vo2.viewOnceMessageV2, 'viewOnceV2 wrap (itsliaaa port)');
const voe = await generateWAMessageContent({ text: 'x', viewOnceV2Extension: true }, genOpts);
ok(!!voe.viewOnceMessageV2Extension, 'viewOnceV2Extension wrap (itsliaaa port)');
const spMsg = await generateWAMessageContent({ text: 'x', spoiler: true }, genOpts);
ok(!!spMsg.spoilerMessage, 'spoiler wrap (itsliaaa port)');
const gs = await generateWAMessageContent({ text: 'x', groupStatus: true }, genOpts);
ok(!!gs.groupStatusMessageV2, 'groupStatus wrap (itsliaaa port)');
const eph = await generateWAMessageContent({ text: 'x', ephemeral: true }, genOpts);
ok(!!eph.ephemeralMessage, 'ephemeral wrap (itsliaaa port)');
const lot = await generateWAMessageContent({ text: 'x', isLottie: true }, genOpts);
ok(!!lot.lottieStickerMessage, 'lottie wrap (itsliaaa port)');
const ex = await generateWAMessageContent({ text: 't', externalAdReply: { title: 'Ad', body: 'b', thumbnail: Buffer.from('i'), url: 'https://x.com' } }, genOpts);
ok(!!ex.extendedTextMessage?.contextInfo?.externalAdReply, 'externalAdReply direct (itsliaaa port)');
try {
    await generateWAMessageContent({ stickers: [] }, genOpts);
    ok(false, 'stickers guard should throw');
}
catch (e) {
    ok(e?.output?.statusCode === 400, 'sticker pack guards (itsliaaa port)');
}

// 9) [itsliaaa port] AI rich response (code/table) — incl. bugfix regression
const codeNoLang = await generateWAMessageContent({ code: 'const x=1;' }, genOpts); // upstream crashes here (const reassign)
const rich1 = codeNoLang.botForwardedMessage?.message?.richResponseMessage;
ok(!!rich1?.submessages?.length, 'rich code message without language (bugfix vs itsliaaa)');
ok(!!rich1?.unifiedResponse?.data?.length, 'rich unifiedResponse payload present');
ok(!!codeNoLang.messageContextInfo?.botMetadata, 'rich botMetadata at message level');
const tbl = await generateWAMessageContent({ title: 'T', table: [['A','B'],['1','2']] }, genOpts);
ok(tbl.botForwardedMessage?.message?.richResponseMessage?.submessages?.[0]?.tableMetadata?.rows?.length === 2, 'rich table message');

// 10) newsletter media path map
ok(NEWSLETTER_MEDIA_PATH_MAP.image === '/newsletter/newsletter-image', 'NEWSLETTER_MEDIA_PATH_MAP (/m1/ path fix)');

// 11) future-proof wrappers union
const inner2 = normalizeMessageContent({ spoilerMessage: { message: { conversation: 's' } } });
ok(inner2?.conversation === 's', 'normalizeMessageContent unwraps spoilerMessage');
const inner3 = normalizeMessageContent({ lottieStickerMessage: { message: { conversation: 'l' } } });
ok(inner3?.conversation === 'l', 'normalizeMessageContent unwraps lottieStickerMessage');
const inner4 = normalizeMessageContent({ groupStatusMessageV2: { message: { conversation: 'g' } } });
ok(inner4?.conversation === 'g', 'normalizeMessageContent unwraps groupStatusMessageV2');
const inner5 = normalizeMessageContent({ botForwardedMessage: { message: { richResponseMessage: {} } } });
ok(!!inner5?.richResponseMessage, 'normalizeMessageContent unwraps botForwardedMessage');

console.log(fails ? `\n${fails} FAILURES` : '\nALL UNIT TESTS PASSED');
process.exit(fails ? 1 : 0);
