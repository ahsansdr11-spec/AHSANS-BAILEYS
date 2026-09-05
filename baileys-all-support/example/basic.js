// Contoh baileys-all-support (ESM, Node >= 20)
// Jalankan: node example/basic.js
import makeBaileys, {
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  ORich,
} from '../lib/index.js';
import { Boom } from '@hapi/boom';

const { state, saveCreds } = await useMultiFileAuthState('./example/auth');

const sock = makeBaileys({
  auth: state,
  browser: Browsers.macOS('Chrome'),
  logger: { level: 'silent', child() { return this; } },
});

sock.ev.on('creds.update', saveCreds);

sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
  if (qr) console.log('\n⚡ Scan QR ini (tempel ke qrencode terminal atau print):\n', qr);
  if (connection === 'open') {
    console.log('✅ Terhubung sebagai', sock.user?.id);
    demo(sock).catch(console.error);
  }
  if (connection === 'close') {
    const code = lastDisconnect?.error instanceof Boom
      ? lastDisconnect.error.output.statusCode
      : undefined;
    if (code !== DisconnectReason.loggedOut) {
      console.log('Koneksi tertutup, restart manual diperlukan untuk demo ini.');
    } else {
      console.log('Device logged out.');
    }
  }
});

async function demo(sock) {
  const target = '628xxxxxxxxxx@s.whatsapp.net'; // ← ganti nomor tujuan

  // 1) Pesan teks biasa
  await sock.sendMessage(target, { text: 'Halo dari baileys-all-support! 🚀' });

  // 2) ✨ AI Rich Response (ourin)
  const rich = new ORich(sock)
    .addText('Ini **rich response** gabungan WhiskeySockets + ourin.')
    .addSuggest(['Kirim tabel', 'Kirim newsletter info']);
  await rich.send(target);

  // 3) 📊 Tabel (ourin rich messages)
  await sock.sendTable(
    target,
    'Perbandingan',
    ['Paket', 'Fitur'],
    [['baileys rc14', 'fix upstream'], ['ourin', 'fitur mod'], ['all-support', 'keduanya ✅']],
    undefined,
    {},
  );

  // 4) 📋 List (ourin)
  await sock.sendList(
    target,
    'Menu',
    [{ title: 'Aksi', rows: [{ title: 'Cek newsletter', id: 'cek-nl' }] }],
    undefined,
    {},
  );

  // 5) 📢 Newsletter / channel (ourin + endpoint rc14)
  const list = await sock.newsletterFetchAllSubscribe?.();
  console.log('Newsletter yang diikuti:', list);

  // 6) 🖼️ Sticker pack (ourin, butuh `npm i sharp`)
  // await sock.sendMessage(target, {
  //   stickerPack: {
  //     name: 'Pack Demo',
  //     stickers: [{ sticker: { url: './sticker1.webp' } }],
  //     cover: { url: './cover.webp' },
  //   },
  // });

  // 7) 🎙️ VoIP (ourin, butuh peer `npm i @roamhq/wrtc`)
  // import { VoipClient } from 'baileys-all-support';
  // const call = new VoipClient(sock);
  // await call.startCall(target);

  // 8) 📡 Status mention (ourin)
  // await sock.sendStatusWhatsApp?.(…); // via sock.ourin (Dugong)
  // atau:
  // await sock.sendStatusMention({ text: 'Status dengan mention' }, [target]);

  console.log('Demo selesai ✅');
}
