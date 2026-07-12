# CHECKLIST — St. Android's Missal

States: `[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code.

Contract: `DOCS/ARCHITECTURE.md` (v0.2, authoritative). v0.1 sections below are the completed audit trail.

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
- [/] Breviary full texts + hour-construction schema (all eight hours, every day). → **in scope as v0.2 tasks B2.1–B2.3 below.**
- ✅ `INCLUDES` (`@file:section`) and `EXPANDS` (`$`/`&`) directive edges ingested from the raw DO tree.
  Delivered by v0.2 task V0.5 (ingest v2). Ran `npm test` 2026-07-06 → 16/16 pass incl. `tests/ingest.test.ts` include/macro cases.
- [ ] Real sentence-transformer embeddings replacing hashed trigrams (schema already model-agnostic).
- [ ] Fine-tuned ecclesiastical-Latin LLM behind the Meaning panel.
- [ ] Annotation sync/export; cross-corpus reader navigation (full corpus browser).
- [ ] Signed Android staging/production builds per the all-projects signing SOP.

---

# v0.2 — Vendored corpus, core fixes & full build-out

## Dispatch contract (read once, applies to every task below)

- Every `[ ]` task is **wholly self-contained**: all file paths, entity names, signatures, and content requirements a coder needs are inside the task body. Do not read `DOCS/ARCHITECTURE.md`, other tasks, or any file the task does not name.
- **All `[ ]` tasks are independent and dispatch in ONE parallel wave** (isolated git worktrees). No task waits on another. If your code references a sibling module another task creates (an import that does not exist yet in your worktree), write the import exactly as specified and continue — add the comment `// I-10(b): resolves when sibling task lands` at the import site if your tooling complains. Never invent a different name, never inline a substitute implementation.
- **Verify clauses are hermetic**: they assert only files THIS task produced, via `grep -c` / `wc -l` / `git ls-files` — never a compile, never another task's files. Compile gating is CI's job.
- **Per-task commit (mandatory, second-to-last action):** `git add <exactly the task's files>` + `git commit -m "<type>(<scope>): <task-id> <title>"`. Flipping the marker `[ ]→[X]` is the last action.
- Escalate (do not self-rescue) ONLY for: a named API symbol that contradicts this spec, a structural impossibility, or a contradiction inside the task. A missing sibling file is NOT an escalation (see I-10(b) above).
- TypeScript, 2-space indent, single quotes, semicolons — match the existing style in any file you edit.

## Phase 0 — Corpus sovereignty (audit trail — complete)

- ✅ **V0.1** Whole-repo snapshot at `VENDORED/divinum-officium/` (no `.git`, no upstream tracking).
  Verified 2026-07-06: tree present incl. `web/www/missa/`, `web/www/horas/`.
- ✅ **V0.2** `VENDORED/divinum-officium/PROVENANCE.md` with upstream URL, pinned commit, snapshot date, license, local-modification log.
  Verified 2026-07-06: file present.
- ✅ **V0.3+V0.5** `scripts/ingest-corpus.mjs` v2 + `scripts/do-parse.mjs` + `scripts/scripture.mjs`: ingest reads ONLY `VENDORED/`; `@`-includes and `$`/`&` macros resolved inline; `INCLUDES`/`EXPANDS` edges emitted; `scripts/legacy-file-meta.json` supplies rank/color.
  Ran `npm test` 2026-07-06 → 16/16 pass incl. `tests/ingest.test.ts`.
- ✅ **V0.4** `DOCS/CORPUS-SCHEMA.md` — DO flat-text format, directive grammar, local-modification workflow, output schema.
  Verified 2026-07-06: file present, sections complete.
- ✅ **V0.6** `.gitattributes`: `VENDORED/** -diff -merge linguist-vendored`; `assets/missal.db binary -diff`.
  Verified 2026-07-06: file present with both stanzas. CI run on enlarged repo = first push (see T4.2).
- ✅ **V0.7** Gap-fill chain (same-section → vide commune → vendored scripture → marked placeholder), `meta.filled` flags, `DOCS/CORPUS-FILL-LOG.md` regenerated per ingest (2,595 fills logged).
  Verified 2026-07-06: fill log present with per-fill directive/resolution/citation/source columns.
- ✅ **V0.8** Vendored scripture: `VENDORED/vulgate-clementina/` (vul.tsv + PROVENANCE.md), `VENDORED/douay-rheims/` (EntireBible-DR.json + LICENSE + PROVENANCE.md).
  Verified 2026-07-06: all files present.

## Phase A — Reader & navigation fixes (audit trail — implemented)

- [X] **A1** Scroll fix: `src/App.tsx` view wrapper is always a grid class (`.split` when exegesis open, `.single` otherwise); `src/styles.css` `.split`/`.single` with `min-height: 0` chain so `.content { overflow: auto }` engages.
- [X] **A2** Station re-click: focus state is `{ section: string | null; nonce: number }`; `ReaderView` scroll effect deps include `focusNonce`; `ORDO_STATION_SECTION` maps ordinary station ids → `ordo:` anchors.
- [X] **A3** Bilingual delineation: tokens `--pane-latin-bg` / `--pane-english-bg` applied on `.bilingual .latin/.english`.
- [ ] **A4 Playwright verification of A1–A3** — files: none (evidence only)
  - **Do**: run `npm run build`, then `npx vite preview` + headless Chromium: (1) open Reader for 2026-07-05, assert the reader scrolls (scrollTop changes); (2) click subway stations `oratio`, `canon`, then `oratio` again — assert the reader scrolls to `[data-section="Oratio"]`, `[data-section="ordo:Canon"]`, then back; (3) assert computed background of `.bilingual .latin` ≠ `.bilingual .english`. Save screenshots to `.tmp/a4-*.png`.
  - **Verify**: screenshots exist: `ls .tmp/a4-*.png | wc -l` ≥ 3.
  - **Accept**: all three assertions pass with zero console errors; evidence noted here.
  - **Commit**: no source changes; record evidence in this file only — `git add CHECKLIST.md && git commit -m "test(reader): A4 playwright evidence for A1-A3"`.

## Phase B — Ordinary + full Office

- [X] **B1** Ordinary of the Mass wired: `CorpusDb.getOrdoTexts()` (file `Ordo/Missae`), `READER_ORDER` interleave, `ORDO_STATION_SECTION`, ReaderView renders ordinary + propers in canonical order with `ordo:` anchors.

- [ ] **B2.0 CorpusDb: public file-section access** — files: `src/core/data/corpusDb.ts` — entities: `CorpusDb.getFileSections`, `CorpusDb.hasFile`
  - **Do**: in `src/core/data/corpusDb.ts`, inside `export class CorpusDb` (after the existing `getOrdoTexts()` method), add two public methods. (1) `getFileSections(path: string): SectionText[]` — returns every text section of corpus file `path` in stored order: SQL `SELECT tb.section, tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key LIKE ?` with param `` `section:${path}#%` `` via the existing private `all()` helper; map each row to `{ nodeKey: \`section:${path}#${row.section}\`, section: String(row.section), latin: row.latin ?? null, english: row.english ?? null, sourcePath: path, fromCommune: false }`. Exclude meta sections: skip rows whose section is one of `'Rank','Rule','Name','Officium','Missa','Prelude','Comment'`. (2) `hasFile(path: string): boolean` — `SELECT 1 FROM nodes WHERE key = ?` with `` `file:${path}` ``, returns rows.length > 0. `SectionText` is already imported in this file.
  - **Verify**: `grep -c 'getFileSections(path: string): SectionText\[\]' src/core/data/corpusDb.ts` → 1; `grep -c 'hasFile(path: string): boolean' src/core/data/corpusDb.ts` → 1.
  - **Accept**: both methods exist as public members of `CorpusDb` with exactly these signatures; meta sections excluded.
  - **Commit**: `git add src/core/data/corpusDb.ts && git commit -m "feat(data): B2.0 CorpusDb.getFileSections + hasFile"`.

- [ ] **B2.1 Office hour assembly module** — files: `src/core/data/officeTexts.ts` (new) — entities: `OfficeSlot`, `HOUR_SECTION_PATTERNS`, `getOfficeTexts`
  - **Do**: create `src/core/data/officeTexts.ts`. Imports: `import type { CorpusDb } from './corpusDb.ts';` · `import type { DayInfo, SectionText, ReaderEntry } from './types.ts';` (`ReaderEntry` is added to types.ts by a sibling task — I-10(b) applies). Export: `export interface OfficeSlot { pattern: RegExp; title?: string }` and `export const HOUR_SECTION_PATTERNS: Record<string, OfficeSlot[]>` keyed by the eight hour ids `matutinum, laudes, prima, tertia, sexta, nona, vesperae, completorium`, with these exact slot lists (patterns match the ingested DO section names):
    - `matutinum`: `/^Invit/`, `/^Hymnus Matutinum$/`, `/^Ant Matutinum/`, `/^Nocturn \d Versum$/`, `/^Lectio[1-9]$/` (title 'Lectiones'), `/^Responsory[1-9]$/` (title 'Responsoria'), `/^Lectio9[34]$/`
    - `laudes`: `/^Ant Laudes/`, `/^Capitulum Laudes$/`, `/^Hymnus Laudes$/`, `/^Versum 2$/`, `/^Ant 2$/` (title 'Ad Benedictus'), `/^Oratio$/` (title 'Oratio')
    - `prima`: `/^Ant 1$/`, `/^Lectio Prima$/`, `/^Responsory Breve Prima$/`, `/^Versum Prima$/`
    - `tertia`: `/^Capitulum Tertia$/`, `/^Responsory Breve Tertia$/`, `/^Versum Tertia$/`
    - `sexta`: `/^Capitulum Sexta$/`, `/^Responsory Breve Sexta$/`, `/^Versum Sexta$/`
    - `nona`: `/^Capitulum Nona$/`, `/^Responsory Breve Nona$/`, `/^Versum Nona$/`
    - `vesperae`: `/^Ant Vespera/`, `/^Capitulum Vespera/`, `/^Hymnus Vespera/`, `/^Versum 3$/`, `/^Ant 3$/` (title 'Ad Magnificat'), `/^Oratio$/` (title 'Oratio')
    - `completorium`: `/^Ant Completorium/`, `/^Lectio brevis/`, `/^Nunc dimittis/`
    Export `export function getOfficeTexts(db: CorpusDb, day: DayInfo, hourId: string): ReaderEntry[]`: compute candidate paths in priority order `[ 'Horas/' + (day.winner?.key ?? day.temporaPath), 'Horas/' + day.temporaPath ]` (dedup); pick the first for which `db.hasFile(path)`; if none, return `[]`. Get `db.getFileSections(path)`; also, if the day file has a commune (`db.communeOf(path)`), get the commune's sections as fallback rows for patterns with zero own matches. For each slot in `HOUR_SECTION_PATTERNS[hourId]` (in order), collect matching sections (own first, commune fallback); map each to `ReaderEntry`: `{ ...sectionText, ordinary: false, displayTitle: slot.title ? slot.title + ' — ' + sectionText.section : sectionText.section, anchor: hourId + ':' + sectionText.section }`. De-duplicate by `anchor` (first wins). Return the ordered array.
  - **Verify**: `grep -c 'export function getOfficeTexts' src/core/data/officeTexts.ts` → 1; `grep -c 'HOUR_SECTION_PATTERNS' src/core/data/officeTexts.ts` ≥ 2; `grep -c 'completorium' src/core/data/officeTexts.ts` ≥ 1.
  - **Accept**: module exists with the three exports above; all eight hour keys present; no other exports.
  - **Commit**: `git add src/core/data/officeTexts.ts && git commit -m "feat(office): B2.1 getOfficeTexts + HOUR_SECTION_PATTERNS"`.

