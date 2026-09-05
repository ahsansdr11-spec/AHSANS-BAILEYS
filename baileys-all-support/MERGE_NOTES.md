# Merge Notes — baileys-all-support 1.0.0

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
