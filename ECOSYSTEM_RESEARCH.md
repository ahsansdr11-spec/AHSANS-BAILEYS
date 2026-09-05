# 🔬 Riset Mendalam: Mana Baileys yang Benar-Benar "SUPPORT ALL"?

> Investigasi menyeluruh ekosistem Baileys — **37 paket npm dianalisis, 12 diverifikasi sampai ke level kode (tarball diunduh & difingerprint)**, repo GitHub dicek aktivitasnya, klaim README dibuktikan dengan isi `lib/` yang sebenarnya.
> Tanggal riset: 5 September 2026 · Lokasi riset: sandbox → registry.npmjs.org + api.github.com

---

## 1. Metodologi (kenapa ini "sangat-sangat dalam")

1. **Census npm** — query registry npm untuk semua paket ber-kata `baileys` (37 paket hidup terakhir 12 bulan).
2. **Metadata mining** — versi terakhir, tanggal publish, deskripsi, repo, dependensi (khususnya `whatsapp-rust-bridge` sebagai penanda generasi), sinyal fitur dari README.
3. **Tarball forensics** — 12 kandidat teratas **diunduh dan dibedah isinya**:
   - `lib/Utils/generics.js` → versi protokol WhatsApp yang diiklankan (`baileysVersion`)
   - Kehadiran file fitur: `rich-messages.js`, `dugong.js`, `VoIP/`, `assets/wasm/`, `Modded/message_builder.js`, `Types/Mex.js`, `tc-token-utils.js`, `USyncUsernameProtocol.js`, `companion-reg-client-utils.js`, `sticker-pack.js`
   - Daftar method socket nyata (`sendTable`, `swgc`, `newsletterFollow`, …) — bukan cuma klaim README
   - Deteksi obfuscation (panjang baris maksimum file JS)
4. **GitHub intel** — bintang, fork, commit terakhir untuk semua repo yang bisa dilacak.
5. **Genealogi fork** — memetakan siapa menurunkan dari siapa (via fingerprint versi + struktur file + pengakuan README).

---

## 2. Peta Genealogi Ekosistem Baileys (2026)

```
WhiskeySockets/Baileys  ⭐10.959 🍴3.350  (aktif s/d 5 Sep 2026; v7.0.0-rc14 + 1 fix)
│
├─ GARIS RESMI ──────────────────────────────────────────────────────────
│  baileys@7.0.0-rc14 (29 Jul 2026) — dasar semua fork modern
│  + commit WIN_HYBRID (4 Agu 2026, belum dirilis ke npm)
│
├─ GARIS "CLEAN ENHANCED" (itsliaaa) ────────────────────────────────────
│  @itsliaaa/baileys@0.3.18-final ⭐93 — tanpa obfuscasi, tanpa auto-follow
│  ├── @fhkryxv/baileys@1.0.3        (sync itsliaaa, update harian)
│  ├── @sairidev/baileys-new@0.3.21  (rebrand — dikritik itsliaaa)
│  ├── @lumina-md/baileys, @lordmega/baileys, phantom-baileys,
│  │   nexora-baileys, @nuisockets/* (4 akun)  ← daftar hangus atribusi
│  └── @vanzxy/baileys@2.0.1  (itsliaaa × rc14 × ourin-VoIP + Framework sendiri)
│
├─ GARIS "OURIN" (mod lengkap + VoIP) ───────────────────────────────────
│  ourin-baileys@9.0.21 (22 Agu 2026) — distribusi compile-only, no repo
│  └── cloud-baileys@1.1.38 (4 Sep 2026) ★ penerus de-facto ourin:
│      + auth SQLite/SQL.js/single-file, atomic session write,
│      + restriction-utils, WAver 2.3000.1044619432 (TERBARU di kelasnya)
│
├─ GARI LAIN yang terverifikasi ─────────────────────────────────────────
│  @rexxhayanasi/elaina-baileys@1.3.8 — WAver 2.3000.1046520132 (TERBARU secara protokol)
│  @nexustechpro/baileys@2.2.7 — klaim besar, tapi full-obfuscated
│  aurum-baileys@1.4.4 (rc14 + MessageBuilder enterprise)
│  @xayz, @diezyclutch, @cikikomo, @pontalabs, @neoxr/wb, dll.
```

---

## 3. Tabel Perbandingan Besar (hasil verifikasi KODE, bukan klaim)

Legenda: ✓ = terbukti di kode · ± = parsial/klaim saja · · = tidak ada

