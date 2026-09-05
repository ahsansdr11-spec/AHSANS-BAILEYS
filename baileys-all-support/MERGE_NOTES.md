# Merge Notes — baileys-all-support 1.1.0

Dokumen teknis penggabungan **WhiskeySockets/Baileys `7.0.0-rc14`** × **ourin-baileys `9.0.21`**.

## Metodologi

1. **Riset mendalam**
   - `ourin-baileys` teridentifikasi sebagai *modded build* WhiskeySockets v7 (npm: "Modded Baileys v7 with interactive message, album, newsletter, and VoIP support", distribusi compiled ESM oleh `hanya_zann`).
   - Fingerprint file (sha256 `libsignal.js`, `USyncContactProtocol.js`, `Socket/Client/index.js`, ada/tidaknya `companion-reg-client-utils.js`) menunjukkan basis ourin = **komit post-`7.0.0-rc.9`, pra-`rc10`**.
   - WAProto ourin (proto WhatsApp `2.3000.1038158069`, 217 namespace) lebih baru daripada rc14 (`2.3000.1029496320`, 202 namespace) → **WAProto diambil dari ourin**.
2. **3-way merge git** — repo scratch dengan 3 commit: `base` (rc.9), `ours` (ourin 9.0.21), `upstream` (rc14); merge `upstream` ke `ours`; 105 konflik diselesaikan.
3. **Kebijakan resolusi konflik** —
   - `.map` & `WAProto/*` → ourin (lebih baru).
   - File yang hanya berubah upstream → rc14.
   - File yang hanya berubah ourin → ourin.
   - Konflik nyata → digabung manual, fitur ourin diport ke struktur rc14 (atau sebaliknya) dengan uji sintaks per file.
4. **Verifikasi** — `node --check` semua `.js`; `tsc --noEmit` graph `.d.ts`; unit test roundtrip (WABinary, protobuf, `encryptedStream`, rich messages, native-flow); smoke test `makeWASocket` + method surface + noise/signal handler.

## Keputusan penting per area

| Area | Keputusan | Alasan |
|---|---|---|
| `WAProto/` | ourin (penuh) | Bundle proto lebih baru & superset (hanya `BotAvatarMetadata` milik rc14 yang tidak ada di ourin, tidak dipakai kode mana pun) |
| `lib/Socket/chats.js` | rc14 murni | Semua tambahan ourin pd file ini ternyata fitur upstream post-rc9 yang sudah ada di rc14; rc14 menambah tctoken gating + blocked-collection resync |
| `lib/Socket/socket.js` | rc14 murni | Refactor `uploadPreKeys` rc14 (server-driven, tanpa throttle) menggantikan throttle ourin; menambah reachout timelock & message capping |
| `lib/Socket/messages-recv.js` | rc14 murni | Fitur ourin (anti-crash view-once, acked/msmsg, retry) sudah tercakup upstream |
| `lib/Socket/messages-send.js` | rc14 + port ourin | Dibangun ulang: rc14 (tctoken, devicesMutex, SKDM, `assertMeId`) + ourin (`NATIVE_FLOW_BUTTON_MAP`, `getButtonType`, `normalizeRecipient*`, relay `recipientOverrides/specificRecipient/specificRecipients`, `forceDistribute` status, Dugong `ourin`, 15+ rich sender, AI message node, `getPrivacyTokens`, kode edit newsletter) |
| `lib/Utils/messages.js` | rc14 + port ourin | rc14 (album native, dsb.) + branch `stickerPack` ourin (diadaptasi ke API `encFilePath` rc14) + `viewOnceMessageV3`/`ptvMessage` di `normalizeMessageContent` |
| `lib/Utils/messages-media.js` | rc14 + patch ourin | Implementasi stream/backpressure rc14 + opsi `mediaKey` reusable & return `mediaKey` (untuk thumbnail sticker-pack) |
| `lib/Socket/newsletter.js` | ourin + endpoint baru | Semua fungsi ourin dipertahankan; `newsletterFollow/Unfollow/MultipleFollow` dialihkan ke `xwa2_newsletter_join_v2`/`leave_v2` (perubahan API upstream) |
| `lib/Types/Mex.js` vs `Types/Newsletter.js` | Mex tunggal | Enum `XWAPaths`/`QueryIds` disatukan di `Mex.js` (superset: ada `follow` lama & `join_v2` baru); `Types/Newsletter.d.ts` disimpan hanya untuk tipe (tanpa enum) — menghindari bentrok `export *` |
| `lib/Utils/tc-token-utils.js`, `identity-change-handler.js`, `sync-action-utils.js` | rc14 | rc14 = superset evolusi file yang juga ada di ourin |
| `lib/Signal/lid-mapping.js` | rc14 + `close()` | rc14 menambah method `close()` |
| `lib/Defaults/index.js` | rc14 + ourin | Ditambah `autoFollowNewsletter*`, rute upload `sticker-pack`/`thumbnail-*`, duplikat `TimeMs` dibuang |
| `lib/Types/Socket.d.ts` | rc14 + ourin | Ditambah opsi `autoFollowNewsletterOnConnect/DelayMs/Jid` |
| `.d.ts` rantai socket | dibangun ulang deterministik | rc14 + anggota ourin sesuai tahap (dicek terhadap `.js` hasil merge sebagai ground truth) |

