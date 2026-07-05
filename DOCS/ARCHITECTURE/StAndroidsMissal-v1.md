# St. Android's Missal — v1 Architecture

**Status:** authoritative for v0.1.x · **Generated:** 2026-07-05 · **Identifier:** `mba.robin.standroidsmissal`

St. Android's Missal is the next-major-version rewrite of SanctissiMissa ("Hello, Word").
It preserves the skeleton structure of the Mass — expanded and visualized as a **subway-style
map** — and re-realizes László Kiss' Divinum Officium flat-text database (with its embedded
`@`/`$`/`&`/`vide` construction directives) as a **graph + vector database**, serving an
exegetical UI: annotation, cross-referencing, vector similarity, and a right-click
"Catholic meaning of *selected text*" concordance for the Traditional Latin Mass and, in
Phase 2, the whole Divine Office in the Extraordinary Form.

---

## Entity Table

| Entity | Type | File:line | Role | Key signatures / fields |
|--------|------|-----------|------|------------------------|
| `computus` | TS module | `src/core/calendar/computus.ts` | Butcher's Easter + DO week keys + season/color; perpetual universal calendar | `getEaster(year)`, `getWeekKey(date)`, `getSeason(weekKey)`, `seasonColor(weekKey, feast?)` |
| `resolveWinner` | TS fn | `src/core/calendar/precedence.ts` | 1962 precedence: tempora vs sancti, privileged Lenten ferias, Sunday ranks | `resolveWinner(date, season, tempora, sancti[])` |
| `MASS_ORDO` | TS const | `src/core/model/massOrdo.ts` | The skeleton of the Mass as subway stations (2 lines + branches) | `Station { id, latin, english, kind, line, sectionKey?, when? }` |
| `OFFICE_CURSUS` | TS const | `src/core/model/officeCursus.ts` | Eight canonical hours as a loop line | `Hour { id, latin, english, parts[] }` |
| `embedText` | TS fn | `src/core/vector/embed.ts` | Deterministic 128-d hashed-trigram embedding (offline; model-upgradable) | `embedText(text): Int8Array` · `cosine(a, b)` |
| `nodes` | SQL table | `assets/missal.db` (built by ingest) | Graph nodes: files, sections, communes | `kind, key, title, category, rank_class, rank_num, color, meta` |
| `edges` | SQL table | `assets/missal.db` | Graph edges: `HAS_SECTION`, `CROSS_REF` (vide/ex), `NEXT_IN_ORDO` | `src, dst, rel, weight, meta` |
| `text_blocks` | SQL table | `assets/missal.db` | Bilingual resolved text per section node (Latin normative) | `node_id, section, latin, english` |
| `embeddings` | SQL table | `assets/missal.db` | int8 L2-normalized vectors per section node | `node_id, dim, vec BLOB` |
| `search` | FTS5 table | `assets/missal.db` | Full-text concordance | `key, section, content` |
| `ingest-corpus` | Node script | `scripts/ingest-corpus.mjs` | HelloWord `liturgical.db` → `assets/missal.db` (graph+vector) | `node --experimental-strip-types scripts/ingest-corpus.mjs <src> <out>` |
| `CorpusDb` | TS class | `src/core/data/corpusDb.ts` | Single query layer over sql.js — identical on web and Tauri (collinear rule) | `openCorpus(bytes)`, `getFileNode`, `getSanctiForDate`, `getMassTexts`, `similar`, `concordance`, `crossRefs` |
| `loadCorpusBytes` | TS fn | `src/core/data/loadCorpus.ts` | Web: `fetch('/missal.db')` · Tauri: `invoke('load_corpus')` | `loadCorpusBytes(): Promise<Uint8Array>` |
| `annotations` | TS module | `src/core/annotations/store.ts` | Highlights + margin notes, localStorage v1 (schema mirrors future sync table) | `Annotation { id, nodeKey, quote, note, color, createdAt }` |
| `SubwayMap` | React comp | `src/ui/SubwayMap.tsx` | SVG subway map of the whole Mass; stations clickable → reader | props: `day`, `onStation(id)` |
| `ReaderView` | React comp | `src/ui/ReaderView.tsx` | Bilingual exegetical reader; selection → context menu | props: `day`, `focusSection` |
| `MeaningPanel` | React comp | `src/ui/MeaningPanel.tsx` | "Catholic meaning of &lt;selection&gt;": concordance + vector neighbours (+ LLM slot, Phase 2) | props: `term` |
| `CalendarView` | React comp | `src/ui/CalendarView.tsx` | Perpetual month grid, computed on demand (never pre-generated) | props: `ym`, `onPick(date)` |
| `OfficeView` | React comp | `src/ui/OfficeView.tsx` | Divine Office loop line (8 hours) | props: `day` |
| `load_corpus` | Rust cmd | `src-tauri/src/lib.rs` | Returns embedded `missal.db` bytes to the shared sql.js layer | `#[tauri::command] load_corpus() -> Response` |

