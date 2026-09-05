<div align="center">

# 🟢 baileys-all-support

**Baileys "ALL SUPPORT" — gabungan resmi [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) `v7.0.0-rc14` × [ourin-baileys](https://www.npmjs.com/package/ourin-baileys) `v9.0.21`**

*The "all-support" Baileys build — a deep, file-by-file 3-way merge of upstream WhiskeySockets Baileys and the ourin-baileys modded fork. Every upstream fix. Every ourin feature. One package.*

[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![ESM](https://img.shields.io/badge/ESM-only-F7DF1E?logo=javascript&logoColor=black)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

## 📖 Indonesian / Bahasa Indonesia

### Apa ini?

`baileys-all-support` adalah hasil **penggabungan (merge) mendalam** dua fork Baileys:

| Induk | Versi | Kontribusi |
|---|---|---|
| **WhiskeySockets/Baileys** (npm `baileys`) | `7.0.0-rc14` | Semua perbaikan upstream terbaru (rc10 → rc14) |
| **ourin-baileys** | `9.0.21` | Fitur mod: interactive message, AI rich response, album, sticker pack, newsletter, VoIP, status mention |

Merge dilakukan dengan **3-way merge berbasis git** (base = `baileys@7.0.0-rc.9`, yang merupakan basis ourin), lalu diselesaikan **manual file-per-file**, dan akhirnya **diverifikasi otomatis**:

- ✅ `node --check` lulus untuk **seluruh** file JS
- ✅ `tsc --noEmit` lulus untuk seluruh graph `.d.ts`
- ✅ Unit test lulus: WABinary roundtrip, protobuf roundtrip (AlbumMessage, StickerPackMessage), `encryptedStream` reuse `mediaKey`, `viewOnceMessageV3`, rich messages, native-flow button map, `getButtonType`
- ✅ Smoke test: `makeWASocket()` sukses dibuat, semua method socket tersedia, noise handler & signal repository bekerja
- ℹ️ Uji QR kode ke `web.whatsapp.com` tidak dapat dijalankan di sandbox (jaringan diblokir) — silakan uji di mesin Anda

### Fitur "All Support"

<details>
<summary><b>🔴 Dari WhiskeySockets v7.0.0-rc14 (upstream)</b></summary>

- **Sistem tctoken / privacy token** lengkap (issue, store, expiry, index LID-aware) — `buildTcTokenFromJid`, `readTcTokenIndex`, `storeTcTokensFromIqResult`
- **Upload media dengan backpressure** (`encFilePath` write-stream, kurangi tekanan memori) + `DEF_MEDIA_HOST` per-socket host
- **Account reachout timelock** (`fetchAccountReachoutTimelock`) & **new chat message capping** (`fetchNewChatMessageCap`)
- **Companion registration utils** (`companion-reg-client-utils`, `buildPairingQRData`, `getCompanionPlatformId`)
- **USync username protocol** (`USyncUsernameProtocol`)
- `Types/Mex` (XWAPaths/QueryIds terpusat, termasuk `xwa2_newsletter_join_v2`/`leave_v2`)
- Refactor `uploadPreKeys` (concurrency guard + retry backoff ala WAWeb)
- SKDM retry pada pengiriman ulang pesan gagal
- `decodeBinaryNode` async + dekompresi otomatis
- `lidMapping.close()`, `registerSocketEndHandler`, perbaikan `chats.js` (blocked-collections resync, profile-pic tctoken gating)
- Perbaikan view-once & ptv, `mediaHandle`, LID addressing, dan puluhan fix lainnya
</details>

<details>
<summary><b>🟢 Dari ourin-baileys v9.0.21</b></summary>

- **Interactive / Native-Flow Message**: `NATIVE_FLOW_BUTTON_MAP` + `getButtonType` + injeksi node `<biz>` otomatis (fix pesan interaktif tertolak)
- **AI Rich Response**: kelas `ORich` / `AIRich`, `Button`, `ButtonV2`, `Carousel`, `Toolkit` (`lib/Modded/message_builder.js`)
- **Rich Messages**: `sendTable`, `sendTableV2`, `sendList`, `sendCodeBlock(V2)`, `sendLink(V2)`, `sendLatex(Image/InlineImage)`, `sendRichMessage`, `sendUnifiedResponse`, `captureUnifiedResponse`, `sendPreview`
- **Sticker Pack**: kirim stiker pack lengkap via `{ stickerPack: {...} }` (zip + tray icon + thumbnail, butuh `sharp`)
- **Newsletter/Channel lengkap**: `newsletterCreate`, `newsletterFollow` (join_v2), `newsletterMultipleFollow`, `newsletterAction`, `newsletterFetchAllSubscribe`, `cekIDSaluran`, `newsletterReactMessage`, dll. + **auto-follow newsletter** saat konek (`autoFollowNewsletterOnConnect`)
- **Status Mention**: `sendStatusMention(content, jids)` + `swgc()` (group story) + relay `recipientOverrides` / `specificRecipient` / `specificRecipients`
- **Dugong** — helper kelas (`sock.ourin.sendStatusWhatsApp`, `handleGroupStory`, dll.)
- **VoIP / Voice Call engine** terpasang langsung: `VoipClient`, `ActiveCall`, `CallState` (WebRTC + WASM engine, peer `@roamhq/wrtc`)
- **Anti-crash view once** (`viewOnceMessageV3`, `ptvMessage` di `normalizeMessageContent`)
- **AI Message**: `{ ai: ... }` dengan node `<bot biz_bot="1">` otomatis
- **getPrivacyTokens** (kompatibilitas API ourin)
- **WAProto bundle lebih baru**: 217 namespace (vs 202 di rc14) — termasuk `AlbumMessage`, `StickerPackMessage`, `AIMediaCollection*`, `Bot*Metadata`, `GroupRootKeyShare`, `InlineContact`, `ScheduledMessageMetadata`…
- Alias `updateBusinessProfile` (plus typo asli `updateBussinesProfile`)
</details>

<details>
<summary><b>🔧 Perbaikan spesifik hasil merge</b></summary>

- `Types/Newsletter.js` (runtime ourin) digabung ke `Types/Mex.js` — **tanpa duplikasi enum** `XWAPaths`/`QueryIds`; tipe ourin (`NewsletterMetadata`, dll.) tetap tersedia di `Types/Newsletter.d.ts`
- `encryptedStream` rc14 + ekstensi ourin: menerima `mediaKey` reusable & mengembalikannya (dipakai sticker-pack thumbnail)
- `newsletterFollow`/`Unfollow` memakai endpoint baru `join_v2`/`leave_v2` (upstream) di semua jalur, termasuk `newsletterMultipleFollow`
- `relayMessage` rc14 + fitur ourin: status override, `forceDistribute` sender-key untuk status, biz-node injection
- `sendMessage`: edit/delete kode untuk newsletter (`edit: 8/3`) + dukungan AI message
</details>

### Instalasi

```bash
# dari folder ini (monorepo)
npm install ./baileys-all-support

# atau opsional (peer):
npm install sharp jimp link-preview-js audio-decode
```

> ⚠️ Butuh **Node.js ≥ 20**, ESM-only (`"type": "module"`).

### Contoh Cepat

```js
import makeBaileys, {
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  ORich,              // ✨ AI rich response (ourin)
} from 'baileys-all-support';

const { state, saveCreds } = await useMultiFileAuthState('./auth');
const sock = makeBaileys({
  auth: state,
  browser: Browsers.macOS('Chrome'),
  // autoFollowNewsletterOnConnect: true, // ✨ ourin
});

sock.ev.on('creds.update', saveCreds);
sock.ev.on('connection.update', ({ qr }) => qr && console.log('Scan QR:', qr));
sock.ev.on('messages.upsert', async ({ messages }) => {
  const m = messages[0];
  if (!m.key.fromMe && m.message) {
    // ✨ AI rich response ala ourin
    const rich = new ORich(sock)
      .addText('Halo dari baileys-all-support! 🚀')
      .addSuggest(['Apa ini?', 'Fitur lain?']);
    await rich.send(m.key.remoteJid);
  }
});
```

Contoh lainnya (newsletter, sticker pack, tabel, status mention, VoIP): lihat [`example/basic.js`](example/basic.js).

---

## 📖 English

### What is this?

A distribution package created by a **deep 3-way git merge**:

```
        baileys@7.0.0-rc.9 (base, ourin's parent)
              /                    \
   ourin-baileys@9.0.21      baileys@7.0.0-rc14
   (modded features)          (upstream fixes)
              \                    /
           baileys-all-support 1.0.0   ← you are here
```

Both parents are MIT-licensed descendants of the same codebase — upstream contributed all `rc10..rc14` fixes (tctoken privacy-token system, media upload backpressure, reachout timelock, message capping, companion registration, USync username, Mex types…), ourin contributed interactive/native-flow messages, ORich/AIRich AI responses, rich messages, sticker packs, full newsletter support, status mentions, Dugong, and the built-in VoIP engine with a **newer WAProto bundle (217 namespaces)**.

See the Indonesian section above for the full feature matrix, merge notes and verification steps — or [`MERGE_NOTES.md`](MERGE_NOTES.md) for the file-by-file breakdown.

### License

MIT — © WhiskeySockets contributors, ourin-baileys contributors, and the merge glue in this repository. See [LICENSE](LICENSE).

### Credits & Disclaimer

- Upstream: [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) (MIT)
- Modded fork: [ourin-baileys](https://www.npmjs.com/package/ourin-baileys) (MIT, by hanya_zann)
- This package is not affiliated with WhatsApp/Meta. Using unofficial APIs may violate WhatsApp's ToS — use at your own risk.
