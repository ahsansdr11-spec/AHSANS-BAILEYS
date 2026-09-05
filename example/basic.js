// AHSANS-BAILEYS — contoh bot siap Pterodactyl (ESM, Node.js >= 24)
// Jalankan: node example/basic.js
//
// Pola yang dipakai di sini adalah pola produksi yang direkomendasikan:
//   1. reconnect manager  — backoff eksponensial + jitter, berhenti pada error fatal
//   2. graceful shutdown  — SIGTERM/SIGINT (Pterodactyl Stop/Restart) → flush auth → exit(0)
import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  createReconnectManager,
  ORich,
} from '../lib/index.js';
import { Boom } from '@hapi/boom';

const AUTH_DIR = process.env.AUTH_DIR || './example/auth';

const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

const sockConfig = {
  auth: state,
  browser: Browsers.macOS('Chrome'),
  // logger: pino({ level: 'silent' }), // default logger sudah cukup
};

const conn = createReconnectManager({
  makeSocket: (cfg) => makeWASocket(cfg),
  config: sockConfig,
  logger: console,                 // opsional: log keputusan reconnect
  // backoff default: 1s → 2s → 4s → ... max 60s, dengan full jitter
  // maxAttempts: 10,                // default: tanpa batas
  // shutdownSignals: ['SIGTERM', 'SIGINT'], // <- aktifkan bila ingin otomatis stop saat sinyal
  onSocket: (sock) => {
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) console.log('\n⚡ Scan QR ini (atau pakai pairing code):\n', qr);
      if (connection === 'open') {
        console.log('✅ Terhubung sebagai', sock.user?.id);
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : undefined;
        console.log('Koneksi tertutup, code =', code);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const m = messages[0];
      if (!m.key.fromMe && m.message) {
        // ✨ AI rich response (ourin)
        const rich = new ORich(sock)
          .addText('Halo dari AHSANS-BAILEYS! 🚀')
          .addSuggest(['Apa ini?', 'Fitur lain?']);
        await rich.send(m.key.remoteJid).catch(err => console.error('send gagal:', err.message));
      }
    });

    sock.ev.on('connection.update', async ({ connection }) => {
      if (connection === 'open' && !demoRan) {
        demoRan = true;
        demo(sock).catch(err => console.error('demo gagal:', err));
      }
    });
  },
  onGiveUp: ({ error, attempt, reason }) => {
    console.error(`❌ Menyerah setelah ${attempt} attempt (${reason}). Error:`, error?.message);
  },
});

await conn.start();

// ─── Graceful shutdown (Pterodactyl Stop/Restart mengirim SIGTERM) ───
// 1. stop reconnect manager (tidak ada reconnect paksa saat shutdown)
// 2. flush auth state ke disk
// 3. tutup socket
// 4. exit 0 — container tidak perlu di-kill paksa
let exiting = false;
async function shutdown(signal) {
  if (exiting) return;
  exiting = true;
  console.log(`\n${signal} diterima — shutdown bersih...`);
  conn.stop(`received ${signal}`);
  try {
    await saveCreds();               // pastikan sesi tersimpan
    await conn.socket?.end?.(new Boom('Intentional Shutdown', { statusCode: DisconnectReason.connectionClosed }));
  } catch { /* sudah tertutup */ }
  // beri waktu event loop menyelesaikan write yang tersisa, lalu keluar tegas
  setTimeout(() => process.exit(0), 500).unref();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ─── Demo fitur (jalankan sekali setelah open) ───
async function demo(sock) {
  const target = '628xxxxxxxxxx@s.whatsapp.net'; // ← ganti nomor tujuan

  // 1) Pesan teks biasa
  // await sock.sendMessage(target, { text: 'Halo dari AHSANS-BAILEYS! 🚀' });

  // 2) ✨ AI Rich Response (ourin)
  // const rich = new ORich(sock)
  //   .addText('Ini **rich response**.')
  //   .addSuggest(['Kirim tabel', 'Kirim newsletter info']);
  // await rich.send(target);

  // 3) 📊 Tabel (ourin rich messages)
  // await sock.sendTable(
  //   target,
  //   'Perbandingan',
  //   ['Paket', 'Fitur'],
  //   [['rc14', 'fix upstream'], ['ourin', 'fitur mod'], ['all-support', 'keduanya ✅']],
  //   undefined,
  //   {},
  // );

  // 4) 📋 List (ourin)
  // await sock.sendList(
  //   target,
  //   'Menu',
  //   [{ title: 'Aksi', rows: [{ title: 'Cek newsletter', id: 'cek-nl' }] }],
  //   undefined,
  //   {},
  // );

  // 5) 📢 Newsletter / channel (ourin + endpoint rc14)
  // const list = await sock.newsletterFetchAllSubscribe?.();
  // console.log('Newsletter yang diikuti:', list);
  // auto-follow newsletter kini OPT-IN:
  // makeWASocket({ autoFollowNewsletterOnConnect: true, autoFollowNewsletterJid: '1234@newsletter' })

  // 6) 🖼️ Sticker pack (ourin, butuh `npm i sharp`)
  // await sock.sendMessage(target, {
  //   stickerPack: {
  //     name: 'Pack Demo',
  //     stickers: [{ sticker: { url: './sticker1.webp' } }],
  //     cover: { url: './cover.webp' },
  //   },
  // });

  // 7) 🎙️ VoIP (butuh peer `npm i @roamhq/wrtc`)
  // import { VoipClient } from 'ahsans-baileys';
  // const voip = new VoipClient();
  // await voip.connectWithSocket(sock);
  // const call = await voip.call('6281234567890', { durationMs: 60000 });
  // call.on('ended', reason => console.log('call ended:', reason));

  // 8) 🔘 Buttons / nativeFlow / templateButtons (interaktif)
  // await sock.sendMessage(target, {
  //   buttons: [
  //     { id: 'btn1', text: 'Halo' },
  //     { url: 'https://example.com', text: 'Buka Web' },
  //     { copy: 'KODE123', text: 'Copy Kode' },
  //   ],
  //   text: 'Silakan pilih',
  //   footer: 'ahsans-baileys',
  // });

  // 9) 💻 Rich message: kode berwarna & tabel (AI rich response)
  // await sock.sendMessage(target, { code: 'const hi = "world";', language: 'javascript' });
  // await sock.sendMessage(target, { title: 'Laporan', table: [['Nama', 'Skor'], ['A', '90'], ['B', '85']] });

  // 10) 🎁 Sticker pack via `stickers` (itsliaaa port — konversi WebP otomatis)
  // await sock.sendMessage(target, {
  //   stickers: {
  //     name: 'Pack Lucu',
  //     cover: { url: './cover.png' },
  //     stickers: [{ data: { url: './s1.png' }, emojis: ['😂'] }],
  //   },
  // });

  // 11) 📦 Album: satu panggilan, media di-relay otomatis
  // await sock.sendMessage(target, {
  //   album: [{ image: { url: './a.jpg' } }, { video: { url: './c.mp4' } }],
  // });

  console.log('Demo selesai ✅');
}