- [ ] **B2.2 tests for office assembly** — files: `tests/officeTexts.test.ts` (new) — entities: `getOfficeTexts`, `HOUR_SECTION_PATTERNS`
  - **Do**: create `tests/officeTexts.test.ts` using `node:test` + `node:assert/strict`, following the import style of the existing suite (`import { test } from 'node:test'; import assert from 'node:assert/strict';`). Import `{ HOUR_SECTION_PATTERNS }` from `../src/core/data/officeTexts.ts`. Tests (pure, no DB): (1) 'all eight hours have slot plans' — assert the eight keys `matutinum, laudes, prima, tertia, sexta, nona, vesperae, completorium` each map to a non-empty array; (2) 'patterns match known DO section names' — assert `HOUR_SECTION_PATTERNS.laudes.some(s => s.pattern.test('Capitulum Laudes'))`, `...nona...test('Responsory Breve Nona')`, `...matutinum...test('Lectio3')`, `...vesperae...test('Ant Vespera')`; (3) 'meta sections never match' — for every hour, assert no slot pattern tests true for 'Rank', 'Rule', or 'Officium'.
  - **Verify**: `grep -c "from '../src/core/data/officeTexts.ts'" tests/officeTexts.test.ts` → 1; `grep -c 'node:test' tests/officeTexts.test.ts` → 1.
  - **Accept**: file exists with exactly the three described test cases.
  - **Commit**: `git add tests/officeTexts.test.ts && git commit -m "test(office): B2.2 officeTexts pattern tests"`.

- [ ] **B3.0 Shared types: ReaderEntry + sidecar rows** — files: `src/core/data/types.ts` — entities: `ReaderEntry`, `Homily`, `JournalEntry`, `ThemeSpan`, `UserMode`
  - **Do**: append to `src/core/data/types.ts` (keep every existing export untouched):
    ```ts
    /** One renderable entry of an interleaved reader (Mass or Office). */
    export interface ReaderEntry extends SectionText {
      ordinary: boolean;
      displayTitle: string;
      /** Unique data-section anchor ("Introitus", "ordo:Canon", "laudes:Oratio"). */
      anchor: string;
    }
    export type UserMode = 'priest' | 'laity';
    export type HomilyStatus = 'unstarted' | 'in-progress' | 'complete';
    export interface Homily { id: string; deviceId: string; updatedAt: string; deletedAt: string | null; liturgicalKey: string; year: number | null; title: string; bodyMd: string; status: HomilyStatus; color: string | null; themeSpanId: string | null; }
    export interface JournalEntry { id: string; deviceId: string; updatedAt: string; deletedAt: string | null; liturgicalKey: string; date: string; title: string; bodyMd: string; anchors: string[]; }
    export interface ThemeSpan { id: string; deviceId: string; updatedAt: string; deletedAt: string | null; label: string; color: string; startDate: string; endDate: string; cadence: 'daily' | 'weekly'; }
    ```
    `SectionText` already exists in this file.
  - **Verify**: `grep -c 'export interface ReaderEntry' src/core/data/types.ts` → 1; `grep -c 'export interface Homily' src/core/data/types.ts` → 1; `grep -c "export type UserMode = 'priest' | 'laity'" src/core/data/types.ts` → 1.
  - **Accept**: all five new exports present with exactly these fields; no existing export modified.
  - **Commit**: `git add src/core/data/types.ts && git commit -m "feat(types): B3.0 ReaderEntry + sidecar row types"`.

- [ ] **B3.1 Extract SectionReader; ReaderView becomes assembler** — files: `src/ui/SectionReader.tsx` (new), `src/ui/ReaderView.tsx` — entities: `SectionReader`, `ReaderView`, `SelectionAction`
  - **Do**: (1) Create `src/ui/SectionReader.tsx` exporting default component `SectionReader` with props `{ entries: ReaderEntry[]; focusSection: string | null; focusNonce: number; onAction: (a: SelectionAction) => void; emptyMessage?: React.ReactNode }` (`import type { ReaderEntry } from '../core/data/types.ts';` — I-10(b)). Move VERBATIM from `src/ui/ReaderView.tsx` into it: the scroll-to-anchor effect (querying `[data-section]` with `CSS.escape`, deps `[focusSection, focusNonce]`), the scroll-close-menu effect, `openMenu`, the full `entries.map(...)` section rendering (bilingual panes, lang tags, annotation list, `data-section`/`data-nodekey` attributes), the context menu, the annotate popover, and the helper `menuNodeKeyFromSelection` — all state (`menu`, `noteFor`, `noteText`, `annVersion`) and the imports they need (`useState/useEffect/useRef`, annotations store, `TextBlock` if it is a local helper move it too). Render wrapper stays `<div className="content reader" ref={rootRef}>…`; when `entries.length === 0` render `emptyMessage ?? null` inside the wrapper. Also re-export from this file: `export type { SelectionAction } from './ReaderView.tsx'` is NOT allowed (circular) — instead MOVE the `SelectionAction` type definition into `SectionReader.tsx` (`export interface SelectionAction { kind: 'meaning' | 'similar' | 'crossrefs'; term: string; nodeKey: string | null }`). (2) Rewrite `src/ui/ReaderView.tsx`: keep props `{ db, day, focusSection, focusNonce, onAction }`; keep the `entries` useMemo that builds `ReaderEntry[]` from `db.getMassTexts(path)` + `db.getOrdoTexts()` + `READER_ORDER` + `ORDO_STATION_SECTION` anchor mapping (unchanged logic; type now imported from types.ts); map an incoming ordinary-station `focusSection` through `ORDO_STATION_SECTION` to its `ordo:` anchor BEFORE passing down; return `<SectionReader entries={entries} focusSection={mappedFocus} focusNonce={focusNonce} onAction={onAction} emptyMessage={…existing no-propers paragraph…} />`; re-export the moved type for existing importers: `export type { SelectionAction } from './SectionReader.tsx';`.
  - **Verify**: `git ls-files --others --exclude-standard src/ui/SectionReader.tsx | wc -l` → 1 (before commit) OR `grep -c 'export default function SectionReader' src/ui/SectionReader.tsx` → 1; `grep -c 'SectionReader' src/ui/ReaderView.tsx` ≥ 2; `grep -c 'export interface SelectionAction' src/ui/SectionReader.tsx` → 1.
  - **Accept**: SectionReader owns all rendering/annotation/menu machinery; ReaderView contains no JSX for sections/menus beyond the SectionReader call; `SelectionAction` importable from both files.
  - **Commit**: `git add src/ui/SectionReader.tsx src/ui/ReaderView.tsx && git commit -m "refactor(reader): B3.1 extract SectionReader"`.

- [ ] **B2.3 OfficeView renders real hour texts** — files: `src/ui/OfficeView.tsx` — entities: `OfficeView`, `getOfficeTexts`, `SectionReader`
  - **Do**: rewrite `src/ui/OfficeView.tsx`. New props: `{ db: CorpusDb; day: DayInfo | null; onAction: (a: SelectionAction) => void }` (`import type { CorpusDb } from '../core/data/corpusDb.ts'; import type { DayInfo } from '../core/data/types.ts'; import type { SelectionAction } from './SectionReader.tsx'; import SectionReader from './SectionReader.tsx'; import { getOfficeTexts } from '../core/data/officeTexts.ts'; import { OFFICE_CURSUS } from '../core/model/officeCursus.ts';` — sibling imports are I-10(b)). Keep the existing eight-hour loop-line SVG/list as the hour picker (state `const [hourId, setHourId] = useState('laudes')`), clicking an hour selects it. Below the loop, when `day` is non-null: `const entries = useMemo(() => getOfficeTexts(db, day, hourId), [db, day, hourId]);` and render `<SectionReader entries={entries} focusSection={null} focusNonce={0} onAction={onAction} emptyMessage={<p>The corpus carries no proper texts for <b>{hourId}</b> on this day — its office is built from the ferial psalter. Full hour construction (psalm schema per weekday) is a later phase.</p>} />`. Keep each hour's `parts` list rendered as the rubrical skeleton caption for the selected hour.
  - **Verify**: `grep -c 'getOfficeTexts' src/ui/OfficeView.tsx` ≥ 2; `grep -c 'SectionReader' src/ui/OfficeView.tsx` ≥ 2; `grep -c "useState('laudes')" src/ui/OfficeView.tsx` → 1.
  - **Accept**: OfficeView shows loop-line hour picker + real bilingual sections for the selected hour via SectionReader; empty state is the specified message; no placeholder text content.
  - **Commit**: `git add src/ui/OfficeView.tsx && git commit -m "feat(office): B2.3 OfficeView renders assembled hour texts"`.

## Phase C — Subway map lore

- [ ] **C1 Station + line lore data** — files: `src/core/model/stationLore.ts` (new) — entities: `Lore`, `STATION_LORE`, `LINE_LORE`, `LineLoreId`
  - **Do**: create `src/core/model/stationLore.ts`:
    ```ts
    export interface Lore { what: string; origins: string; evolution: string; novusOrdo: string }
    export type LineLoreId = 'line-catechumens' | 'line-faithful' | 'connector' | 'ember-loop' | 'chant-graduale' | 'chant-alleluia' | 'chant-tractus' | 'chant-graduale-p' | 'super-populum-spur';
    export const STATION_LORE: Record<string, Lore> = { … };
    export const LINE_LORE: Record<LineLoreId, Lore> = { … };
    ```
    `STATION_LORE` MUST contain exactly these 31 keys (the station ids): `asperges, iudica, confiteor, introitus, kyrie, gloria, oratio, lectio-l1, graduale-l1, oratio-l1, lectio, graduale, alleluia, tractus, graduale-p, evangelium, credo, offertorium, lavabo, orate-fratres, secreta, praefatio, sanctus, canon, pater-noster, agnus-dei, communio, postcommunio, super-populum, ite, ultimum-evangelium`. For every key author all four fields, 2–4 sentences each: `what` = what this part of the Mass is and does; `origins` = historical origin (era/source, e.g. "entrance psalmody attested by the 5th c."); `evolution` = how it developed to 1962; `novusOrdo` = its treatment in the 1969/70 Missal — retained / renamed / restructured / omitted, with the significant change named (e.g. Iudica me and the Last Gospel suppressed; multiple Eucharistic Prayers alongside the Roman Canon; Tract replaced by the Verse before the Gospel). Factual, sober register; NO invented citations, NO dates more precise than scholarship supports (century-level is fine). `LINE_LORE` covers all 9 route ids: the two trunk lines (catechumen/didactic vs eucharistic halves), the S-curve `connector` (the historical seam between synaxis and eucharist), `ember-loop` (Quatuor Tempora extra lessons — why the loop exists and when it is travelled), the three-plus-one chant bypass routes (why Gradual is the trunk; Alleluia omitted Septuagesima→Lent, Tract substituting; doubled Alleluia in Paschaltide replacing the Gradual), and `super-populum-spur` (Lenten ferial Oratio super populum). Same four fields, same register.
  - **Verify**: `grep -c 'export const STATION_LORE' src/core/model/stationLore.ts` → 1; `grep -c "'ultimum-evangelium':" src/core/model/stationLore.ts` → 1; `grep -c "'super-populum-spur':" src/core/model/stationLore.ts` → 1; `grep -c 'novusOrdo:' src/core/model/stationLore.ts` → 40.
  - **Accept**: all 31 station keys + all 9 line keys present, every record carrying four non-empty fields.
  - **Commit**: `git add src/core/model/stationLore.ts && git commit -m "feat(map): C1 station + line lore corpus"`.