| Paket | Basis | WAver | Interactive/NativeFlow | Album | Sticker Pack | Status Mention | Newsletter suite | VoIP | ORich/AIRich | Rich msgs (tabel/latex/dll) | Payment/Commerce | rc14 fixes (tc-token dkk) | Store/Auth multi-backend | Obfuscation | Update terakhir |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **baileys** (resmi) | rc14 | 1043857760 | ± dasar | ✓ | · | · | ± | · | · | · | · | ✓ | · (in-mem) | ✗ | 29 Jul |
| **cloud-baileys** | ourin 9.x lanjut | **1044619432** | ✓ | ✓ | ✓ | ✓ (`sendStatusMention`,`swgc`,`sendPreview`) | ✓ lengkap (+`cekIDSaluran` dll) | ✓ wasm engine | ✓ ORich | ✓ 15 method (`sendTable`…) | ± | · (basis pra-rc10) | ✓ SQLite/SQL.js/single-file | ⚠️ ya | **4 Sep (harian)** |
| **ourin-baileys** | pra-rc10 | 1035194821 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ wasm | ✓ | ✓ | ± | · | · | ⚠️ ya | 22 Agu |
| **@vanzxy/baileys** | rc14 × itsliaaa × ourin | 1043857760 | ✓ V1/V2/V3 | ✓ | ± | ✓ | ✓ | ✓ eksperimen | ✓ AIRich (40+ method) + Builders/ | ± | ✓ | ✓ | ✓ File/SQLite/Mongo/MySQL/PG/Redis + **Framework bot** | ⚠️ parsial | 4 Sep |
| **@itsliaaa/baileys** | v7 (1041589577) | 1041589577 | ✓ (`buttons`,`nativeFlow`,`flowReply`) | ✓ | ✓ (via content-type) | ✓ (`statusJidList`+docs) | ✓ + fix upload media channel | · | · | ✓ via content-type (`table`,`code`,`links`,`sections`) | ✓ (`invoiceNote`,`orderText`,`requestPaymentFrom`,`paymentInviteServiceType`) | ✓ | ± file/SQLite | ✗ **bersih** | 27 Jun |
| **@rexxhayanasi/elaina** | rc14+ | **1046520132** ⚡ | ± | ✓ | · | ✓ | ✓ | ± klaim | ± MessageBuilder | ± | · | ✓ | ✓ Store/ | ✗ | 1 Sep |
| **@nexustechpro/baileys** | rc14-ish | ? (tak terbaca) | ✓ klaim | ✓ klaim | ✓ klaim | ✓ klaim | ✓ | · | ✓ klaim | ✓ klaim | ✓ klaim | ✓ | ✓ Keyv (Mongo/Redis/PG/SQLite) | ⚠️ **berat** | **4 Sep** |
| **aurum-baileys** | rc14 | 1043857760 | ✓ | ✓ | ± | ± | ✓ | · | ± | ± | · | ✓ | · | ✗ | 28 Agu |
| **@xayz/baileys** | rc14 | 1035194821* | ✓ | ✓ | ± | ✓ | ✓ | ± klaim | · | · | · | ✓ | · | ✗ | 4 Sep |
| **@diezyclutch/baileys** | rc14 | 1043857760 | ± | · | ✓ util | ✓ | ✓ | · | · | · | · | ✓ | · | ✗ | 6 Agu |
| **@systemzero/baileys** | **rc.9 (LAMA)** | 1027934701 | ✓ | ✓ | ± | ✓ | ✓ | · | · | · | · | · | · | ⚠️ | 4 Sep |
| **@cikikomo/baileys** | pra-rc10 | 1035194821 | ± | · | · | ✓ | ± | · | · | · | · | ✓ | · | ✗ | 7 Agu |
| **baileys-all-support** (punya kita) | **rc14 × ourin 9.0.21 merge** | 1043857760 | ✓ | ✓ | ✓ | ✓ | ✓ + join_v2/leave_v2 | ✓ wasm | ✓ ORich | ✓ 15 method | ± | ✓ **penuh** | · | ✗ bersih + .d.ts lengkap | hari ini |

\* xayz menurunkan dari basis ourin-era tapi mengambil sebagian rc14.

---

## 4. Analisis Kandidat Teratas (bukti kode)

