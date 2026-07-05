# St. Android's Missal

**The Traditional Latin Mass and Divine Office as a navigable subway map.**

St. Android's Missal is the next-major-version rewrite of
[SanctissiMissa / "Hello, Word"](https://helloword.robin.mba). It preserves the skeleton
structure of the Mass — expanded and visualized as a subway-style map to navigate the
whole — and re-realizes László Kiss' Divinum Officium flat-text corpus (whose embedded
`@` / `$` / `&` / `vide` directives construct the prayers) as **graph and vector
databases**, serving a beautiful, exegetical UI:

- 🚇 **Subway map of the Mass** — Catechumens line → Faithful line, Ember-Day loop,
  seasonal Graduale/Alleluia/Tractus tracks, conditional Gloria/Credo, Super populum spur
- 📖 **Bilingual exegetical reader** — Latin normative, English modular; annotations,
  highlights, margin notes
- 🖱️ **Right-click → "Catholic meaning of ‹selected text›"** — corpus concordance +
  vector-similar passages today; fine-tuned ecclesiastical LLM in the next major
- 🕸️ **Graph corpus** — `vide C10`-style cross-references, section membership, and the
  ordo itself as first-class edges
- 🔍 **Vector similarity** — offline, deterministic embeddings over every section
- 📅 **Perpetual universal calendar** — Butcher's Easter computus, computed on demand,
  never pre-generated
- 🕰️ **Divine Office cursus** — the eight hours as a loop line (full Breviary texts:
  Phase 2)

## Platforms (Tauri 2)

Web/PWA · Windows 11 (NSIS) · Linux (deb + AppImage) · Android APK.
CI: `.github/workflows/build-all-platforms.yml`.

## Quick start

```bash
npm install
npm run ingest -- /path/to/HelloWord/liturgical-api/assets/liturgical.db   # rebuild missal.db (optional; committed)
npm test              # computus + embedding + ordo tests
npm run dev           # web dev server
npm run tauri dev     # desktop
```

## Documentation

- `DOCS/ARCHITECTURE/StAndroidsMissal-v1.md` — entity table, data flows, decisions
- `CHECKLIST.md` — execution contract and audit trail

Corpus source: [Divinum Officium](https://github.com/DivinumOfficium/divinum-officium)
(MIT), by László Kiss and contributors. Latin is the normative reference language.

Copyright © 2026 Robin L. M. Cheung, MBA. All rights reserved.