- [ ] **C3 LoreCallout popover component** — files: `src/ui/LoreCallout.tsx` (new) — entities: `LoreCallout`
  - **Do**: create `src/ui/LoreCallout.tsx` exporting default component `LoreCallout` with props `{ title: string; subtitle?: string; lore: Lore; x: number; y: number; onClose: () => void }` (`import type { Lore } from '../core/model/stationLore.ts';`). Render a `<div className="lore-callout" role="dialog" aria-label={title}>` positioned `style={{ left: clampedX, top: clampedY }}` where clamping keeps the box inside the viewport (box width 360px, max-height 44vh; clamp `x` to `window.innerWidth - 376`, `y` to `window.innerHeight - (0.44 * window.innerHeight) - 16`). Content: `<h3>{title}</h3>`, optional `<div className="lore-sub">{subtitle}</div>`, then four labelled blocks in order — 'What it is' → `lore.what`, 'Origins' → `lore.origins`, 'Development' → `lore.evolution`, 'In the Novus Ordo' → `lore.novusOrdo` — inside a scrollable `<div className="lore-body">`. A close button `<button className="close" onClick={onClose}>✕</button>`. Behaviour: `useEffect` adding a window `keydown` listener that calls `onClose()` on `Escape`, cleaned up on unmount. No portal needed.
  - **Verify**: `grep -c 'export default function LoreCallout' src/ui/LoreCallout.tsx` → 1; `grep -c 'In the Novus Ordo' src/ui/LoreCallout.tsx` → 1; `grep -c "role=\"dialog\"" src/ui/LoreCallout.tsx` → 1.
  - **Accept**: component matches the spec (props, four blocks, Escape-close, viewport clamping).
  - **Commit**: `git add src/ui/LoreCallout.tsx && git commit -m "feat(map): C3 LoreCallout popover"`.

- [ ] **C2 SubwayMap hover/focus lore wiring** — files: `src/ui/SubwayMap.tsx` — entities: `SubwayMap`, `STATION_LORE`, `LINE_LORE`, `LoreCallout`
  - **Do**: edit `src/ui/SubwayMap.tsx`. Add imports `import { STATION_LORE, LINE_LORE, type LineLoreId, type Lore } from '../core/model/stationLore.ts';` and `import LoreCallout from './LoreCallout.tsx';` and `useState` from react (I-10(b) for siblings). Add state `const [callout, setCallout] = useState<{ title: string; subtitle?: string; lore: Lore; x: number; y: number } | null>(null);`. (1) In `StationDot`: REMOVE the `<title>` element; add to the `<g>`: `tabIndex={0}`, `onMouseEnter={(e) => { const l = STATION_LORE[s.id]; if (l) setCallout({ title: s.latin, subtitle: s.english + (s.note ? ' — ' + s.note : ''), lore: l, x: e.clientX + 12, y: e.clientY + 12 }); }}`, `onMouseLeave={() => setCallout(null)}`, `onFocus` opening the same callout anchored to the dot's `getBoundingClientRect()` (use `e.currentTarget.getBoundingClientRect()`, x = rect.right + 8, y = rect.top), `onBlur={() => setCallout(null)}`. Click behaviour unchanged (still `onStation`); on touch, a long-press (`onTouchStart` starting a 450ms timer cleared by `onTouchEnd`/`onTouchMove`) opens the callout instead of navigating. (2) Line/route hover: add the same `onMouseEnter/onMouseLeave` pair (with fixed titles) to these existing elements, keyed into `LINE_LORE`: trunk-1 `<path>` → `line-catechumens` (title 'Missa Catechumenorum'); trunk-2 `<path>` → `line-faithful` (title 'Missa Fidelium'); the S-curve connector `<path>` → `connector` (title 'From Word to Sacrifice'); the ember loop `<path>` → `ember-loop` (title 'Quatuor Tempora'); each chant route `<path>` → `chant-graduale` / `chant-alleluia` / `chant-tractus` / `chant-graduale-p` by station id (titles 'Graduale' / 'Alleluia' / 'Tractus' / 'Alleluia paschale'); the super-populum spur `<path>` → `super-populum-spur` (title 'Oratio super populum'). Widen hover targets by adding `strokeWidth` hit area: wrap each lore-bearing path in a `<g>` with an invisible duplicate path `stroke="transparent" strokeWidth={18}` carrying the handlers. (3) Render `{callout && <LoreCallout {...callout} onClose={() => setCallout(null)} />}` inside the outer `.map-wrap` div, after the `<svg>`.
  - **Verify**: `grep -c '<title>' src/ui/SubwayMap.tsx` → 0; `grep -c 'LoreCallout' src/ui/SubwayMap.tsx` ≥ 2; `grep -c 'LINE_LORE' src/ui/SubwayMap.tsx` ≥ 2; `grep -c 'strokeWidth={18}' src/ui/SubwayMap.tsx` ≥ 5.
  - **Accept**: hover/focus/long-press opens the callout for every station and all 9 routes; native tooltips gone; click-to-reader unchanged.
  - **Commit**: `git add src/ui/SubwayMap.tsx && git commit -m "feat(map): C2 lore hover targets on stations and routes"`.

## Phase D — Sidecar + planner/journal

- [ ] **D1 SidecarDb (user-data plane)** — files: `src/core/data/sidecarDb.ts` (new) — entities: `SIDECAR_SCHEMA_SQL`, `SidecarDb`, `migrateLocalStorageAnnotations`
  - **Do**: create `src/core/data/sidecarDb.ts` (imports: `initSqlJs` + wasm the same way `corpusDb.ts` does — copy its two import lines; `import { isTauri } from './loadCorpus.ts';` `import type { Homily, JournalEntry, ThemeSpan } from './types.ts';` `import type { Annotation } from '../annotations/store.ts';`). Export `SIDECAR_SCHEMA_SQL` — exactly this DDL:
    ```sql
    CREATE TABLE IF NOT EXISTS annotations (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, node_key TEXT NOT NULL, quote TEXT NOT NULL, note TEXT, color TEXT NOT NULL DEFAULT 'gold', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS homilies (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, liturgical_key TEXT NOT NULL, year INTEGER, title TEXT NOT NULL DEFAULT '', body_md TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'unstarted', color TEXT, theme_span_id TEXT);
    CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, liturgical_key TEXT NOT NULL, date TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', body_md TEXT NOT NULL DEFAULT '', anchors TEXT NOT NULL DEFAULT '[]');
    CREATE TABLE IF NOT EXISTS theme_spans (id TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT, label TEXT NOT NULL, color TEXT NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL, cadence TEXT NOT NULL DEFAULT 'weekly');
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL, value TEXT NOT NULL);
    ```
    Export `class SidecarDb`. Members: `static async open(): Promise<SidecarDb>` — load persisted bytes (Tauri: `const { invoke } = await import('@tauri-apps/api/core'); const b = await invoke<number[] | null>('load_sidecar')`; web: IndexedDB database `standroidsmissal`, object store `blobs`, key `sidecar.db`), construct `new SQL.Database(bytes ?? undefined)`, run `SIDECAR_SCHEMA_SQL` (`db.exec`), ensure a `device_id` row in `settings` (key `'device.id'`, value `crypto.randomUUID()` if absent) and cache it on the instance. `persist(): Promise<void>` — `this.db.export()` then Tauri `invoke('save_sidecar', { bytes: Array.from(bytes) })` / web IndexedDB put; debounce NOT here (callers debounce). Private helpers `all(sql, params)` / `run(sql, params)` mirroring `corpusDb.ts`'s prepare/bind/step/free pattern. Public API (every write sets `updated_at = new Date().toISOString()` and `device_id = this.deviceId`; deletes are tombstones `UPDATE … SET deleted_at = now`; every list filters `deleted_at IS NULL`): `listAnnotations(nodeKey?: string): Annotation[]` (map node_key→nodeKey, created_at→createdAt) · `addAnnotation(a: Omit<Annotation, 'id' | 'createdAt'>): Annotation` (uuid id, createdAt now) · `removeAnnotation(id: string): void` · `listHomilies(liturgicalKey?: string, year?: number | null): Homily[]` · `upsertHomily(h: Partial<Homily> & { liturgicalKey: string }): Homily` (INSERT OR REPLACE; uuid when no id) · `listJournalEntries(liturgicalKey?: string): JournalEntry[]` (anchors JSON.parse with try/catch → `[]`) · `upsertJournalEntry(e: Partial<JournalEntry> & { liturgicalKey: string; date: string }): JournalEntry` · `listThemeSpans(): ThemeSpan[]` · `upsertThemeSpan(t: Partial<ThemeSpan> & { label: string; color: string; startDate: string; endDate: string }): ThemeSpan` · `deleteRow(table: 'homilies' | 'journal_entries' | 'theme_spans', id: string): void` · `getSetting(key: string): string | null` · `setSetting(key: string, value: string): void`. Column↔field mapping is snake_case↔camelCase as in the DDL/types. Export `async function migrateLocalStorageAnnotations(sdb: SidecarDb): Promise<number>`: if `sdb.getSetting('migrated.localStorage') === '1'` return 0; read localStorage key `sam.annotations.v1` (JSON array; absent/malformed → `[]`), insert each via `addAnnotation` preserving `nodeKey/quote/note/color` (and `createdAt` if present — pass through by inserting with the original id/createdAt via a direct `run` INSERT), set `migrated.localStorage = '1'`, `persist()`, return count.
  - **Verify**: `grep -c 'export const SIDECAR_SCHEMA_SQL' src/core/data/sidecarDb.ts` → 1; `grep -c 'CREATE TABLE IF NOT EXISTS' src/core/data/sidecarDb.ts` → 5; `grep -c 'export class SidecarDb' src/core/data/sidecarDb.ts` → 1; `grep -c 'migrateLocalStorageAnnotations' src/core/data/sidecarDb.ts` ≥ 1; `grep -c 'deleted_at IS NULL' src/core/data/sidecarDb.ts` ≥ 4.
  - **Accept**: class exposes exactly the listed API; all rows tombstoned, never hard-deleted; device id stable across opens.
  - **Commit**: `git add src/core/data/sidecarDb.ts && git commit -m "feat(sidecar): D1 SidecarDb sync-ready user-data store"`.