## Yang secara sadar TIDAK dipertahankan

- Throttle `MIN_UPLOAD_INTERVAL` ourin pada `uploadPreKeys` (rc14 sengaja menghapus agar sama dengan WAWeb; server yang mengatur via notifikasi `PreKeyLow`).
- Penanganan retry "PreKey error" ourin di `messages-recv.js` (idem — upstream menyederhanakan sesuai perilaku WA Web).
- `BotAvatarMetadata` dari proto rc14 (tidak ada di bundle ourin yang lebih baru; tidak direferensikan kode).
- Sourcemap (`.js.map`) untuk file yang digabung manual bisa sedikit tidak akurat — artifact build, tidak berdampak runtime.

## Struktur hasil

```
baileys-all-support/
├── engine-requirements.js   # rc14
├── package.json             # deps gabungan (+ fflate dari ourin; peer @roamhq/wrtc, sharp, jimp, link-preview-js, audio-decode)
├── WAProto/                 # bundle ourin (217 namespace)
├── lib/
│   ├── Modded/message_builder.js  # ourin (ORich/AIRich/Button/Carousel/Toolkit)
│   ├── VoIP/ + assets/wasm/       # ourin (VoipClient/ActiveCall/CallState)
│   ├── Socket/dugong.js           # ourin (Dugong)
│   ├── Utils/rich-messages.js     # ourin (table/list/code/link/latex/unified)
│   ├── Utils/sticker-pack.js      # ourin
│   ├── Utils/companion-reg-client-utils.js, tc-token-utils.js, …  # rc14
│   ├── WAUSync/Protocols/USyncUsernameProtocol.js                # rc14
│   └── Types/Mex.js               # rc14 (enum tunggal XWAPaths/QueryIds)
├── test/                    # import + unit test
└── example/basic.js
```

---

## Round 4 (v1.1.0) — Bug hunt mendalam + merge baileys-nya Shiroine & Sairidev

### Hasil bug hunt (linkcheck + diff forensik + smoke)
1. **[BUGFIX vs upstream itsliaaa] Rich message crash** — `language ||= 'javascript'` pada binding hasil destructuring `const` melempar `TypeError: Assignment to constant variable` di Node/V8 modern setiap kali `generateWAMessageContent({ code })` dipanggil tanpa `language`. Diganti evaluasi `const codeLanguage = language || 'javascript'`.
2. **[BUGFIX vs upstream itsliaaa] Rich message tidak pernah terkirim** — `wrapToBotForwardedMessage()` menaruh `botForwardedMessage` DI DALAM `messageContextInfo`; `proto.Message.ContextInfo` tidak punya field itu sehingga `protobufjs` **membuang seluruh payload rich** secara diam-diam saat `Message.create()`. Diperbaiki: `botForwardedMessage` (bertipe `FutureProofMessage{ message }`) dipindah ke level `proto.Message`, `botMetadata` tetap di `messageContextInfo`. Terverifikasi payload encode 2.1 KB.
3. **[BUGFIX] Media newsletter ditolak server** — upload media ke channel/nl masih memakai path `/o1/` (`MEDIA_PATH_MAP`). Ditambah `NEWSLETTER_MEDIA_PATH_MAP` (path `/newsletter/…` = mesin `/m1/`), flag `newsletter` pada `options.upload(...)`, jalur raw-upload + `server_thumb_gen=1` + field `thumbnail_info` (port itsliaaa).
4. **[HARDENING] AI label** — `content.ai = true` kini ditolak (Boom 400) di chat non-private + menyisipkan `supportPayload` resmi (`BIZ_BOT_SUPPORT_PAYLOAD`).