### 🥇 cloud-baileys@1.1.38 — *"ourin yang tidak pernah berhenti di-update"*
- **Bukti**: fingerprint identik dengan ourin (rich-messages ✓ dugong ✓ VoIP+wasm ✓ Modded/ORich ✓) **PLUS** file baru yang ourin tidak punya: `use-multi-file-sqlite-auth-state.js`, `use-multi-file-sqljs-auth-state.js`, `use-single-file-auth-state.js`, `use-single-file-sqlite-auth-state.js`, `sqlite-auth-utils.js`, `restriction-utils.js`.
- `useMultiFileAuthState` ditulis ulang **atomic** (temp-file + `rename()`) — fix korupsi session saat OOM/kill -9.
- Versi protokol dio nekkan ke `2.3000.1044619432` — **lebih baru dari rc14** (`1043857760`).
- Update **harian** (1.1.38 tgl 4 Sep), changelog detail per fix.
- ⚠️ Kekurangan: **obfuscated** (kode tidak bisa diaudit), basis pra-rc10 (tidak punya sistem tc-token/privacy-token rc14, USync username, companion-reg), tanpa repo publik (distribution-only), bagian dari ekosistem "Cloud-MD".
- **Ini paket ONE-NPM-INSTALL paling lengkap untuk fitur ourin-lineage.**

### 🥈 @vanzxy/baileys@2.0.1 — *"merge pertama rc14 × itsliaaa × ourin + framework"*
- **Bukti**: satu-satunya paket non-punya-kita yang punya **rc14 fixes** (Mex, tc-token, username-protocol, companion-reg) **DAN** `lib/VoIP/` ourin **DAN** lapisan sendiri: `lib/Builders/` (AIRich, Button/V2/V3, Carousel, Poll, A2UI), `lib/Framework/` (Bot, Context, MediaManager, SessionManager, StatsManager), `lib/Store/` (multi-backend).
- AIRich-nya 40+ method (headings, LaTeX, task/progress card, product card…).
- Native flow paling luas: `otp_button`, `authentication_button`, `voice_call`, `track_order`, `reorder`… (25+ tipe).
- ⚠️ Kekurangan: **obfuscated parsial**, bintang GitHub masih 1, komunitas kecil, tidak punya `rich-messages.js` gaya ourin (punya sendiri), VoIP masih "eksperimental".

### 🥉 @itsliaaa/baileys@0.3.18-final — *"paling bersih & paling dipercaya"*
- **Bukti**: satu-satunya fork besar yang **NOL obfuscation** (max line 589 = kode terformat normal), no auto-follow channel, komunitas terbesar di antara fork enhanced (⭐93, 57 fork).
- Cakupan tipe pesan via `sendMessage` paling luas yang terverifikasi: `album, buttons, cards, code, contacts, flowReply, invoiceNote, links, nativeFlow, orderText, paymentInviteServiceType, pollResult, pollUpdate, requestPaymentFrom, richResponse, sections, stickers, table, templateButtons` + fix nyata upload media ke newsletter.
- **Menjadi "upstream" bagi minimal 10 paket lain** (fhkryxv, sairidev, lumina-md, lordmega, phantom, nexora, nuisockets×4, vanzxy) — bahkan sampai menulis peringatan atribusi di README.
- ⚠️ Kekurangan: **tanpa VoIP**, tanpa method shorthand `sock.sendTable`-style (semua via content type), update terakhir 27 Jun (0.3.18-final = "final").

### ⚡ @rexxhayanasi/elaina-baileys@1.3.8 — *"protokol paling baru"*
- `baileysVersion = 2.3000.1046520132` — **tertinggi di seluruh ekosistem** (rc14: 1043857760, cloud: 1044619432). Artinya snapshot WhatsApp Web yang ditirunya paling segar.
- Punya rc14 fixes + `lib/MessageBuilder/` + `lib/Store/`, kode bersih.
- ⚠️ Kekurangan: MessageBuilder-nya ringkas (bukan 40+ method), VoIP hanya klaim README (tidak ada `lib/VoIP/` di kode).

### ❌ Yang GAGAL verifikasi / mengecewakan
- **@nexustechpro/baileys** — README paling megah (AI Rich, ban checker, AI groups, Keyv multi-backend), tapi **obfuscation paling berat di seluruh ekosistem** (baris sampai 259.381 karakter, versi protokol tak terbaca) — mustahil diaudit. Klaim tidak bisa diverifikasi.
- **@systemzero/baileys** — basis masih **rc.9** (`1027934701`) = protokol tua, tertinggal 2 generasi.
- **@innovatorssoft/baileys** — obfuscated, tanpa jejak fitur rc14.
- **@kelvdra, @riyanofficial, baileys-mod, fiza** — basis lama / tidak ada fitur pembeda terverifikasi.

