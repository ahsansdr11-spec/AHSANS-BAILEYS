# baileys-all-support

**Baileys ALL-SUPPORT** — gabungan mendalam [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) `7.0.0-rc14` × [ourin-baileys](https://www.npmjs.com/package/ourin-baileys) `9.0.21`. Dokumentasi lengkap: [`README.md`](README.md), catatan teknis merge: [`MERGE_NOTES.md`](MERGE_NOTES.md).

## Instalasi

```bash
npm install github:ahsansdr11-spec/ahsans-baileys

# atau kloning manual
git clone https://github.com/ahsansdr11-spec/ahsans-baileys.git
```

> ⚠️ Butuh **Node.js ≥ 20**, ESM-only (`"type": "module"`).

## Fitur

<details>
<summary><b>🔴 Dari WhiskeySockets v7.0.0-rc14 (upstream)</b></summary>

- **Sistem tctoken / privacy token** lengkap
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

- **Interactive / Native-Flow Message**: `NATIVE_FLOW_BUTTON_MAP` + `getButtonType` + injeksi node `<biz>` otomatis
- **AI Rich Response**: kelas `ORich` / `AIRich`, `Button`, `ButtonV2`, `Carousel`, `Toolkit`
- **Rich Messages**: `sendTable`, `sendTableV2`, `sendList`, `sendCodeBlock(V2)`, `sendLink(V2)`, `sendLatex`, `sendRichMessage`, `sendUnifiedResponse`, `captureUnifiedResponse`, `sendPreview`
- **Sticker Pack**: kirim stiker pack lengkap via `{ stickerPack: {...} }` (zip + tray icon + thumbnail, butuh `sharp`)
- **Newsletter/Channel lengkap**: `newsletterCreate`, `newsletterFollow` (join_v2), `newsletterMultipleFollow`, `newsletterAction`, `newsletterFetchAllSubscribe`, `cekIDSaluran`, `newsletterReactMessage`, dll. + **auto-follow newsletter** saat konek (`autoFollowNewsletterOnConnect`)
- **Status Mention**: `sendStatusMention(content, jids)` + `swgc()` (group story) + relay `recipientOverrides` / `specificRecipient` / `specificRecipients`
- **Dugong** — helper kelas (`sock.ourin.sendStatusWhatsApp`, `handleGroupStory`, dll.)
- **VoIP / Voice Call engine** terpasang langsung: `VoipClient`, `ActiveCall`, `CallState` (WebRTC + WASM engine, peer `@roamhq/wrtc`)
- **Anti-crash view once** (`viewOnceMessageV3`, `ptvMessage` di `normalizeMessageContent`)
- **AI Message**: `{ ai: ... }` dengan node `<bot biz_bot=\"1\">` otomatis
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

## Contoh Cepat

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

## Lisensi

MIT — © WhiskeySockets contributors, ourin-baileys contributors, and the merge glue in this repository. See [LICENSE](LICENSE).

## Credits & Disclaimer

- Upstream: [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) (MIT)
- Modded fork: [ourin-baileys](https://www.npmjs.com/package/ourin-baileys) (MIT, by hanya_zann)
- This package is not affiliated with WhatsApp/Meta. Using unofficial APIs may violate WhatsApp's ToS — use at your own risk.