- [ ] **D1.T Tauri sidecar persistence commands** — files: `src-tauri/src/lib.rs` — entities: `load_sidecar`, `save_sidecar`
  - **Do**: edit `src-tauri/src/lib.rs`. Add two commands beside the existing `load_corpus`:
    ```rust
    fn sidecar_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
        let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir.join("sidecar.db"))
    }
    #[tauri::command]
    fn load_sidecar(app: tauri::AppHandle) -> Result<Option<Vec<u8>>, String> {
        let p = sidecar_path(&app)?;
        if !p.exists() { return Ok(None); }
        std::fs::read(&p).map(Some).map_err(|e| e.to_string())
    }
    #[tauri::command]
    fn save_sidecar(app: tauri::AppHandle, bytes: Vec<u8>) -> Result<(), String> {
        let p = sidecar_path(&app)?;
        let tmp = p.with_extension("db.tmp");
        std::fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, &p).map_err(|e| e.to_string())
    }
    ```
    (uses `tauri::Manager` path API — add `use tauri::Manager;` if not present). Register both in the existing `.invoke_handler(tauri::generate_handler![…])` list alongside `load_corpus`.
  - **Verify**: `grep -c 'fn load_sidecar' src-tauri/src/lib.rs` → 1; `grep -c 'fn save_sidecar' src-tauri/src/lib.rs` → 1; `grep -c 'load_sidecar, *save_sidecar\|save_sidecar, *load_sidecar\|load_corpus, *load_sidecar' src-tauri/src/lib.rs` ≥ 1.
  - **Accept**: both commands compile-plausible per the snippet (atomic write via tmp+rename) and are registered in the invoke handler.
  - **Commit**: `git add src-tauri/src/lib.rs && git commit -m "feat(tauri): D1.T load_sidecar/save_sidecar commands"`.

- [ ] **D1.U sidecar unit tests** — files: `tests/sidecarDb.test.ts` (new) — entities: `SIDECAR_SCHEMA_SQL`
  - **Do**: create `tests/sidecarDb.test.ts` (`node:test` + `node:assert/strict`, style of existing tests). Because `SidecarDb.open()` is browser/Tauri-bound, test the schema + row shapes headlessly with `node:sqlite`: `import { DatabaseSync } from 'node:sqlite';` and `import { SIDECAR_SCHEMA_SQL } from '../src/core/data/sidecarDb.ts';`. Tests: (1) 'schema applies clean' — `new DatabaseSync(':memory:')`, `db.exec(SIDECAR_SCHEMA_SQL)`, assert the five tables exist via `SELECT name FROM sqlite_master WHERE type='table'`; (2) 'tombstone columns present' — PRAGMA table_info on `annotations`, `homilies`, `journal_entries`, `theme_spans` each contains columns `id, device_id, updated_at, deleted_at`; (3) 'homily base-vs-year' — insert two homilies same `liturgical_key='Pent06-0'`, one `year NULL` one `year 2026`, assert both selectable and distinguishable by `year IS NULL`.
  - **Verify**: `grep -c 'SIDECAR_SCHEMA_SQL' tests/sidecarDb.test.ts` ≥ 2; `grep -c "node:sqlite" tests/sidecarDb.test.ts` → 1.
  - **Accept**: three tests as specified, no browser APIs touched.
  - **Commit**: `git add tests/sidecarDb.test.ts && git commit -m "test(sidecar): D1.U schema + tombstone + base-vs-year"`.

- [ ] **D2 Calendar indicators + theme-span bars** — files: `src/ui/CalendarView.tsx` — entities: `CalendarView`, `SidecarDb`
  - **Do**: edit `src/ui/CalendarView.tsx`. Extend props with `sidecar: SidecarDb | null` and `onOpenPlanner?: (iso: string) => void` (`import type { SidecarDb } from '../core/data/sidecarDb.ts';` — I-10(b)). Inside the month render, when `sidecar` is non-null: (1) build `const anns = sidecar.listAnnotations();` and a Map liturgical-day→colors: an annotation's `nodeKey` (`section:<path>#<Section>`) maps to a calendar day when `<path>` equals that day's resolved `winner?.key` or `temporaPath` (the component already resolves each cell's day via `resolveDay`); for each matching cell add `<span className="cal-dot" style={{ background: colorOf(a.color) }} />` in a `.cal-indicators` row and add class `cal-cell--annotated` (its glow is styled by the E theme task; use the class, not inline shadow). Map annotation color names to CSS: `gold → var(--accent)`, otherwise the raw color string. (2) homily/journal status: `sidecar.listHomilies()` — a cell whose day's `winner?.key ?? temporaPath` equals a homily's `liturgicalKey` (and `year` null or equal to the cell's year) gets `<span className="cal-status cal-status--<status>" />` (three status modifiers exactly: `unstarted`, `in-progress`, `complete`). (3) theme spans: for each `sidecar.listThemeSpans()` whose `[startDate, endDate]` intersects the rendered month, on every covered cell render `<span className="cal-themespan" style={{ background: t.color }} title={t.label} />` positioned at the cell's bottom edge (continuous bar effect comes from adjacent cells sharing the color). (4) double-click (or a small `✎` button) on a cell calls `onOpenPlanner?.(iso)`.
  - **Verify**: `grep -c 'cal-themespan' src/ui/CalendarView.tsx` ≥ 1; `grep -c 'cal-status--' src/ui/CalendarView.tsx` ≥ 1; `grep -c 'onOpenPlanner' src/ui/CalendarView.tsx` ≥ 2; `grep -c 'listThemeSpans' src/ui/CalendarView.tsx` → 1.
  - **Accept**: cells show annotation dots, homily status chips, and theme-span bars from real sidecar rows; all features no-op cleanly when `sidecar` is null.
  - **Commit**: `git add src/ui/CalendarView.tsx && git commit -m "feat(calendar): D2 sidecar indicators + theme-span bars"`.

- [ ] **D3 PlannerView (homily planner / journal)** — files: `src/ui/PlannerView.tsx` (new) — entities: `PlannerView`
  - **Do**: create `src/ui/PlannerView.tsx` exporting default `PlannerView` with props `{ db: CorpusDb; sidecar: SidecarDb; mode: UserMode; initialDate?: string }` (imports from `../core/data/corpusDb.ts`, `../core/data/sidecarDb.ts`, `../core/data/types.ts`, `../core/data/liturgicalDay.ts`, `./HomilyEditor.tsx` — I-10(b)). Layout `className="content planner"`: (1) a month grid (reuse the same month-math approach as CalendarView: state `ym`, prev/next buttons — self-contained here, do NOT import CalendarView) where each cell shows: day number, the resolved day's `season` as a left color bar (`seasonColor` comes through `resolveDay(db, iso).color`), homily/journal status chip (`cal-status--unstarted|in-progress|complete` for the row whose `liturgicalKey` matches `winner?.key ?? temporaPath`), and any theme-span bar (same rule as D2). (2) **Theme painting**: a 'Paint theme' toggle button; when active, mouse-down on a cell then drag to another cell selects an inclusive date range; on mouse-up prompt inline (small form, not `window.prompt`) for `label` + `color` (8 fixed swatches: `#8c2d3c #c9a227 #3f7a52 #5d3a80 #2c6e8a #b4653a #6b6b6b #a03e78`) + cadence (`weekly`/`daily`), then `sidecar.upsertThemeSpan({...})` and `sidecar.persist()`. Existing spans list in a side rail with delete (`deleteRow('theme_spans', id)`). (3) Clicking a cell opens `<HomilyEditor db={db} sidecar={sidecar} mode={mode} day={resolveDay(db, iso)} onClose={…} />` as an overlay. (4) All labels vocabulary-switch on `mode`: priest → 'Homily', 'Series'; laity → 'Journal entry', 'Topic'. Uses `mode` prop only — no settings reads here.
  - **Verify**: `grep -c 'export default function PlannerView' src/ui/PlannerView.tsx` → 1; `grep -c 'upsertThemeSpan' src/ui/PlannerView.tsx` ≥ 1; `grep -c 'HomilyEditor' src/ui/PlannerView.tsx` ≥ 2; `grep -c "mode === 'priest'" src/ui/PlannerView.tsx` ≥ 1.
  - **Accept**: month grid with season bars + status chips; drag-paint creates persisted theme spans rendered as bars; cell click opens the editor; laity/priest vocabulary switches.
  - **Commit**: `git add src/ui/PlannerView.tsx && git commit -m "feat(planner): D3 planner grid + theme painting"`.

- [ ] **D6 HomilyEditor / journal editor** — files: `src/ui/HomilyEditor.tsx` (new) — entities: `HomilyEditor`
  - **Do**: create `src/ui/HomilyEditor.tsx` exporting default `HomilyEditor` with props `{ db: CorpusDb; sidecar: SidecarDb; mode: UserMode; day: DayInfo; onClose: () => void }` (type imports per sibling-module names; I-10(b)). Overlay `className="editor-overlay"` containing `className="editor"` split-pane: LEFT header + metadata — day title (`day.feastName ?? day.weekKey`), `day.season`, `day.color` swatch, and the day's readings pulled live: `db.getMassTexts(day.winner?.key ?? day.temporaPath)` filtered to sections `Lectio` and `Evangelium`, each shown as its first `!`-citation line (the line starting with `!`) or first 120 chars. Priest mode: base-vs-this-year toggle — two tabs 'Base (every year)' / `String(currentYear)`; the record loaded/saved is `sidecar.listHomilies(liturgicalKey, tabYear)[0]` where `liturgicalKey = day.winner?.key ?? day.temporaPath` and `tabYear` is `null` for Base; status select (`unstarted / in-progress / complete`). Laity mode: single `JournalEntry` for (`liturgicalKey`, `day.date`); an 'Anchors' chip list showing `anchors[]` strings with an add-field (free text, e.g. a verse ref or a `section:` nodeKey). RIGHT: `<textarea className="editor-md">` bound to `bodyMd` + `title` input above it. Save button → `upsertHomily`/`upsertJournalEntry` then `sidecar.persist()` then `onClose()`; Cancel → `onClose()`. No markdown preview in this task (plain textarea is the v0.2 editor).
  - **Verify**: `grep -c 'export default function HomilyEditor' src/ui/HomilyEditor.tsx` → 1; `grep -c 'upsertHomily' src/ui/HomilyEditor.tsx` ≥ 1; `grep -c 'upsertJournalEntry' src/ui/HomilyEditor.tsx` ≥ 1; `grep -c 'Base (every year)' src/ui/HomilyEditor.tsx` → 1.
  - **Accept**: split-pane editor with live readings header; priest base/year overlay semantics exactly as specified; laity journal with anchors; saves persist.
  - **Commit**: `git add src/ui/HomilyEditor.tsx && git commit -m "feat(planner): D6 homily/journal split-pane editor"`.

## Phase E — Theme system