---

## 5. Temuan Sampingan Penting

1. **Drama atribusi**: itsliaaa mempublikasikan daftar hitam — 4 akun npm (`@nuisockets`, `@nuiisatoru`, `@nuiisweetberry`, `@nuiisweety`) diduga satu orang yang me-republish karyanya tanpa kredit, plus 5 rebrand (`@lumina-md`, `@sairidev`, `@lordmega`, `phantom-baileys`, `nexora-baileys`). **Hati-hati memilih paket dari garis ini.**
2. **Upstream resmi sehat**: WhiskeySockets aktif harian (commit terakhir 4 Agu 2026: fix WIN_HYBRID setelah rc14) — semua fork serius mengejar rc14.
3. **Obfuscation = warn signal**: ourin/cloud/nexustechpro/innovatorssoft/vanzxy parsial mengirim kode tak terbaca. itsliaaa, aurum, diezyclutch, xayz, cikikomo, elaina bersih.
4. **Tidak ada satu paket npm pun yang 100% ALL**: yang punya fitur ourin lengkap (cloud) tidak punya rc14 fixes; yang punya rc14 fixes (itsliaaa/vanzxy/elaina) lemah di VoIP atau bersih tapi tanpa shorthand; yang klaim punya semua (nexustechpro) tak bisa diaudit.

---

## 6. 🏆 VERDICT — "Mana Baileys yang Support ALL?"

| Kategori | Juara | Alasan |
|---|---|---|
| **Install-1-paket paling lengkap** (fitur ourin: VoIP+ORich+album+sticker pack+status) | 🥇 **cloud-baileys** | Satu-satunya paket npm dengan SEMUA fitur ourin + update harian + WAver terbaru di kelasnya + auth SQLite. Tapi obfuscated & tanpa rc14 fixes |
| **Paling lengkap DI ATAS rc14** (fix modern + fitur) | 🥈 **@vanzxy/baileys** | rc14 fixes ✓ + VoIP ✓ + Builders + Framework + multi-store. Obfuscated parsial, komunitas kecil |
| **Paling terpercaya & auditable** | 🥉 **@itsliaaa/baileys** | Bersih, jujur, paling banyak dipakai/di-fork. Tanpa VoIP |
| **Protokol paling segar** | ⚡ **@rexxhayanasi/elaina-baileys** | WAver tertinggi se-ekosistem |
| **Fondasi resmi** | **baileys@7.0.0-rc14** | Semua garis bermuara ke sini |
| **Gabungan murni rc14 × ourin, tanpa obfuscation, tipe lengkap** | 🟢 **baileys-all-support** (repo ini) | Satu-satunya yang menggabungkan **rc14 fixes PENUH** (tc-token, reachout, capping, username-protocol, companion-reg) **dengan** fitur ourin PENUH (VoIP+wasm, ORich, 15 rich senders, sticker pack, status mention, Dugong, newsletter suite) — kode terbuka, .d.ts lolos tsc, teruji unit |

### Kesimpulan akhir
> **Tidak ada paket npm publik tunggal yang benar-benar "ALL".** Yang terdekat:
> - kalau mau **praktis langsung jalan**: `cloud-baileys` (sadar risiko obfuscation & missing rc14 fixes)
> - kalau mau **seimbang**: `@vanzxy/baileys`
> - kalau mau **bertanggung jawab**: `@itsliaaa/baileys` + resmi `baileys`
> - **`baileys-all-support` di repo ini** adalah satu-satunya kombinasi rc14×ourin yang **verifiable** (tidak di-obfuscate, lolos `tsc`, lolos unit test) — gabungan dua garis keturunan terkuat tanpa drama atribusi (kedua induk dikreditkan).

---

## 7. Rekomendasi Tindak Lanjut (buat baileys-all-support kita)

1. **Angkat versi protokol** ke `2.3000.1044619432` (cloud-baileys) atau `2.3000.1046520132` (elaina) — 1 baris di `lib/Utils/generics.js`.
2. **Port atomic auth write** dari cloud-baileys (temp+rename di `use-multi-file-auth-state.js`) — anti korupsi session.
3. **Tambah auth SQLite/SQL.js** (`use-multi-file-sqlite-auth-state`) — nilai tambah nyata, kita sudah punya rc14 fixes yang cloud-baileys tidak punya.
4. Pantau upstream: commit WIN_HYBRID (4 Agu) akan jadi rc15 — siap di-merge ulang.
