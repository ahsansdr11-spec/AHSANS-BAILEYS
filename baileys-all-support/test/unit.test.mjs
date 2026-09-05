import { jidNormalizedUser } from '../lib/WABinary/index.js';
import * as binary from '../lib/WABinary/index.js';
import { proto } from '../WAProto/index.js';
import { encryptedStream } from '../lib/Utils/messages-media.js';
import { getContentType, normalizeMessageContent } from '../lib/Utils/messages.js';
import { generateTableContent, generateListContent } from '../lib/Utils/rich-messages.js';
import { getButtonType, NATIVE_FLOW_BUTTON_MAP } from '../lib/Socket/messages-send.js';

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

console.log(fails ? `\n${fails} FAILURES` : '\nALL UNIT TESTS PASSED');
process.exit(fails ? 1 : 0);