### Merge Shiroine (bot shiroine.web.id)
Fork `suhwr/Baileys` = base v7.0.0-rc.5 + 3 patch custom (auth-concurrency, revert #1665, Signal/messages-recv). Audit baris-per-baris: **100% sudah terserap di v7.0.0-rc14** yang jadi basis paket ini — tidak ada yang perlu di-port.

### Merge Sairidev (= @itsliaaa/baileys 0.3.18-final) — 60 marker `Lia@Changes/Lia@Fix` diport
- **`Utils/messages.js`**: 19 content-type baru — `raw`, `code`, `links`, `table`, `richResponse` (AI rich), `stickers` (sticker pack + cache + konversi WebP + limit 60), `keep`, `flowReply`, `ptv`, quiz poll (`pollType:1` → `pollCreationMessageV5`), `pollResult`, `pollUpdate`, `paymentInviteServiceType`, `orderText`, `buttons` (+ shortcut `single_select`), `sections`, `templateButtons`, `nativeFlow` (quick_reply/cta_copy/cta_url/cta_call + offer/bottom-sheet), `cards` (carousel + header product), `requestPaymentFrom`, `invoiceNote`; context options `externalAdReply` langsung, `groupStatus`, `spoiler`, `interactiveAsTemplate`, `ephemeral`, `isLottie`, `viewOnceV2`, `viewOnceV2Extension`, `deviceListMetadata` private chat; `getFutureProofMessage` diperluas (16 wrapper tambahan termasuk `botForwardedMessage`, `spoilerMessage`, `lottieStickerMessage`).
- **`Utils/rich-message-utils.js` (file baru)** + `Types/RichType.js`: tokenizer highlight kode (13 bahasa), table/links/latex → `AIRichResponseMessage` + `unifiedResponse` (dengan 2 bugfix di atas).
- **`Socket/messages-send.js`**: `additionalNodes` untuk stanza newsletter, node `meta` (`content_type=add_on` utk pin/keep/reaction, `polltype=vote`, `is_group_status`), `decrypt-fail=hide` utk edit/memberLabel/mediaNotify, attr `native_flow_name`, **auto-relay media album** (`messageAssociation MEDIA_ALBUM` + delay), **status mentions** (`sendMessage([jid…])` → expand participant group + `statusMentionMessage`/`groupStatusMentionMessage`).
- **`Utils/use-single-file-auth-state.js` (file baru)**: auth state 1 file + LRU cache + mutex anti race + atomic write (temp+rename).
- **`Types/Message.js`**: export enum `ButtonType`, `ButtonHeaderType`, `CarouselCardType`, `ListType`, `AssociationType`, `ProtocolType`.
- **Types `.d.ts`**: `AnyMessageContent` diperluas penuh (semua tipe baru) + `Contextable`/`ViewOnce` + `.d.ts` baru utk 3 file port.

### Verifikasi
- linkcheck import dinamis: **114 modul, 0 kegagalan** (+3 modul baru)
- unit test: **42 lulus** (12 lama + 30 baru: interaktif, rich, wraps, guard, regresi bugfix)
- `tsc --noEmit` pada `Types/Message.d.ts`: bersih
- smoke end-to-end via `lib/index.js`: semua ekspor + generate konten OK