- [ ] **E1 Theme registry + applyTheme** — files: `src/core/theme/themes.ts` (new) — entities: `ThemeFamily`, `ThemeMode`, `THEME_FAMILIES`, `applyTheme`
  - **Do**: create `src/core/theme/themes.ts`:
    ```ts
    export type ThemeFamily = 'glass-acrylic' | 'glass-clear' | 'skeuomorphic' | 'retro-futurist' | 'brutalist' | 'neo-brutalist';
    export type ThemeMode = 'light' | 'dark';
    export const THEME_FAMILIES: { id: ThemeFamily; label: string }[] = [
      { id: 'skeuomorphic', label: 'Parchment (skeuomorphic)' },
      { id: 'glass-acrylic', label: 'Glass — acrylic' },
      { id: 'glass-clear', label: 'Glass — clear' },
      { id: 'retro-futurist', label: 'Retro-futurist' },
      { id: 'brutalist', label: 'Brutalist' },
      { id: 'neo-brutalist', label: 'Neo-brutalist maximalist' },
    ];
    export const DEFAULT_FAMILY: ThemeFamily = 'skeuomorphic';
    export function systemMode(): ThemeMode { return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    export function applyTheme(family: ThemeFamily, mode: ThemeMode): void {
      document.documentElement.dataset.theme = family;
      document.documentElement.dataset.mode = mode;
    }
    ```
    Exactly these exports, nothing else.
  - **Verify**: `grep -c 'export function applyTheme' src/core/theme/themes.ts` → 1; `grep -c 'neo-brutalist' src/core/theme/themes.ts` ≥ 2; `grep -c 'prefers-color-scheme' src/core/theme/themes.ts` → 1.
  - **Accept**: file content per spec, byte-equivalent modulo whitespace.
  - **Commit**: `git add src/core/theme/themes.ts && git commit -m "feat(theme): E1 theme registry + applyTheme"`.

- [ ] **E2 styles.css: semantic tokens, 12 theme blocks, print stylesheet, new-component styles** — files: `src/styles.css` — entities: semantic tokens, theme blocks, `@media print`
  - **Do**: edit `src/styles.css`. (1) **Tokens**: ensure `:root` defines semantic tokens `--surface` (page bg), `--surface-2` (cards/rail), `--ink`, `--ink-soft`, `--accent`, `--card-border`, `--rail-bg`, `--pane-latin-bg`, `--pane-english-bg` — set them from the CURRENT parchment palette (the existing colors become the `skeuomorphic light` values); replace hard-coded color literals in component rules with these tokens wherever a literal matches a token's role (backgrounds, text ink, borders, rail). Seasonal accent stays driven by the existing `html[data-color=…]` rules — do not merge it into the theme tokens. (2) **Theme blocks**: add 12 blocks `html[data-theme='<family>'][data-mode='<light|dark>'] { … }`, families `skeuomorphic, glass-acrylic, glass-clear, retro-futurist, brutalist, neo-brutalist`, each overriding ONLY the semantic tokens (plus for the two glass families a `--glass-blur: saturate(140%) blur(14px)` (acrylic) / `blur(6px)` (clear) custom prop consumed by `.rail`/`.exegesis`/`.ctx-menu`/`.lore-callout` via `backdrop-filter: var(--glass-blur, none)`). Design intents: skeuomorphic = current parchment (light) and a candlelit dark parchment; glass = translucent surfaces over a deep gradient bg; retro-futurist = phosphor-teal/amber on dark chrome + light chrome variants; brutalist = flat white/black, hard 2px borders, no radius (add `--radius: 0` token consumed where border-radius is currently set; default `--radius: 10px`); neo-brutalist = saturated clashing accents (#ff5d73/#ffd23f/#2ec4b6), thick offset shadows. `data-mode` dark variants darken `--surface*` and lighten `--ink*`; `--pane-latin-bg`/`--pane-english-bg` must remain subtly darker than `--surface` in light modes and subtly lighter in dark modes. (3) **New-component styles**: add rules for `.lore-callout` (fixed position, width 360px, max-height 44vh, `overflow: auto` on `.lore-body`, surface-2 bg, card border, soft shadow), `.cal-indicators`, `.cal-dot` (8px round), `.cal-status--unstarted|in-progress|complete` (grey ring / amber half / green full), `.cal-themespan` (absolute, bottom 2px, height 5px, full cell width), `.cal-cell--annotated` (token-tinted glow), `.planner`, `.editor-overlay` (fixed inset-0, backdrop dim), `.editor` (split-pane grid `1fr 1.2fr`, surface-2), `.editor-md` (monospace, 100% height), `.theme-picker` (rail block: family select + light/dark toggle). (4) **Print (F1)**: `@media print { … }` — hide `.rail`, `.masthead`, `.ctx-menu`, `.exegesis`, `.lore-callout`, buttons; `.content { overflow: visible; height: auto }`; `.bilingual` becomes two clean serif columns with black ink on white regardless of theme; page margins via `@page { margin: 18mm }`.
  - **Verify**: `grep -c "data-theme='" src/styles.css` → 12; `grep -c '@media print' src/styles.css` → 1; `grep -c -- '--surface:' src/styles.css` ≥ 13; `grep -c 'lore-callout' src/styles.css` ≥ 1; `grep -c 'cal-themespan' src/styles.css` ≥ 1.
  - **Accept**: 12 complete theme blocks overriding tokens only; components consume tokens; print stylesheet per spec; existing look preserved as skeuomorphic-light default.
  - **Commit**: `git add src/styles.css && git commit -m "feat(theme): E2 token system, 12 themes, print stylesheet"`.

- [ ] **E3 ThemePicker rail control** — files: `src/ui/ThemePicker.tsx` (new) — entities: `ThemePicker`
  - **Do**: create `src/ui/ThemePicker.tsx` exporting default `ThemePicker` with props `{ sidecar: SidecarDb | null }` (`import type { SidecarDb } from '../core/data/sidecarDb.ts';` `import { THEME_FAMILIES, DEFAULT_FAMILY, applyTheme, systemMode, type ThemeFamily, type ThemeMode } from '../core/theme/themes.ts';` — I-10(b)). State: `family` (init: sidecar `getSetting('theme.family')` cast if valid, else `DEFAULT_FAMILY`), `mode` (init: `getSetting('theme.mode')` if `'light'|'dark'`, else `systemMode()`). `useEffect` on both → `applyTheme(family, mode)` and, when sidecar non-null, `setSetting('theme.family', family)` + `setSetting('theme.mode', mode)` + `sidecar.persist()`. Render `<div className="theme-picker">` with a `<select>` over `THEME_FAMILIES` and a light/dark toggle button (`☀︎`/`☾`).
  - **Verify**: `grep -c 'export default function ThemePicker' src/ui/ThemePicker.tsx` → 1; `grep -c 'applyTheme' src/ui/ThemePicker.tsx` ≥ 2; `grep -c "getSetting('theme.family')" src/ui/ThemePicker.tsx` → 1.
  - **Accept**: picker applies + persists theme, respects system preference when unset, no-ops persistence when sidecar null.
  - **Commit**: `git add src/ui/ThemePicker.tsx && git commit -m "feat(theme): E3 ThemePicker"`.

## Phase F — Print, export & share

- [ ] **F2 Exporters** — files: `src/core/export/exporters.ts` (new) — entities: `ExportOpts`, `exportHtml`, `exportMarkdown`, `exportJson`, `downloadFile`
  - **Do**: create `src/core/export/exporters.ts` (`import type { DayInfo, ReaderEntry } from '../data/types.ts';` `import type { Annotation } from '../annotations/store.ts';`). Exports exactly: `export interface ExportOpts { includeAnnotations: boolean; annotations: Annotation[] }`; `export function exportHtml(day: DayInfo, entries: ReaderEntry[], opts: ExportOpts): string` — a complete standalone HTML document string: `<title>` = `${day.feastName ?? day.weekKey} — ${day.date}`, inline `<style>` (serif, two-column `.bilingual` grid, citation lines italic), header (title, season, date, color), then per entry `<section>` with `<h3>{displayTitle}</h3>` + Latin and English `<div>`s (skip null sides), and — when `opts.includeAnnotations` — an annotations appendix listing `quote` + `note` grouped under the entry whose `nodeKey` matches; `export function exportMarkdown(day, entries, opts): string` — `# {title}` header, `## {displayTitle}` per section, Latin blockquote then English paragraph, `---`-separated annotations appendix; `export function exportJson(day, entries, opts): string` — `JSON.stringify({ day, entries, annotations: opts.includeAnnotations ? opts.annotations : undefined }, null, 2)`; `export function downloadFile(name: string, mime: string, content: string): void` — Blob + object URL + a temporary `<a download>` click + revoke.
  - **Verify**: `grep -c 'export function export' src/core/export/exporters.ts` → 3; `grep -c 'export function downloadFile' src/core/export/exporters.ts` → 1; `grep -c 'includeAnnotations' src/core/export/exporters.ts` ≥ 3.
  - **Accept**: four exports with exactly these signatures; HTML export is standalone (no external refs).
  - **Commit**: `git add src/core/export/exporters.ts && git commit -m "feat(export): F2 html/md/json exporters"`.

- [ ] **F3 Share payload + deep links** — files: `src/core/share/shareLink.ts` (new), `tests/shareLink.test.ts` (new) — entities: `SharePayload`, `buildShareUrl`, `parseDeepLink`
  - **Do**: create `src/core/share/shareLink.ts`:
    ```ts
    export interface SharePayload { view: string; date: string; section?: string; quote?: string }
    export function buildShareUrl(p: SharePayload, base?: string): string {
      const u = new URL(base ?? (typeof location !== 'undefined' ? location.origin + location.pathname : 'https://missal.local/'));
      u.searchParams.set('view', p.view); u.searchParams.set('date', p.date);
      if (p.section) u.searchParams.set('section', p.section);
      if (p.quote) u.searchParams.set('quote', p.quote.slice(0, 500));
      return u.toString();
    }
    export function parseDeepLink(search: string): SharePayload | null {
      const q = new URLSearchParams(search);
      const view = q.get('view'); const date = q.get('date');
      if (!view || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
      if (!['map', 'reader', 'calendar', 'office', 'planner'].includes(view)) return null;
      return { view, date, section: q.get('section') ?? undefined, quote: q.get('quote') ?? undefined };
    }
    ```
    Create `tests/shareLink.test.ts` (`node:test`, strict assert): (1) round-trip — `parseDeepLink(new URL(buildShareUrl({view:'reader',date:'2026-07-05',section:'Introitus',quote:'Dóminus'} , 'https://x.test/')).search)` deep-equals the payload; (2) bad date rejected — `parseDeepLink('?view=reader&date=07-05-2026')` → null; (3) unknown view rejected — `parseDeepLink('?view=admin&date=2026-07-05')` → null.
  - **Verify**: `grep -c 'export function parseDeepLink' src/core/share/shareLink.ts` → 1; `grep -c 'searchParams.set' src/core/share/shareLink.ts` → 4; `grep -c 'parseDeepLink' tests/shareLink.test.ts` ≥ 3.
  - **Accept**: module + 3 tests exactly as specified.
  - **Commit**: `git add src/core/share/shareLink.ts tests/shareLink.test.ts && git commit -m "feat(share): F3 share payload + deep links"`.

## Phase G — Entitlements (architecture now, gating later)

