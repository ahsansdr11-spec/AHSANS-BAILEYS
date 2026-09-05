# 🕵️ Intel Bot: sairidev, shiroine, Ourin-MD & Perburuan "Hanzo Baileys"

> Lanjutan riset `ECOSYSTEM_RESEARCH.md` — investigasi bot spesifik sampai ke `package.json` mereka, plus perburuan "hanzo baileys" **SAMPAI KETEMU**.
> Metode: GitHub API (tree + base64 contents), registry npm (fingerprint tarball), `gh` code search, web search. 5 Sep 2026.

---

## 1️⃣ Bot **sairidev** → pakai baileys apa?

**Jawaban: `@sairidev/baileys-new` = republish/sync dari `@itsliaaa/baileys` 0.3.18-final** (garis keturunan WhiskeySockets v7-enhanced).

Bukti:
- npm `@sairidev/baileys-new@0.3.21` — deskripsi sendiri: *"Enhanced Baileys v7 (**synced with itsliaaa/baileys upstream 0.3.18-final**)"*, deps `libsignal@^6` + `whatsapp-rust-bridge@0.5.5` (identik pola itsliaaa).
- GitHub `sairidev` punya 3 repo baileys: `baileys`, `baileys-new` (⭐3, push 31 Mei 2026), `baileys2`.
- ⚠️ **itsliaaa mendaftarkan `@sairidev` di daftar hitamnya**: *"Rebranded republishes of this fork … failing to preserve proper attribution"*.
- WAver protokol: `2.3000.1041589577` (antara rc.9 dan rc14) — hasil fingerprint tarball `@fhkryxv/baileys` yang juga sync itsliaaa.

➡️ Kalau ada bot bilang "pakai baileys sairidev" → isinya kode **itsliaaa-lineage** (v7, clean, tanpa VoIP), bukan fork orisinal baru.

---

## 2️⃣ Bot **Shiroine** (suhwr) → pakai baileys apa?

**Jawaban: fork PRIVATE sendiri dari WhiskeySockets/Baileys v7.0.0-rc.5** (bukan paket npm apa pun).

Bukti:
- Bot-nya **closed source** (repo privat) — yang publik hanya: `shiroine-web2` (landing shiroine.web.id / shiroine.com), `shiroine-docs` (docs.shiroine.web.id, 316 halaman command docs: ai/downloader/game/group/owner/premium…), dan **`suhwr/Baileys`**.
- `suhwr/Baileys` = fork resmi WhiskeySockets, dibekukan di **v7.0.0-rc.5 (Okt 2025)** + commit custom:
  - `fix(auth): resolve concurrency bottleneck causing connection timeouts (#185x)`
  - `messages-recv, decode-wa-message: handle storing new pairs better`
  - `Signal, messages-recv: Fix previous commit…`, `general: revert #1665`
- Author-nya (suhwr, Indonesia) juga eksperimen stack Go: fork `whatsmeow`, `libsignal-protocol-go`, dan **`hypercaller` (WhatsApp VoIP untuk whatsmeow!)** — jadi jangan kaget kalau suatu saat Shiroine pindah/berbagi engine VoIP Go.

➡️ Shiroine = **baileys rc.5 hasil-patch-sendiri**, tidak akan ketemu di npm karena memang tidak dipublikasikan.

---

## 3️⃣ Bot **Ourin-MD** → pakai baileys apa?

**Jawaban: buatan sendiri — `ourin-baileys`** (alias npm `"ourin": "npm:ourin-baileys@^0.7.14"` di package.json bot). TAPI ada plot twist di fork-nya:

| Repo bot Ourin-MD | Dependensi baileys (terverifikasi dari package.json) |
|---|---|
| `bradarwhatisdis/ourin-md` | `"ourin": "npm:ourin-baileys@^0.7.14"` (995 file) |
| `zzzvk54/OURIN-AI-MD` | `"ourin": "npm:ourin-baileys@^0.7.14"` (1.125 file) |
| **`OktzO/ourin-md`** ⚡ | **`"ourin": "npm:onigis@^10.0.0"`** (1.245 file) — **sudah pindah engine!** |

**Plot twist — ekosistem OktzO (aktif kemarin, 4 Sep 2026):**
- **`onigis@10.0.0` (Onigi-Baileys)** — repo `OktzO/Onigi`: *rebase murni @whiskeysockets/baileys **7.0.0-rc14*** dengan **E2EE diganti `oktz-signal` + `oktz-curve25519` (Rust, lisensi MIT)** menggantikan `libsignal` (GPL-3.0). Fokus bot multimedia + **Rich WebUI** (HTML inline di bubble chat) + RAM rendah. Fingerprint: WAver = rc14 (`1043857760`), Mex ✓ tc-token ✓, tanpa fitur ourin.
- **`oktz-baileys@9.1.6`** — fork ourin-baileys FULL (rich-messages ✓ dugong ✓ **VoIP+wasm ✓**) tapi kripto curve-nya juga ditukar ke oktz-signal. 14 versi, ada rc `10.0.0-rc1`.
- Jadi: Ourin-MD asli (hanya_zann/@Zann) = **ourin-baileys**; fork OktzO = **onigis** (rc14+MIT-Rust). Cloud-MD = **cloud-baileys** (lanjutan ourin).

➡️ Jawaban lengkap: Ourin-MD = ourin-baileys (buatan sendiri, itulah yang kemarin kita merge), dan keluarganya sudah bercabang 3: ourin-baileys / cloud-baileys / onigis+oktz-baileys.

---

## 4️⃣ 🔥 PERBURUAN "HANZO BAILEYS" — **KETEMU!**

