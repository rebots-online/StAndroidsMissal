# CHECKLIST — St. Android's Missal v0.1

States: `[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code.

## Phase 0 — Scaffold
- ✅ **T0.1** Repo scaffold: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`.
  Ran `npm install` → exit 0; `node_modules/.bin/{vite,tsc,tauri}` all present. Matches criteria.
- ✅ **T0.2** `DOCS/ARCHITECTURE/StAndroidsMissal-v1.md` with entity table, data flow, decisions, UI surface inventory. File committed.

## Phase 1 — Corpus: graph + vector
- ✅ **T1.1** `src/core/vector/embed.ts` — `embedText(text): Int8Array(128)` hashed-trigram, L2-normalized, int8; `cosine`.
  Ran `npm test` → `embedding is deterministic and self-similar` ok (cosine > 0.99); `related texts score higher than unrelated` ok (unrelated < 0.5). Matches criteria.
- ✅ **T1.2** `scripts/ingest-corpus.mjs` — HelloWord `liturgical.db` → `assets/missal.db` (nodes/edges/text_blocks/embeddings/FTS5), metadata sections (Rank/Rule/Name/Officium/Missa/Prelude/Comment) excluded from similarity/concordance space.
  Ran ingest → `{files:1332, sections:12769, crossRefEdges:377, embeddings:9403, edges:13146}`; text_blocks `{la:12039, en:6329}`. Exceeds the ≥1300/≥9000/>100 criteria.
- ✅ **T1.3** Graph spot-check.
  Ran node query → `Tempora/Quad1-3` HAS_SECTION → Introitus…Super populum (16 sections incl. Ember group); CROSS_REF sample `file:Sancti/12-31 → file:Commune/C4b (directive "vide C4b")`. Matches criteria.
- ✅ **T1.4** Vector similarity sanity.
  Query embed of "Reminíscere miseratiónum tuárum…" → top-2 hits `Tempora/Quad1-3#Introitus` (0.559) and `Tempora/Quad2-0#Introitus` (0.559) — the two real Reminiscere Introits. FTS `reminiscere` → 3 hits incl. both. Matches criteria.

## Phase 2 — Core engines
- ✅ **T2.1** `src/core/calendar/computus.ts` — Butcher's `getEaster`, DO `getWeekKey`, `getSeason`, `seasonColor` (UTC-safe).
  Ran `npm test` → Easter 1818/1886/1943/2000/2024/2025/2026/2038 exact; `Pasc0-0`, `Pasc7-0`, `Quadp3-3`, `Quad1-0`, `Quad1-3`, `Nat0-5`, `Pent\d{2}-0` all pass. Matches criteria.
- ✅ **T2.2** `src/core/calendar/precedence.ts` — `resolveWinner` incl. privileged Lenten feria rule.
  Ran `npm test` → feria 2.1 beats III-classis 3.0; II-classis 5.0 beats feria. Matches criteria.
- ✅ **T2.3** `src/core/model/massOrdo.ts` + `officeCursus.ts`.
  Ran `npm test` → every proper sectionKey ∈ MASS_SECTION_ORDER; trunk order Introitus<Oratio<Lectio<Evangelium, Offertorium<Secreta, Canon<Communio; ember=3; chant tracks ≥3; Tractus active in Lent, Alleluia not; GradualeP in Paschaltide. 10/10 tests pass.
- ✅ **T2.4** `src/core/data/corpusDb.ts` + `loadCorpus.ts` + `liturgicalDay.ts` — sql.js layer shared by web and native, commune gap-fill non-inverted (feast sections always win; only missing sections from commune).
  Verified in-browser (see T3.7): day resolution + Mass texts render from real corpus.

## Phase 3 — UI surfaces
- ✅ **T3.1** `src/ui/SubwayMap.tsx` — two trunk lines, S-curve connector, Ember loop between Collect and Epistle, seasonal chant routes, Super populum spur, conditional dashes, day-colored proper interchanges, staggered labels.
- ✅ **T3.2** `src/ui/ReaderView.tsx` — bilingual (Latin normative), verse-ref styling, annotations (highlight + margin note, localStorage), selection/right-click context menu.
- ✅ **T3.3** `src/ui/MeaningPanel.tsx` — "Catholic meaning of ‹selection›": FTS concordance + vector neighbours; Phase-2 LLM slot clearly labelled; no fabricated content.
- ✅ **T3.4** `src/ui/CalendarView.tsx` — perpetual month grid, on-demand computation, year/month paging.
- ✅ **T3.5** `src/ui/OfficeView.tsx` — eight-hour loop line + per-hour rubrical skeleton.
- ✅ **T3.6** `App.tsx`, `main.tsx`, `styles.css` — shell, rail nav, seasonal theming by day color.
- ✅ **T3.7** In-situ verification.
  Ran `npm run build` → exit 0 (tsc + vite). Ran `vite preview` + headless Chromium (Playwright):
  zero console/page errors; 2026-07-05 resolves to **Dominica VI Post Pentecosten** (Pent06-0, Semiduplex, green — matches divinumofficium.com convention); reader shows real Introit *Dóminus fortitudo plebis suæ* (Ps 27) Latin+English; double-click selection → context menu appears; "Catholic meaning" opens exegesis panel with real concordance/vector hits; calendar renders full July 2026 sanctoral; office loop renders. Screenshots captured for map/reader/menu/meaning/calendar/office.

## Phase 4 — Tauri shell + CI
- ✅ **T4.1** `src-tauri/` — Cargo.toml (tauri 2), `lib.rs` `load_corpus` (include_bytes missal.db), `main.rs`, `tauri.conf.json` (identifier `mba.robin.standroidsmissal`, version 0.1.0 unified with package.json/Cargo.toml, deb/appimage/nsis targets, strict CSP), icons, capabilities.
  Ran `cargo check` (after installing libwebkit2gtk-4.1-dev & GTK headers) → `Finished dev profile … in 1m 00s`, zero errors. Matches criteria.
- [X] **T4.2** `.github/workflows/build-all-platforms.yml` — test+web on every push/PR; linux deb+AppImage, windows NSIS, android APK on master/tags/dispatch.
  Verification = first Actions run on push (CI is the execution environment; local YAML reviewed).
- ✅ **T4.3** Push branch `claude/st-androids-missal-tauri-sg3xos`, open draft PR.
  Ran `git push -u origin claude/st-androids-missal-tauri-sg3xos` → new branch tracked; draft PR opened: https://github.com/rebots-online/StAndroidsMissal/pull/1.

## Phase 5 (next major — not in v1)
- [ ] Breviary full texts + hour-construction schema (all eight hours, every day).
- [ ] `INCLUDES` (`@file:section`) and `EXPANDS` (`$`/`&`) directive edges ingested from the raw DO tree.
- [ ] Real sentence-transformer embeddings replacing hashed trigrams (schema already model-agnostic).
- [ ] Fine-tuned ecclesiastical-Latin LLM behind the Meaning panel.
- [ ] Annotation sync/export; cross-corpus reader navigation (full corpus browser).
- [ ] Signed Android staging/production builds per the all-projects signing SOP.