- [ ] **G1 Entitlement module (all-ungated)** — files: `src/core/entitlements/index.ts` (new), `.env.example` — entities: `FeatureId`, `FEATURE_GATES`, `initEntitlements`, `useEntitlement`, `EntitlementGate`
  - **Do**: create `src/core/entitlements/index.ts` (React import only):
    ```ts
    export type FeatureId = 'homily-planner' | 'journal' | 'themes-premium' | 'export' | 'share' | 'office';
    /** feature → required RevenueCat entitlement id, or null = ungated. v0.2 ships ALL null (G3). */
    export const FEATURE_GATES: Record<FeatureId, string | null> = { 'homily-planner': null, journal: null, 'themes-premium': null, export: null, share: null, office: null };
    let activeEntitlements: Set<string> = new Set();
    let initialized = false;
    /** RevenueCat is the single entitlement authority. apiKey null/absent ⇒ everything ungated. No key is ever hardcoded. */
    export async function initEntitlements(apiKey: string | null): Promise<void> {
      initialized = true;
      if (!apiKey) return; // ungated build
      // RevenueCat Web Billing/Purchases wiring lands when gating is decided (G3);
      // this seam is the ONLY place that will change: fetch customer info → fill activeEntitlements.
    }
    export function hasEntitlement(f: FeatureId): boolean {
      const req = FEATURE_GATES[f];
      return req === null || activeEntitlements.has(req);
    }
    export function useEntitlement(f: FeatureId): boolean { return hasEntitlement(f); }
    export function EntitlementGate({ feature, children, fallback = null }: { feature: FeatureId; children: React.ReactNode; fallback?: React.ReactNode }): React.ReactNode {
      return hasEntitlement(feature) ? children : fallback;
    }
    ```
    (add `import type React from 'react';`; keep `initialized` read via a `export function entitlementsReady(): boolean { return initialized; }`). In `.env.example` (create if absent) add the line `VITE_REVENUECAT_API_KEY=rcb_xxxxxxxxxxxxxxxxxxxxxxxx` with a comment `# RevenueCat public API key — leave empty for a fully ungated build`.
  - **Verify**: `grep -c 'export const FEATURE_GATES' src/core/entitlements/index.ts` → 1; `grep -c ': null' src/core/entitlements/index.ts` ≥ 6; `grep -c 'VITE_REVENUECAT_API_KEY' .env.example` → 1; `grep -rc 'rcb_' src/ | grep -v ':0' | wc -l` → 0 (no key in source).
  - **Accept**: gate map is the only edit point for future tiers; everything evaluates ungated today; no secret material in `src/`.
  - **Commit**: `git add src/core/entitlements/index.ts .env.example && git commit -m "feat(entitlements): G1 gate map + RevenueCat seam (all ungated)"`.

- [ ] **G2 Entitlement sync bridge spec** — files: `DOCS/ENTITLEMENT-SYNC.md` (new) — entities: spec document
  - **Do**: write `DOCS/ENTITLEMENT-SYNC.md` — the interface spec (no implementation in this repo) for the server-side bridge that makes RevenueCat the single entitlement truth while accepting BTCPay (BTC on-chain + Lightning) and WooCommerce purchases. Required sections: **Roles** (client asks only RevenueCat; bridge is the only writer of non-store entitlements); **Endpoints** — `POST /webhooks/btcpay` and `POST /webhooks/woocommerce`, each: HMAC signature verification (BTCPay `BTCPay-Sig` sha256; Woo `X-WC-Webhook-Signature` base64 sha256) over the raw body with per-source secrets from env (`BTCPAY_WEBHOOK_SECRET`, `WOO_WEBHOOK_SECRET`); **Idempotency** — dedup ledger keyed by `(source, event_id)`, replay-safe, at-least-once tolerated; **Grant flow** — map product/price id → RevenueCat entitlement id via a version-controlled `grants.json`, then RevenueCat REST `POST /v1/subscribers/{app_user_id}/entitlements/{entitlement_id}/promotional` (or the current granting API) with expiry per purchased term; **Health** — `GET /healthz`, structured logs per event (received/verified/deduped/granted/failed); **Failure policy** — verify-fail → 401 drop; RC-API-fail → durable retry queue with backoff; **Env** — `REVENUECAT_SECRET_KEY`, per-source secrets, `PORT` (high, non-patterned). Close with: deployment is a separate repo/service; this app never grants entitlements client-side.
  - **Verify**: `grep -c 'BTCPay-Sig' DOCS/ENTITLEMENT-SYNC.md` → 1; `grep -c 'X-WC-Webhook-Signature' DOCS/ENTITLEMENT-SYNC.md` → 1; `grep -c 'promotional' DOCS/ENTITLEMENT-SYNC.md` ≥ 1; `grep -c 'healthz' DOCS/ENTITLEMENT-SYNC.md` → 1.
  - **Accept**: all required sections present; spec is implementable without asking questions.
  - **Commit**: `git add DOCS/ENTITLEMENT-SYNC.md && git commit -m "docs(entitlements): G2 BTCPay/Woo → RevenueCat bridge spec"`.

## Integration (single owner of shared shell files)

- [ ] **APP.1 App shell integration** — files: `src/App.tsx` — entities: `App`, `View`, `NAV`, `SidecarDb`, `PlannerView`, `ThemePicker`, `parseDeepLink`, `migrateLocalStorageAnnotations`
  - **Do**: edit `src/App.tsx` (all sibling imports are I-10(b); exact module paths: `./core/data/sidecarDb.ts`, `./ui/PlannerView.tsx`, `./ui/ThemePicker.tsx`, `./core/share/shareLink.ts`, `./core/entitlements/index.ts`, `./core/data/types.ts`). (1) `View` union becomes `'map' | 'reader' | 'calendar' | 'office' | 'planner'`; append to `NAV`: `{ id: 'planner', ico: '✎', label: 'Planner' }`. (2) New state `const [sidecar, setSidecar] = useState<SidecarDb | null>(null);` — in the boot effect, after the corpus opens: `SidecarDb.open().then(async (s) => { await migrateLocalStorageAnnotations(s); setSidecar(s); }).catch(() => setSidecar(null));` (sidecar failure must NOT block the corpus UI). (3) Mode: `const mode: UserMode = (sidecar?.getSetting('mode') as UserMode) ?? 'laity';` — planner NAV label shows 'Planner' (priest) / 'Journal' (laity); add a small mode toggle inside the day-chip footer that calls `sidecar?.setSetting('mode', next)` + `persist()` and re-renders (state mirror). (4) Deep link: before first render (a `useState` initializer), `const dl = parseDeepLink(location.search);` — when non-null seed `view` (cast), `date`, and if `dl.section` seed `focus = { section: dl.section, nonce: 1 }`. (5) `initEntitlements(import.meta.env.VITE_REVENUECAT_API_KEY ?? null)` fire-and-forget in the boot effect. (6) Render: `view === 'planner' && db && sidecar && <PlannerView db={db} sidecar={sidecar} mode={mode} initialDate={date} />` (when sidecar is null show a one-line `.content` notice that user-data storage is unavailable); pass new props `sidecar={sidecar}` and `onOpenPlanner={(iso) => { setDate(iso); setView('planner'); }}` to `CalendarView`; change `OfficeView` usage to `<OfficeView db={db} day={day} onAction={setAction} />`; mount `<ThemePicker sidecar={sidecar} />` in the rail above the day-chip.
  - **Verify**: `grep -c "'planner'" src/App.tsx` ≥ 3; `grep -c 'SidecarDb.open' src/App.tsx` → 1; `grep -c 'parseDeepLink' src/App.tsx` ≥ 2; `grep -c 'ThemePicker' src/App.tsx` ≥ 2; `grep -c 'migrateLocalStorageAnnotations' src/App.tsx` ≥ 1.
  - **Accept**: planner view routed; sidecar boot never blocks corpus; deep links seed initial state; theme picker mounted; OfficeView receives db/onAction.
  - **Commit**: `git add src/App.tsx && git commit -m "feat(app): APP.1 planner/sidecar/theme/deep-link integration"`.

- [ ] **APP.2 Reader export/share controls** — files: `src/ui/SectionReader.tsx` *(header controls only — coordinate: this file is created by B3.1; this task ADDS a toolbar and must be dispatched in the SAME worktree/wave slot as B3.1 or applied as a follow-up commit in that worktree)* — entities: `exporters`, `buildShareUrl`
  - **Do**: in `src/ui/SectionReader.tsx` add an optional prop `toolbar?: { day: DayInfo; view: string } | undefined`. When set, render a small `.reader-toolbar` row (before the entries): buttons `⎙ Print` → `window.print()`; `HTML` / `MD` / `JSON` → `downloadFile(...)` with `exportHtml/exportMarkdown/exportJson(toolbar.day, entries, { includeAnnotations: true, annotations: entries.flatMap((e) => annotationsFor(e.nodeKey)) })`, file name `missal-${toolbar.day.date}.{html,md,json}`; `🔗 Share` → `navigator.clipboard.writeText(buildShareUrl({ view: toolbar.view, date: toolbar.day.date, section: focusSection ?? undefined, quote: window.getSelection()?.toString().slice(0, 200) || undefined }))` with a transient 'copied ✓' state. Imports: `../core/export/exporters.ts`, `../core/share/shareLink.ts` (I-10(b)).
  - **Verify**: `grep -c 'reader-toolbar' src/ui/SectionReader.tsx` ≥ 1; `grep -c 'buildShareUrl' src/ui/SectionReader.tsx` ≥ 1; `grep -c 'exportMarkdown' src/ui/SectionReader.tsx` ≥ 1.
  - **Accept**: toolbar renders only when `toolbar` prop provided; print/export/share all functional against real entries.
  - **Commit**: `git add src/ui/SectionReader.tsx && git commit -m "feat(reader): APP.2 print/export/share toolbar"`.

## Post-wave verification (orchestrator/verifier only — not coder tasks)

- [ ] **W1** Full suite: `npm test` → all green (existing 16 + B2.2 + D1.U + F3 additions).
- [ ] **W2** Build: `npm run build` → exit 0. (First compile of the assembled wave; individual tasks never compile.)
- [ ] **W3** Playwright pass: office hour texts render (Laudes, 2026-07-05); lore callout on station + curve hover; planner paint + editor save + calendar indicators; each of the 12 themes applies (`data-theme`/`data-mode` attributes + token change assertion); print stylesheet (emulate media print); export files non-empty; share URL round-trips into a seeded view. Screenshots to `.tmp/w3-*.png`.
- [ ] **W4** Stanza-level entity comparison per I-22 against `DOCS/ARCHITECTURE.md` §8, then flip verified tasks `[X]→✅` with evidence lines.

## Phase M — Ever-present map strip (HelloWord parity + Office extension)

