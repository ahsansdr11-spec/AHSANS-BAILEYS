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

  // ════════════════════════════════════════════════════════════
  // v1.1.0 — port Sairidev/@itsliaaa (19 content type baru)
  // ════════════════════════════════════════════════════════════

  // 9) 🔘 Buttons + templateButtons + nativeFlow (interaktif)
  // await sock.sendMessage(target, {
  //   buttons: [
  //     { id: 'btn1', text: 'Halo' },                            // quick reply
  //     { url: 'https://example.com', text: 'Buka Web' },        // cta_url
  //     { copy: 'KODE123', text: 'Copy Kode' },                  // cta_copy
  //     { call: '+628123456789', text: 'Telepon' },              // cta_call
  //     { text: 'Pilih Menu', sections: [{ title: 'Menu', rows: [{ title: 'A', rowId: 'a' }] }] }, // single_select
  //   ],
  //   text: 'Silakan pilih',
  //   footer: 'baileys-all-support',
  // });

  // 10) 💻 Rich message: kode berwarna & tabel (AI rich response)
  // await sock.sendMessage(target, { code: 'const hi = "world";', language: 'javascript' });
  // await sock.sendMessage(target, { title: 'Laporan', table: [['Nama', 'Skor'], ['A', '90'], ['B', '85']] });
  // await sock.sendMessage(target, { links: [{ url: 'https://a.com', text: 'Tautan A' }] });

  // 11) 🃏 Carousel cards (header bisa product/image/video)
  // await sock.sendMessage(target, {
  //   text: 'Pilihan hari ini',
  //   cards: [{
  //     businessOwnerJid: '62812xxx@s.whatsapp.net',
  //     product: { productImage: { url: './produk.jpg' }, title: 'Produk A' },
  //     caption: 'Diskon 20%',
  //     footer: 'Rp99.000',
  //     nativeFlow: [{ id: 'buy1', text: 'Beli' }],
  //   }],
  // });

  // 12) 🎁 Sticker pack (itsliaaa port — konversi WebP otomatis)
  // await sock.sendMessage(target, {
  //   stickers: {
  //     name: 'Pack Lucu',
  //     cover: { url: './cover.png' },
  //     stickers: [{ data: { url: './s1.png' }, emojis: ['😂'] }, { data: { url: './s2.png' } }],
  //   },
  // });

  // 13) 🧰 Wraps & utilitas baru
  // await sock.sendMessage(target, { text: 'sekali lihat', viewOnceV2: true });
  // await sock.sendMessage(target, { text: 'spoiler!', spoiler: true });
  // await sock.sendMessage(target, { text: 'status grup', groupStatus: true });
  // await sock.sendMessage(target, { text: 'pesan AI', ai: true });          // private chat saja
  // await sock.sendMessage(target, { keep: msg.key, type: 1 });              // keep in chat
  // await sock.sendMessage(target, { poll: { name: 'Kuis', values: ['a','b'], pollType: 1, correctAnswer: 'a' } }); // quiz

  // 14) 📦 Album: satu panggilan, media di-relay otomatis
  // await sock.sendMessage(target, {
  //   album: [{ image: { url: './a.jpg' } }, { image: { url: './b.jpg' } }, { video: { url: './c.mp4' } }],
  // });

  // 15) 📣 Status mentions: kirim status + mention banyak jid/grup sekaligus
  // await sock.sendMessage([target, '62812-group@g.us'], { text: 'Halo semua!' });

  // 16) 🔐 Auth state 1 file (LRU cache + anti race)
  // import { useSingleFileAuthState } from 'baileys-all-support';
  // const { state, saveCreds } = await useSingleFileAuthState('./auth.json');
  // const sock = makeWASocket({ auth: state }); sock.ev.on('creds.update', saveCreds);

  console.log('Demo selesai ✅');
}
