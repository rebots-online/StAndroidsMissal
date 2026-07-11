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
All builds are **local** — CI is dormant until public release (TC14).

## Prerequisites

- **Node.js ≥ 22.6** (`--experimental-strip-types` for TS test files + ingest)
- **Rust** (stable, via [rustup](https://rustup.rs))
- **Linux native:** `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev build-essential pkg-config libssl-dev`
- **Android:** Android SDK (android-34, build-tools 34.0.0), `cargo-ndk`, Rust Android targets

See `DOCS/BUILD.md` for full prerequisites and platform-specific setup.

## Quick start

```bash
npm install           # install dependencies
npm run ingest        # rebuild missal.db from VENDORED/ (optional — committed)
npm test              # 37 tests: computus + embeddings + ordo + normalize + concepts
npm run dev           # web dev server (port 5173)
npm run tauri dev     # desktop shell
```

## Native builds

```bash
# Linux (deb + AppImage)
./node_modules/.bin/tauri build --bundles deb,appimage

# Android (APK) — requires ANDROID_HOME + cargo-ndk
./node_modules/.bin/tauri android build

# Or use the kickstart script (idempotent — installs missing prerequisites)
~/Admin-Manual/scripts/kickstart-tauri-build.sh linux
~/Admin-Manual/scripts/kickstart-tauri-build.sh android
```

Artifacts land in `src-tauri/target/release/bundle/` (Linux) or
`src-tauri/gen/android/app/build/outputs/apk/` (Android).

## Documentation

- `DOCS/BUILD.md` — full build instructions (all platforms)
- `DOCS/ARCHITECTURE.md` — authoritative entity table, data flows, decisions
- `DOCS/CORPUS-SCHEMA.md` — corpus schema, concept taxonomy, text normalization
- `DOCS/ARCHITECTURE/StAndroidsMissal-v1.md` — entity table, data flows, decisions
- `CHECKLIST.md` — execution contract and audit trail

Corpus source only is licenced MIT: [Divinum Officium](https://github.com/DivinumOfficium/divinum-officium)
(MIT), by László Kiss and contributors. Latin is the normative reference language.

The St. Android Missal and Breviary in the Extraordinary Form is proprietary software: unauthorized copying, use, or distribution is prohibited.
Copyright © 2026 Robin L. M. Cheung, MBA. All rights reserved.