_Operator directive 2026-07-11: the always-visible subway map at the top of the app (HelloWord's defining affordance — sticky header, `ActualLiturgicalApp.tsx:2168-2219`) was lost in the rewrite; restore its mechanism with our theming. Vertical layouts acceptable where responsive design wants them. The same treatment extends to the breviary (novel — HelloWord had none). Contract: `DOCS/ARCHITECTURE.md` Decision 17 + §8 entity rows (`MapStrip`, `MapFlyout`, `stripStations`, `stationForAnchor`, `stationIncipits`, `STATION_INFO`/`HOUR_INFO`, `massTextsForDay`, `dateForWeekKey`)._

- ✅ **M1 Strip model helpers** — files: `src/core/model/massOrdo.ts`, `tests/mapStrip.test.ts` (new) — entities: `stripStations`, `stationForAnchor`
  _Evidence 2026-07-11: `node --test tests/mapStrip.test.ts` → 5/5 pass (Lent tract/alleluia switch, Paschal doubled alleluia, slot ordering, skeleton-only, anchor inversion incl. `ordo:` and numbered forms)._
  - **Do**: append two exported functions. `stripStations(season: Season): Station[]` — `trunkOf('catechumens').filter(s => !s.detail)` with `branchOf('chant').filter(s => stationActive(s, season))` spliced in immediately after the `lectio` station, followed by `trunkOf('faithful').filter(s => !s.detail)`. `stationForAnchor(anchor: string): string | null` — `"ordo:<Sec>"` → first non-detail station id with `ORDO_STATION_SECTION[id] === Sec` (fall back to any); otherwise match `sectionKey === anchor` exactly, then with a trailing ` 2`/` 3` stripped; null if none.
  - **Verify**: `npm test` green incl. new `tests/mapStrip.test.ts`: strip for 'Lent' contains `tractus` not `alleluia`; strip for 'Paschaltide' contains `graduale-p`; `stationForAnchor('ordo:Canon') === 'canon'`; `stationForAnchor('Oratio 2') === 'oratio'`; `stationForAnchor('ordo:Kyrie') === 'kyrie'`.
- ✅ **M2 MapStrip component + styles** — files: `src/ui/MapStrip.tsx` (new), `src/styles.css` — entities: `MapStrip`
  _Evidence 2026-07-11: dev-server walkthrough via chrome-devtools — strip on reader/calendar/office (suppressed on the full-map view and, ≥981px, on office where the side loop shows — operator directive); 20 stations at Pentecost-season date; seg colors + day-accent rings observed; strip scrolls internally (scrollWidth 1188 > clientWidth 696, docOverflow 0 after `.main{min-width:0}` fix)._
  - **Do**: horizontal strip: station buttons over per-segment colored line (`--line-catechumens` → `--line-faithful`; `--line-office` for the office variant), proper stations = interchange rings in `var(--accent)`, ordinary = ink-ring dots, conditional = dashed ring; index-based past/active/future (active gets pulse halo, future dimmed, seasonally-inactive faded + unclickable); tiny uppercase truncated labels; `overflow-x: auto` with hidden scrollbar; office variant renders `OFFICE_CURSUS` with active-hour ring. `.main` grid becomes `auto auto 1fr`.
  - **Verify**: strip visible on all four views in the dev server; segment colors and day-accent rings correct; horizontal scroll on narrow viewport.
- ✅ **M3 Reader scroll-spy** — files: `src/ui/ReaderView.tsx` — entities: `ReaderView`
  _Evidence 2026-07-11: scrollTo(0) → active = Iudica me; scrollTo(end) → active = Ultimum Evangelium; station click scrolls target section to container top (observed offsets 2–6px = intended padding) with no marker flicker._
  - **Do**: optional prop `onVisibleSection?: (anchor: string) => void`; IntersectionObserver over `section[data-section]` (root = the scrolling `.content`, rootMargin `'-20% 0px -65% 0px'`, threshold 0) calling it with the intersecting anchor; guard-ref timestamp set by the focus-scroll effect (+900 ms) suppresses observer echoes during programmatic scrolls.
  - **Verify**: scrolling the reader moves the strip's you-are-here marker; clicking a strip station scrolls the reader without marker flicker.
- ✅ **M4 App shell wiring** — files: `src/App.tsx`, `src/ui/OfficeView.tsx` — entities: `MapStrip`, `OfficeView`
  - **Do**: App state `activeStation: string | null` (station clicks set it; `onVisibleSection` maps anchors through `stationForAnchor`) and `officeHour: string` (default `'laudes'`); `<MapStrip …/>` rendered directly after `.masthead`; OfficeView becomes controlled (`hour`/`onHour` replace internal `sel` state).
  - **Verify**: `npm test`; dev-server walkthrough: strip on every view; station click from calendar/office lands in reader at the right section; office strip ↔ loop selection stays in sync; back navigation unaffected.
  _Evidence 2026-07-11: npm test 44/44 by session end (37 pre-existing + 5 mapStrip + 2 computus); loop click Vesperae → strip active "Vesperae"; strip click Matutinum → hour card "Matutinum"; calendar-view station click landed in reader with strip marker set._

- ✅ **M5 Map flyouts (hover/focus)** — files: `src/core/model/stationLore.ts` (new), `src/core/data/stationIncipits.ts` (new), `src/ui/MapFlyout.tsx` (new), `src/ui/MapStrip.tsx`, `src/ui/SubwayMap.tsx`, `src/styles.css` — entities: `STATION_INFO`, `HOUR_INFO`, `stationIncipits`, `MapFlyout`
  _Operator directive: hover flyout on subway maps + breadcrumb strip showing section, first few words, description, and a media slot; dual-language by default. Shipped: strip stations, office hours (lazy `buildHour` incipit) and full-map rows (event delegation on `data-sid`); flyout = Latin+English incipit of the day's real text (English-missing explicitly flagged), 1–2-sentence `about`, planned-media slot (flagged, never fabricated). Evidence: hover Introitus → "Sapiéntia réddidit…"/"Wisdom rendered…"; Canon/Kyrie ordinaries dual-language; Evangelium on full map with video badge; zero console errors._
- ✅ **M6 Media inventory** — files: `DOCS/MEDIA-PLAN.md` (new)
  _39 assets enumerated (31 stations + 8 hours; 19 video, 20 photo), IDs matching `STATION_INFO`/`HOUR_INFO`, production brief per row, all `needed`._
- ✅ **M7 Human search references + in-context open** — files: `src/ui/MeaningPanel.tsx`, `src/App.tsx`, `src/core/calendar/computus.ts` — entities: `MeaningPanel`, `dateForWeekKey`
  _Operator directive: vector/concordance references must be human-understandable and clickable to display in context. Shipped: `humanRef` (section — feast title · "May 1"/week-key/Commune/Office·…) and `onOpenKey` now navigates to the SOURCE day (Sancti → month-day; Tempora → `dateForWeekKey` inversion; Horas → office view at the named hour). Evidence: hit "Lectio2 — S. Joseph Sponsi B.M.V. · May 1 ↗" click → date 2026-05-01, masthead S. Joseph Opificis (1962 occurrence — rubrical reality), reader open, white accent._
- ✅ **M8 Operator-reported fixes (live session 2026-07-11)** — files: `src/ui/ReaderView.tsx`, `src/ui/OfficeView.tsx`, `src/ui/MapStrip.tsx`, `src/core/calendar/computus.ts`, `src/core/data/liturgicalDay.ts`, `vite.config.ts`
  _(a) Strip auto-center now scrolls only its own container (was cancelling the reader's smooth scroll). (b) Reader focus-scroll is explicit `scrollTo` on the container (scrollIntoView landed inconsistently). (c) `seasonColor` title fallback knows Sanguinis/Crucis/Passion/Apostoli/Evangelistæ→red, Cathedra/Mariæ/Angeli→white — July 1 (Precious Blood, color column NULL) now red; tests added. (d) Reader filters seasonal chant switch sections (GradualeP no longer renders in July). (e) `massTextsForDay`: Tempora ferias whose file has Office but no Mass sections delegate to the week's Sunday ("de Dominica"), honestly labelled via sourcePath — fixes empty feria readers and empty proper incipits. (f) Reader + office section headings are accordions (▾/▸, focus-nav auto-unfolds). (g) vite watch excludes VENDORED/ (ENOSPC watcher exhaustion). Evidence: computus tests 6/6 incl. new color+dateForWeekKey cases; 2026-07-11 feria reader shows Pent06-0 Mass labelled `Tempora/Pent06-0`; accordion fold/unfold verified in browser._

## Backlog (next major — unchanged)
- [ ] Real sentence-transformer embeddings (schema model-agnostic).
- [ ] Fine-tuned ecclesiastical-Latin LLM behind the Meaning panel.
- [ ] Full DO-engine hour construction (psalm schema per weekday/rank) replacing pattern-based assembly.
- [ ] Sidecar sync transport (multi-device / parish groups).
- [ ] Signed Android staging/production builds per the all-projects signing SOP.

---

# v0.3 — Office-generation engine (THE PRODUCT CORE; contract: DOCS/ARCHITECTURE.md §7.5)

**Operator directives recorded verbatim-in-substance (2026-07-06):** (1) full Divine Office generation is the product — HelloWord was the Mass-only PoC this app completes; NOTHING office-related is out of scope or "later". (2) Role/form rubrics ship at DO-provided granularity (Celebrans/Diaconus/Subdiaconus/Ministri; lecta vs sollemnis from Ordo.txt `!` prose; Cantata = derived display; external-manual M-C/laity lenses = next major). (3) Missing-material routes, priority order: **S** scripture-first Vulgate/DR lookup (primary preferred) → **A** DO-internal substitution + in-style cross-translation → **C** our-licensed generation (two-step when neither language exists); all supplied text flagged + lighter-ink/tinted-bg rendering. (4) One-time ingestion; runtime DB distributed offline-first (bundled in installers; fast-follow download optional). (5) Release gated by DOCS/TEST_RUBRIC.md gauntlet + screencast + manual artifact set (apk, aab, symbols zip, deb, AppImage, exe, msi, MSIX code-readiness attestation).

**Status: stanzas scoped; NOT yet expanded to self-contained coder tasks.** Next architect action (TC13): expand each stanza below into wholly self-contained parallel tasks in the v0.2-wave format above (inline signatures/DDL/anchors, hermetic Verify, per-task commit), using ARCHITECTURE §7.5 as the entity source. Formats of all source tables verified 2026-07-06; a working normalization prototype exists at `.tmp/office-schema-demo.mjs` (ephemeral — reference logic, not project source; NOTE: invitatories live in `Matutinum Special.txt`, not Major Special).

## Stanza O-A — Ingest v3: office plane
_2026-07-11 status: OA.1–OA.3 shipped (deviations per ARCHITECTURE §8 entity rows: skeletons from `horas/Ordinarium`, seasonal sets via ordinary section tables); plus the calendar plane the spec presupposed — Kalendaria chain + Transfer tables + 1960 conditional realization at ingest. Verified: `npm test` 22/22 incl. tests/office.test.ts baselines; live 1:1 harness `scripts/verify-calendar.mjs` 40/40 vs divinumofficium.com._
- [X] **OA.1** `scripts/ingest-office.mjs`: `OFFICE_SCHEMA_SQL` (§7.5 DDL verbatim) + normalize `Psalmi {major,matutinum,minor}.txt` → `office_psalm_schema`/`office_nocturn_versicle` (Latin+English trees merged; festal brackets flagged).
- [X] **OA.2** Skeletons: `Special/{Matutinum,Major,Minor,Prima} Special.txt` + `Preces.txt` → `office_skeleton` (verbatim lines; directive/condition flags).
- [X] **OA.3** Seasonal sets: invitatories (`Matutinum Special.txt` `[Invit*]`), `Mariaant.txt`, `Doxologies.txt`, `Benedictions.txt` → `office_seasonal`.
- [ ] **OA.4** `role_rubrics` from missa `Ordo.txt` `!` prose: role + form classification per sentence subject (Celebrans/Diaconus/Subdiaconus/Ministri; `si est Missa sollemnis / si privata` → form), `source_line` provenance.
- [ ] **OA.5** Resolution routes S→A→C over the missing-reference register + translation census; write `meta.translationSupplied`; regenerate `DOCS/MISSING-REFERENCES.md`; fix the ~45 `transform-skipped` xform-parser gaps in `do-parse.mjs`. Accept: shipped `textus deest` = 0.
  _2026-07-11 operator-observed evidence (GradualeP Latin-only on 07-01): translation census run over Mass propers (Sancti+Tempora) — Latin-only rows per section: Communio 79/348, Offertorium 78/342, Evangelium 71/369, Secreta 67/402, Oratio 66/505, Postcommunio 65/405, Introitus 59/334, Lectio 55/356, Graduale 50/353, GradualeP 34/65, Tractus 26/62. Gap is corpus-wide, worst ratio on the paschal/penitential chants._
- [ ] **OA.6** Ingest tests: schema-table row counts ≥ demo baselines (257/24/3427/22 Latin-side), Day0 Laudes1 = 92/99/62/210/148, invitatory seasonal keys present, role_rubrics provenance non-null.

## Stanza O-B — Runtime engine
_2026-07-11 status: engine shipped as `src/core/liturgy/conditionals.ts` (OB.1 grammar, full DO SetupString port) + `src/core/office/engine.ts` (OB.2 runtime macro/psalm resolution + OB.3 buildHour); OB.4 golden battery started in tests/office.test.ts (6 tests: schema baselines, Sunday Lauds/Matins, feast Vespers, Compline Marian antiphon, 8-hours×5-dates no-placeholder sweep)._
- [X] **OB.1** `src/core/office/types.ts` (`MassForm`, `RoleLens`, `OfficeOpts`, `OfficeCtx`) + `conditions.ts` (`evalCondition` — grammar per §7.5, rubricSet fixed '1960').
- [X] **OB.2** (in engine.ts) `src/core/office/resolve.ts` (`resolveDirectiveRuntime` — graph-backed `@`/`&`/`$` + routes S/A/C fallthrough).
- [X] **OB.3** `src/core/office/engine.ts` (`OfficeEngine.buildHour` — 7-step algorithm §7.5; commemoration rule also resolves the Octava placeholder cluster).
- [/] **OB.4** Golden tests: the TEST_RUBRIC §O battery dates (O-2 Sunday Lauds psalmody, O-3 ferial, O-6 Nativity, O-9 Lent, O-10/11 Paschal, O-12 Marian antiphon windows) asserted headlessly against `missal.db`.

## Stanza O-C — Presentation tray + rubric layers
- [ ] **OC.1** `src/ui/TrayPanel.tsx` (slide-out; theme/mode relocated here; massForm/roleLens/rubrics-visible/typeface/size; sidecar persistence; settings keys per ARCHITECTURE §7).
- [ ] **OC.2** Reader/Office rubric layer: render `role_rubrics` rows per active form; role lens highlights (never hides); `--supplied-ink`/`--supplied-bg` tokens in all 12 theme blocks; bundled local fonts (serif liturgical default, sans, dyslexia-friendly).
- [X] **OC.3** OfficeView switches (directly to `OfficeEngine.buildHour`; the interim `HOUR_SECTION_PATTERNS` layer was never needed) — OfficeView switches from `HOUR_SECTION_PATTERNS` assembly to `OfficeEngine.buildHour` (patterns remain the engine's proper-section selection layer).

## Stanza O-D — Gauntlet + release (after ALL v0.2 + v0.3 tasks ✅)
- [ ] **OD.1** Run DOCS/TEST_RUBRIC.md in full; screencast per TC11 → `dist/rubric-runs/`; run report + attestation → `dist/`.
- [ ] **OD.2** Manual artifact set staged in canonical `dist/` per I-25: apk + aab + native-debug-symbols zip; deb + AppImage; exe (NSIS) + msi (WiX, windows runner); MSIX code-readiness attestation; `v{VERSION}:` stamped commit; ecosystem production key signing.

---

# v0.4 wave — Bible + Accompaniment plane (ARCHITECTURE §7.6, entity rows P-S)

**Status: stanzas scoped; NOT yet expanded to self-contained coder tasks.** Next architect action (TC13): expand each stanza into wholly self-contained parallel tasks in the v0.2-wave format (inline signatures/DDL/anchors, hermetic Verify, per-task commit), using ARCHITECTURE §7.6 as the entity source. Operator decisions recorded 2026-07-12: (1) one object, four exposures — journal/homily/study/newsletter are differentially-exposed Accompaniments, never separate types; (2) themes are free-form user vocabulary (Commune/concepts = autocomplete suggestions only); (3) chat = the CompanionEngine (not a separate engine) with SOUL.md-style lore memory, journey-companion emphasis; (4) newsletter exposure + ParishProfile header space = institutional entitlement; (5) displayed liturgical text never normalized to verse refs (adapted quotations; prayed text normative) — only `meta.filled` gap-fills become verse references; (6) sidecar becomes SQLite via sql.js (collinear rule extended to user data).

## Stanza B-A — Ingest Pass 4: Bible corpus
- ✅ **BA.1** `scripts/ingest-bible.mjs`: `BOOK_MAP` (73 books, DR↔vul↔canonical key) + book/chapter/verse nodes, bilingual `text_blocks`, `HAS_CHAPTER`/`HAS_VERSE` edges, verse FTS rows, verse embeddings. _2026-07-12: 73 books / 1,291 chapters / 35,934 verses; vul.tsv lacks Tob/Judith/Sap/Eccli/Bar → Latin NULL there (English-only) until a complete Clementine source is vendored; Ps numbering LXX both sources (verified Ps 22). db 97.6→139.5 MB — exceeds GitHub 100 MB blob limit, distribution decision pending (LFS vs stop-committing-db; ingest is deterministic in-repo)._
- [/] **BA.2** `CITES` edges liturgical-section→verse-range from the existing citation parse, meta `{quality: exact|adapted}`; gap-filled (`meta.filled`) scripture becomes verse references (dedup; fill log rows now cite verse nodes). _2026-07-12: CITES shipped (32,830 edges from 7,959 sections, quality meta verified). Remaining: (a) fill-as-verse-reference; (b) REVERSE-fill (operator directive): where a Latin liturgical section CITES an English-only verse (vul.tsv lacks Tob/Judith/Sap/Eccli/Bar) with quality=exact, the section's Latin fills the verse (`meta.filled`, provenance = the .txt section) — the liturgy's own references keep supplying those books._
- [ ] **BA.3** `reading_plans`/`plan_day` tables + two seed plans (liturgical-year-aligned, canonical whole-Bible).
- ✅ **BA.4** `tests/bible.test.ts`: 73 books; canon verse counts per book; Gen 1:1 exact la+en; CITES spot checks; fill-log delta review (Bible pass adds zero fill rows). _2026-07-12: 7 tests; suite 51/51; fill log delta = zero._

## Stanza B-B — BibleView + deep links
- [ ] **BB.1** `CorpusDb.getBooks/getChapter/getVerseRange/citationsOf` (signatures per entity row).
- [ ] **BB.2** `src/ui/BibleView.tsx` — rail "Sacred Scripture"; book/chapter nav; bilingual verse reader (SectionReader patterns); selection → MeaningPanel; CITES "appears in the liturgy" panel.
- [ ] **BB.3** Deep-link routes on `shareLink.ts` (P-F extension): `#/verse/…`, `#/acc/…`, `#/day/…`, `#/section/…` wired into App's layered back-nav.

## Stanza B-C — Accompaniment model + sidecar v2 + editor
- [ ] **BC.1** `src/core/accompaniment/types.ts` (`Accompaniment`, `OccurrenceSelector`, `Exposure`) + `store.ts` (`SIDECAR_SCHEMA_SQL_V2`, `SidecarDb` v2, platform byte-persistence web OPFS/IndexedDB + Tauri `load_sidecar`/`save_sidecar`); annotations-localStorage migration (old key read-only).
- [ ] **BC.2** `resolve.ts`: `accompanimentsForDay`/`forAnchor`/`matchesSelector` over computus + recurrence rules.
- [ ] **BC.3** `AccompanimentEditor.tsx` (TipTap; body_pm + body_html snapshot).
- [ ] **BC.4** `tests/accompaniment.test.ts`: selector resolution incl. moveable feasts across year boundaries; migration; free-form theme tags.

## Stanza B-D — Exposure surfaces
- [ ] **BD.1** `JournalView` (date timeline; day-chip today's entries).
- [ ] **BD.2** `HomilyPlanner` (selector-projected planning calendar; supersedes PlannerView/HomilyEditor rows).
- [ ] **BD.3** `StudyBuilder` (class centroid: recurrence group + anchors + materials; print stylesheet handouts).
- [ ] **BD.4** `NewsletterDesk` behind `EntitlementGate('newsletter-desk')` + `parish_profile` masthead (name/logo/letterhead/colors/address); print + email-ready HTML export + share link.

## Stanza B-E — Daily reading programming
- [ ] **BE.1** Reading-plan surfaces: today's readings on map/home + reading_progress in sidecar; feeds widget + companion context.

## Stanza B-F — Haydock commentary
- [ ] **BF.1** Vendor `VENDORED/haydock/` (clone-at-home, PROVENANCE.md lock BEFORE assimilation) + ingest pass → verse-keyed commentary blocks; read-only layer in BibleView; `vendored` inserts in StudyBuilder.

## Stanza B-G — Shares
- [ ] **BG.1** Highlight/accompaniment share: body_html snapshot + deep link via navigator.share/copy; standroid.robin.mba resolves.

## Stanza B-H — Android widget
- [ ] **BH.1** `MissalWidgetProvider.kt` (today's feast + readings; deep-link intent; data JSON + daily refresh); PWA shortcuts on web. Device render = TEST_RUBRIC operator row.

## Stanza B-I — Companion (journey companion + lore memory)
- [ ] **BI.1** `CompanionEngine` interface + `OnDeviceEngine` (LiteRT-LM Gemma 4 E2B; WebGPU on web) + `HostedEngine` (metered proxy); entitlement-selected tier; trial = client-side cap on activation.
- [ ] **BI.2** `CompanionMemory`: lore table + distillation loop (idle/save; size-capped; user-visible/editable) + vector recall over `sidecar_embeddings` (embedText) fused with theme/date facets.
- [ ] **BI.3** `CompanionView` rail chat: context = persona+lore+memories+position+CITES; replies cite deep links; save-insight → accompaniment(`generated`).
- [ ] **BI.4** RC config against contract vocabulary (`companion_ondevice`, `companion_hosted`, `institutional`) via RC plugin/MCP or dashboard (key per I-15); `FeatureId` gates wired. On-device model run = TEST_RUBRIC operator row.
