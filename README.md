# AHSANS-BAILEYS

**TypeScript/JavaScript WhatsApp Web API library** — build bot WhatsApp yang stabil untuk jalan **24/7 di Pterodactyl / container**, di atas **Node.js 24** (ESM-only).

AHSANS-BAILEYS adalah *hardened fork* dari merge 3 arah:

| Basis | Versi | Kontribusi |
|---|---|---|
| [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) | `7.0.0-rc14` | connection engine, Noise/Signal, media upload backpressure, tctoken/privacy tokens, account reachout & message capping, companion registration, USync username protocol |
| [ourin-baileys](https://www.npmjs.com/package/ourin-baileys) | `9.0.21` | interactive/native-flow messages, AI rich response (ORich/AIRich), album, sticker pack, newsletter/channel + auto-follow (opt-in), status mention, Dugong helper, VoIP voice-call engine |
| AHSANS patches | `1.2.0` | hardening keamanan & stabilitas (lihat [Perubahan penting](#-perubahan-penting-vs-versi-lama)), Node 24 baseline, reconnect manager, auth-state atomik |

> ⚠️ **Disclaimer**: proyek ini tidak berafiliasi dengan WhatsApp/Meta. Menggunakan API tidak resmi dapat melanggar ToS WhatsApp — gunakan dengan risiko sendiri.

---

## Persyaratan

| | |
|---|---|
| **Node.js** | **>= 24.0.0** (wajib — dicek `engine-requirements.js` + `engines` di package.json) |
| Runtime | Linux / container (Pterodactyl, Docker, dsb.) |
| Modul | **ESM only** (`"type": "module"`) |
| Native deps | `whatsapp-rust-bridge` & `libsignal` (prebuilt binary, tanpa compile) |

Tidak ada dependency pada systemd, PM2, sudo, root host, atau Docker host. Semua berjalan di dalam proses Node.js Anda.

## Instalasi

```bash
# dari GitHub
npm install github:ahsansdr11-spec/AHSANS-BAILEYS

# atau clone manual
git clone https://github.com/ahsansdr11-spec/AHSANS-BAILEYS.git
cd AHSANS-BAILEYS && npm install
```

### Dependency opsional

| Paket | Dipakai untuk | Efek bila tidak ada |
|---|---|---|
| `sharp` | resize/gambar, konversi WebP sticker pack, thumbnail | fitur gambar/sticker menolak dengan error jelas; teks & tombol tetap jalan |
| `jimp` | alternatif `sharp` untuk gambar | — |
| `audio-decode` | waveform audio (PTT) | waveform dilewati, audio tetap terkirim |
| `fluent-ffmpeg` | preview video (builder) | preview dilewati; butuh biner `ffmpeg` di PATH |
| `link-preview-js` | preview link otomatis | preview dilewati |
| `@roamhq/wrtc` | **VoIP / panggilan suara** | fitur VoIP menolak dengan error jelas; sisanya normal |

Semua opsional dideklarasikan lewat `peerDependenciesMeta.optional` — `npm install` **tidak akan gagal** jika tidak dipasang, dan library tidak mencetak warning saat import.

## Deploy di Pterodactyl

1. Buat server dengan **Egg Generic Node.js** (atau egg kustom), Node **24.x**.
2. Upload bot Anda + `node_modules` (atau jalankan `npm install --omit=dev` di Startup/Install).
3. **Startup Command**: cukup `node index.js` (sesuaikan entrypoint Anda). **Tidak butuh PM2** — container Pterodactyl adalah supervisor-nya: Stop/Restart mengirim SIGTERM, proses mati, panel me-restart bila diatur demikian.
4. Variable environment yang disarankan:
   - `AUTH_DIR` — folder auth state (default `./auth`) → arahkan ke path yang **persisten** antar-rebuild container, mis. `/home/container/auth`.
   - `NODE_ENV=production`.

Contoh pola `index.js` siap Pterodactyl (versi lengkap: [`example/basic.js`](example/basic.js)):

```js
import makeWASocket, { useMultiFileAuthState, DisconnectReason, createReconnectManager } from 'ahsans-baileys';
import { Boom } from '@hapi/boom';

const { state, saveCreds } = await useMultiFileAuthState(process.env.AUTH_DIR || './auth');

const conn = createReconnectManager({
  makeSocket: cfg => makeWASocket(cfg),
  config: { auth: state, browser: ['AHSANS', 'Chrome', '24.0.0'] },
  logger: console,
  onSocket: (sock) => {
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async ({ messages }) => {
      // logika bot Anda di sini — rebind otomatis di setiap reconnect
    });
  },
  onGiveUp: ({ reason }) => console.error('stop reconnect:', reason),
});

await conn.start();

// ── Graceful shutdown (Pterodactyl Stop/Restart → SIGTERM) ──
let exiting = false;
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => {
  if (exiting) return; exiting = true;
  conn.stop(sig);              // 1. hentikan reconnect (tidak ada reconnect paksa saat shutdown)
  await saveCreds();           // 2. flush sesi ke disk
  await conn.socket?.end?.(new Boom('shutdown', { statusCode: DisconnectReason.connectionClosed }));
  setTimeout(() => process.exit(0), 500).unref();
});
```

Yang dijamin pada saat Stop/Restart/Kill:

- ✅ SIGTERM/SIGINT diterima → reconnect **dihentikan**, bukan dipaksa reconnect
- ✅ auth state ditulis **atomik** (temp file + rename) → tidak pernah korup walau container di-kill di tengah tulis
- ✅ WebSocket ditutup dengan fallback `terminate()` 3 detik → tidak ada hang saat container mati
- ✅ semua timer/interval/cache dihapus di `socket.end()` → proses bisa exit, panel tidak perlu Kill paksa

## Autentikasi (auth state)

Dua penyedia bawaan, keduanya **crash-safe** (tulis atomik `tmp → rename`, tahan kill di tengah tulisan):

```js
// 1) Multi-file (direkomendasikan untuk produksi)
import { useMultiFileAuthState } from 'ahsans-baileys';
const { state, saveCreds } = await useMultiFileAuthState('./auth');

// 2) Single-file + LRU cache + mutex (port @itsliaaa)
import { useSingleFileAuthState } from 'ahsans-baileys';
const { state, saveCreds, flush, close } = await useSingleFileAuthState('./auth.json', { logger });
// flush()  — paksa tulis ke disk SEKARANG (panggil saat SIGTERM)
// close()  — flush + matikan timer debounce (state tak boleh dipakai lagi)
```

- Tulisan concurrent ke key yang sama di-serialisasi mutex → tidak ada file setengah jadi.
- File korup (sisa crash lama) → otomatis mulai sesi baru, **tidak crash**.
- Login pertama: dengarkan `connection.update` → `qr`, atau pakai `sock.requestPairingCode(nomor)` untuk pairing code.

## Reconnect (untuk bot 24/7)

Baileys **tidak** auto-reconnect. Gunakan `createReconnectManager` (additive API, tidak mengubah perilaku `makeWASocket`):

- **Backoff eksponensial** + full jitter: 1s → 2s → 4s → … dibatasi `maxDelayMs` (default 60s) → tidak ada reconnect storm saat node Pterodactyl reboot massal.
- **Single-flight** — tidak pernah membuat dua socket sekaligus; tidak ada listener menumpuk.
- **Fatal-auth aware** — `loggedOut (401)`, `forbidden (403)`, `multideviceMismatch (411)`, `connectionReplaced (440)` **tidak** di-retry (mencegah ban & hammering). Ubah lewat opsi `shouldReconnect`.
- **Shutdown-aware** — `stop()` membatalkan reconnect yang tertunda; opsi `shutdownSignals: ['SIGTERM','SIGINT']` memasang handler otomatis.

```js
const conn = createReconnectManager({
  makeSocket: cfg => makeWASocket(cfg),
  config: {...},
  maxAttempts: 10,          // default: tanpa batas
  initialDelayMs: 1000, maxDelayMs: 60000, factor: 2, jitter: true,
  onSocket(sock){ ... },    // (re)bind listener Anda di sini
  onGiveUp({ error, attempt, reason }){ ... },
});
```

## Kirim pesan

```js
await sock.sendMessage(jid, { text: 'Halo!' });

// gambar/video/dokumen/stream (streaming + backpressure, file di tmp lalu dihapus)
await sock.sendMessage(jid, { image: { url: './foto.jpg' }, caption: 'capt' });

// tombol interaktif & native flow
await sock.sendMessage(jid, {
  text: 'Pilih:',
  buttons: [{ id: 'a', text: 'A' }, { url: 'https://x.com', text: 'Buka' }, { copy: 'KODE', text: 'Copy' }],
});

// AI rich response
import { ORich } from 'ahsans-baileys';
await new ORich(sock).addText('halo').addSuggest(['A', 'B']).send(jid);

// tabel/list/kode/latex
await sock.sendTable(jid, 'Judul', ['H1','H2'], [['a','b']]);
await sock.sendCodeBlockV2(jid, 'console.log(1)');
```

Daftar lengkap content type (`stickers`, `album`, `poll`, `keep`, `flowReply`, `pollResult`, dll.) lihat `lib/Types/Message.d.ts` dan `example/basic.js`.

## Sticker pack

```js
await sock.sendMessage(jid, {
  stickerPack: {
    name: 'Pack', publisher: 'Saya',
    stickers: [{ data: { url: './s1.png' }, emojis: ['😀'] }], // ≤ 60, ≤ 1MB/stiker
    cover: { url: './cover.png' },
  },
}); // butuh `sharp` (atau @napi-rs/image); zip + tray + thumbnail otomatis, file tmp dibersihkan
```

Validasi input diperkuat: entri tidak valid → Boom 400 dengan pesan jelas, bukan TypeError.

## Newsletter / Channel

```js
await sock.newsletterFollow('1234@newsletter');
await sock.newsletterUnfollow('1234@newsletter');
await sock.newsletterCreate('Nama', 'Deskripsi');
const meta = await sock.cekIDSaluran('https://whatsapp.com/channel/xxxx');
await sock.newsletterMultipleFollow(['1@newsletter', '2@newsletter']); // terima array ATAU string
```

Upload media newsletter memakai path `/newsletter/*` + `server_thumb_gen=1` (fix merge itsliaaa).

**Auto-follow newsletter kini OPT-IN** (sebelumnya ON secara default — behavior mengikuti channel hardcoded tidak layak jadi default library):

```js
makeWASocket({ autoFollowNewsletterOnConnect: true, autoFollowNewsletterJid: '1234@newsletter' });
```

## VoIP / Panggilan suara (opsional)

```bash
npm i @roamhq/wrtc
```

```js
import { VoipClient } from 'ahsans-baileys';
const voip = new VoipClient();
await voip.connectWithSocket(sock);
const call = await voip.call('6281234567890', { durationMs: 60000 });
call.on('connected', () => call.mute(false));
call.on('audio', pcm => {});       // 16kHz mono f32
call.on('ended', reason => {});
// saat shutdown:
voip.disconnect();                  // tutup call, feeder ffmpeg, koneksi relay, & listener
```

Tanpa `@roamhq/wrtc`, koneksi gagal **tertangani rapi** (tidak crash process), dan `VoipClient.call()` menolak dengan pesan jelas.

## Troubleshooting

| Gejala | Sebab & solusi |
|---|---|
| `This package requires Node.js 24+` | Node versi lama. Pterodactyl: pilih image Node 24. |
| Langsung `logged out (401)` saat start | Sesi tidak valid/konflik perangkat. Hapus folder auth, scan ulang. |
| `403 / forbidden / banned` | Akun dibatasi WhatsApp. Library **tidak** retry kode ini (by design). Jangan paksa retry. |
| `connectionReplaced (440)` | Ada dua proses pakai sesi yang sama. Jalankan satu bot per auth folder. |
| QR berputar terus / `timedOut` | Server WA tidak terjangkau — cek outbound `wss://web.whatsapp.com` di firewall container. |
| `No image processing library available` | Pasang `sharp`: `npm i sharp`. |
| Memory naik terus | Pastikan memakai `createReconnectManager` (bukan loop `makeWASocket` sendiri tanpa `end()`), dan satu proses satu auth folder. |
| Panel kill server saat Stop | Gunakan pola graceful shutdown di atas; lib sudah membersihkan timer/socket ≤ 3 detik. |

## Migrasi

### Dari `baileys-all-support` ≤ 1.1.0 → `ahsans-baileys` 1.2.0

- **Nama paket** → `ahsans-baileys`. Import runtime tetap `from 'ahsans-baileys'` (atau path relatif `lib/index.js` bila clone).
- **Node.js ≥ 24 wajib** (sebelumnya ≥ 20).
- **`autoFollowNewsletterOnConnect` default `false`** (sebelumnya `true`). Set `true` + `autoFollowNewsletterJid` bila ingin perilaku lama.
- **Nama export yang sebelumnya hilang kini muncul** (bug duplikat `export *`): `tokenizeCode`, `CodeHighlightType`, `RichSubMessageType`. Kode yang men-shadow nama ini perlu disesuaikan.
- **`useSingleFileAuthState`** kini punya `flush()`/`close()` + opsi `{ logger }` (additive).
- **`newsletterMultipleFollow`** menerima array ATAU string (sebelumnya string saja; array dulu crash).
- `sharp`/`fluent-ffmpeg` dimuat **lazy** — tidak ada warning console saat import.

### Dari WhiskeySockets/Baileys rc

API inti (`makeWASocket`, `useMultiFileAuthState`, event `connection.update`/`messages.upsert`/`creds.update`, proto) kompatibel. Fitur ourin (interactive/rich/newsletter/sticker-pack/VoIP) tersedia di socket yang sama. Lihat [`MERGE_NOTES.md`](MERGE_NOTES.md) untuk catatan merge detail.

## Kompatibilitas

- ✅ Node.js **24.x** (target resmi, diuji di 24.19)
- ✅ Linux container: Pterodactyl, Docker, systemd-less
- ❌ Node < 24 (ditolak `engine-requirements.js`)
- ❌ CommonJS `require()` — ESM only (`import()` dinamis tetap bisa dari CJS)

## Known limitations

- VoIP membutuhkan `ffmpeg` di PATH bila `audioSource` bukan `silence`.
- `downloadEncryptedContent` memakai `fetch` global; proxy harus lewat `dispatcher`/`agent` config.
- Sticker pack dibatasi 60 stiker & 1 MB/stiker (batas WhatsApp).
- `useSingleFileAuthState` menyimpan seluruh key store dalam RAM (LRU 20.000 entri) — untuk akun dengan history sync besar, gunakan `useMultiFileAuthState` atau auth state DB Anda sendiri (implement interface `{ creds, keys }`).

## Development

```bash
npm install
npm test            # node --test test/  (core, auth-state, lifecycle, stress)
npm run check:types # tsc --noEmit atas lib/index.d.ts
npm run check:engine
```

Regenerasi WAProto typings (jarang perlu, saat `WAProto.proto` berubah):

```bash
cd WAProto
../node_modules/.bin/pbjs -t static-module --no-beautify -w es6 --no-bundle --no-delimited --no-verify --no-comments -o ./index.js ./WAProto.proto
../node_modules/.bin/pbjs -t static-module --no-beautify -w es6 --no-bundle --no-delimited --no-verify ./WAProto.proto | ../node_modules/.bin/pbts --no-comments -o ./index.d.ts -
node ./fix-imports.js
```

## Lisensi

MIT — © WhiskeySockets contributors, ourin-baileys contributors, dan glue merge repositori ini. Lihat [LICENSE](LICENSE).

## Credits

- Upstream: [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) (MIT)
- Modded fork: [ourin-baileys](https://www.npmjs.com/package/ourin-baileys) (MIT, oleh hanya_zann)
- Interactive builder: NIXCODE by Nixel (di `lib/Modded/`)
- Port terpilih: @itsliaaa/baileys, Shiroine, Sairidev (lihat [MERGE_NOTES.md](MERGE_NOTES.md))