## Data Flow

```
DivinumOfficium flat text (László Kiss; MIT)          [upstream, resolved by HelloWord build]
  └─ HelloWord liturgical.db  (do_files / do_sections, @·$·&·vide already resolved; cross_ref kept)
       └─ scripts/ingest-corpus.mjs
            ├─ nodes:   file:<path>, section:<path>#<key>
            ├─ edges:   file─HAS_SECTION→section · file─CROSS_REF→Commune/<C> (from "vide C10")
            ├─ text_blocks: Latin + English rows merged per section
            ├─ embeddings:  embedText(latin+english) → int8[128]
            └─ search:  FTS5 (key, section, content)
       └─ assets/missal.db  ── committed, read-only, bundled
            ├─ web:    public/missal.db  → fetch → sql.js (WASM)
            └─ native: include_bytes! in Rust → invoke('load_corpus') → same sql.js layer
```

Runtime day resolution is **computed on demand** (computus → `Tempora/<weekKey>` +
`Sancti/MM-DD*` → `resolveWinner`) and never pre-generated — cache only what's used.

## Decisions

1. **One query layer everywhere (collinear rule).** Web and Tauri both run `CorpusDb`
   on sql.js; native merely supplies bytes via `load_corpus`. No dev-only server, no
   divergent adapters — the HelloWord `ApiAdapter` dead-end is not repeated.
2. **Directives become edges.** `vide/ex C-nn` cross-references are `CROSS_REF` edges;
   the Mass skeleton is `NEXT_IN_ORDO` edges over station nodes. Phase 2 ingests the raw
   DO tree to add `INCLUDES` (`@file:section`) and `EXPANDS` (`$`/`&` macro) edges so the
   construction grammar itself is queryable.
3. **Commune gap-filling is non-inverted.** Sections present in the feast file always win;
   only *missing* Mass sections come from the `CROSS_REF` commune (fixes HelloWord's
   documented C2a inversion bug by construction).
4. **Embeddings are deterministic and offline** (hashed character trigrams, 128-d, int8).
   No API dependency, byte-stable across platforms; the `embeddings` table is
   model-agnostic so a real sentence-transformer can replace it without schema change.
5. **Latin is normative.** `text_blocks.latin` is the reference column; English is a
   modular translation. Reader renders Latin first.
6. **No placeholder data.** Every UI surface renders real corpus rows; Office *texts*
   ship in Phase 2, so v1's OfficeView renders the structural cursus (real rubrical
   structure) and real Psalterium lookups only where present.
7. **One version string** (`0.1.0`) across package.json, tauri.conf.json, Cargo.toml —
   HelloWord's four-way version drift is not inherited.
8. **Namespace** `mba.robin.standroidsmissal` per the all-projects namespace SOP.

## UI Surfaces (major-release inventory)

| Surface | Route | What it shows |
|---------|-------|---------------|
| Subway Map | `map` | Whole Mass as two lines — *Catechumens* and *Faithful* — with the Ember-Day loop between Oratio and Lectio, the seasonal Graduale/Alleluia/Tractus parallel tracks, Super populum spur, conditional Gloria/Credo stations; propers rendered as interchange stations colored by the day |
| Reader | `reader` | Bilingual Latin/English propers of the actual day in canonical order; annotation highlights; selection context menu → Catholic meaning · similar passages · cross-references · annotate |
| Meaning | (panel) | Concordance (FTS5) + vector-similar passages for the selected term; Phase-2 slot for the fine-tuned ecclesiastical LLM |
| Calendar | `calendar` | Perpetual universal month grid from Butcher's computus; rank/color/feast chips; any date navigable (vacation printouts etc.) |
| Office | `office` | The daily cursus as a loop line — Matutinum → … → Completorium; hour structure; Phase-2 full texts |
| Cross-refs | (panel) | Graph edges of the current node (`CROSS_REF`, `HAS_SECTION`) |

## Build & Platforms

- **Web/PWA:** `npm run build` → `dist/` (missal.db served as a static asset).
- **Windows 11:** Tauri NSIS installer (`windows-latest` CI).
- **Linux:** Tauri `deb` + `appimage` (`ubuntu-22.04` CI, webkit2gtk-4.1).
- **Android:** `tauri android init && tauri android build` (CI; debug-signed APK, staging/production signing per the all-projects signing SOP).
- CI: `.github/workflows/build-all-platforms.yml`.

## Phase 2 (next major, explicitly out of v1 scope)

Full Breviary texts (all eight hours, custom schema for hour construction rules),
`INCLUDES`/`EXPANDS` directive edges from the raw DO tree, real embedding model,
annotation sync + export, fine-tuned Latin/ecclesiastical LLM behind the Meaning panel,
right-click meaning across the entire Office.