Dicari sedalam-dalamnya: npm (`hanzo-baileys`, `@hanzo/baileys`, `hanzo-md`, `hanzofd-baileys` → **semua 404**), GitHub repo search (`hanzo baileys`, `hanzo-md`, `hanzobotz`, `hanzofd` → kosong), `gh` **code search** `hanzo baileys in:package.json` → **2 bot ketemu**, lalu ditelusuri ke akarnya:

### 🎯 Jawaban: "Hanzo" di dunia baileys = **HanzOfc-Bot**, dan baileys-nya = `@whiskeysockets/baileys@^6.7.12` (garis legacy v6)

**Bukti keras (dari package.json publik):**

| Bot | Repo | Baileys yang dipakai |
|---|---|---|
| **HanzOfc-Bot** (base by HanzOfc) | `harissfx/basebot-wa` (by Haris Sfx, upd 21 Agu 2026) | **`@whiskeysockets/baileys@^6.7.12`** |
| **HanzOfc-Bot** (reupload) | `nerusen/nelsen-whatsapp-bot-V2` (upd 30 Jul 2026) | **`@whiskeysockets/baileys@^6.7.12`** |
| **HanzoBotz / HANZO-MD** (asli KazeDevID 2022, repo dihapus; fork `Yuri-Neko/HanzoBotz` masih hidup) | — | **`@adiwajshing/baileys@^4.4.0`** (zaman purba, 2022) |

**Profil HanzOfc:**
- Developer Indonesia, identitas **HanzOfc** — Telegram **t.me/HanzOfc**, situs **HanzOfc.com**. **Tidak punya akun GitHub publik & tidak publish paket npm** (semua varian `hanzofc*` = 404) — base botnya beredar via Telegram/klon-an repo orang.
- Fitur base HanzOfc-Bot: plugin hot-reload tanpa restart, jadibot (kloning via pairing code), button interaktif (quick reply/URL/call/copy/list), auto-join channel WA, dukungan LID, multi-level owner, antilink, AFK.
- Komentar author reupload: *"masih akan terus dikembangkan"*.

### ⚠️ Jangan tertukar
- **`@hanzo/*` di npm (hanzo, @hanzo/ui, @hanzo/cli, @hanzo/ai, dst. oleh `zeekay`)** = **Hanzo AI** (perusahaan AI AS — UI kit, IAM, telemetry). **Bukan WhatsApp, bukan baileys.** Hasil pencarian "hanzo" di npm 90% mereka.
- `hanzoai/bot` + `hanzoskill/*` di GitHub = bot personal assistant Hanzo AI (multi-channel), juga bukan fork baileys.

### Kesimpulan Hanzo
> **Tidak ada paket baileys bernama "hanzo" — yang ada adalah bot base "HanzOfc-Bot" (dan kakek moyangnya HanzoBotz/KazeDevID).** Keduanya tidak membuat fork baileys sendiri; mereka hanya **consumer biasa**: HanzOfc-Bot → `@whiskeysockets/baileys@6.7.12` (legacy), HanzoBotz → `@adiwajshing/baileys@4.4.0` (kuno, single-device era). Kalau ada yang jual "hanzo baileys" — itu bukan barang resmi apa pun.

---

## 5️⃣ Bonus intel penting dari perburuan ini

1. **☠️ `lotusbail` = paket baileys BERBAHAYA** — fork @whiskeysockets/baileys yang **mencuri kredensial & pesan WhatsApp** (WebSocket-nya dibungkus buat intercept), 56.000+ download sebelum ketahuan (Koi Security, Des 2025). Kena satu-satunya alasan kuat untuk TIDAK pakai paket baileys obfuscated dari sumber tak jelas — termasuk waspada pada `@nexustechpro`, `@innovatorssoft`, `cloud-baileys`.
2. **`@queenanya/baileys` (anya-bail) v9.4.4** — fork extended berat (WhiskeySockets + InnovatorsSOFT) dengan 16 addon siap pakai (message-composer table/list/latex, button-sender, anti-delete, scheduling…). Kandidat riset berikutnya.
3. **`onigis`** = satu-satunya distribusi baileys rc14 yang **bebas GPL** (E2EE MIT via Rust) — relevan kalau proyek kamu butuh lisensi bersih.
4. Graf silsilah final garis ourin:
   ```
   ourin-baileys (hanya_zann) ── Ourin-MD asli
   ├─ cloud-baileys  ── Cloud-MD (update harian, +SQLite auth)
   ├─ oktz-baileys   ── OktzO (VoIP ourin + kripto Rust MIT)
   └─ onigis         ── OktzO/ourin-md sekarang (rc14 rebase + MIT E2EE)
   ```

---

## Ringkasan satu tabel

| Yang dicari | Ketemu? | Baileys yang sebenarnya dipakai |
|---|---|---|
| Bot **sairidev** | ✅ | `@sairidev/baileys-new` = sync **@itsliaaa/baileys 0.3.18-final** (v7) — masuk daftar hitam atribusi itsliaaa |
| Bot **Shiroine** | ✅ | **Fork private WhiskeySockets v7.0.0-rc.5** milik suhwr (patch auth-concurrency & session), bot closed-source |
| Bot **Ourin-MD** | ✅ | **ourin-baileys** (alias `ourin`); fork OktzO pindah ke **onigis@10.0.0** (rc14 + oktz-signal MIT) |
| **Hanzo baileys** | ✅ **KETEMU** | **Bukan paket** — ini bot **HanzOfc-Bot** (t.me/HanzOfc): pakai `@whiskeysockets/baileys@^6.7.12` legacy; leluhurnya HanzoBotz (KazeDevID) pakai `@adiwajshing/baileys@4.4.0`. Tidak ada fork baileys bernama hanzo di npm/GitHub |
