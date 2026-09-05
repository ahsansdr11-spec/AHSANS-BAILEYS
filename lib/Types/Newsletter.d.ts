// Newsletter runtime code lives in Mex.js (merged during the ourin x rc14
// merge — see MERGE_NOTES.md). This file previously re-declared
// NewsletterMetadata / NewsletterUpdate / NewsletterCreateResponse /
// NewsletterViewRole, which collided with Mex.d.ts in `export *` chains
// (TS2308 — the names were dropped from the public API).
// It now re-exports the canonical declarations so legacy imports of
// `lib/Types/Newsletter.js` types keep working.
export { NewsletterMetadata, NewsletterUpdate, NewsletterCreateResponse, NewsletterViewRole } from './Mex.js';
//# sourceMappingURL=Newsletter.d.ts.map
