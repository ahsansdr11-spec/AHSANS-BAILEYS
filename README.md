# Verity_backend

Backend Node.js untuk Verity — Minecraft Bedrock addon LLM integration — dan rumah bagi **`baileys-all-support`**.

## Isi Repository

| Path | Deskripsi |
|---|---|
| `server.js` | Backend Verity (OpenAI-compatible LLM endpoint dengan persona Verity) |
| `baileys-all-support/` | 🟢 **Baileys ALL-SUPPORT** — gabungan mendalam [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) `7.0.0-rc14` × [ourin-baileys](https://www.npmjs.com/package/ourin-baileys) `9.0.21`. Dokumentasi lengkap: [`baileys-all-support/README.md`](baileys-all-support/README.md), catatan teknis merge: [`baileys-all-support/MERGE_NOTES.md`](baileys-all-support/MERGE_NOTES.md) |

## Menjalankan Backend Verity

```bash
cp .env.example .env   # isi OPENAI_API_KEY
npm install
npm start
```

## Memakai baileys-all-support

```bash
cd baileys-all-support
npm install
node example/basic.js
```

Lihat [`baileys-all-support/README.md`](baileys-all-support/README.md) untuk fitur lengkap (interactive message, ORich AI response, album, sticker pack, newsletter, status mention, VoIP, plus semua fix upstream rc14).
