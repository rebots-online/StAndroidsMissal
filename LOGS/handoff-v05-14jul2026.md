# Orchestrator handoff — v0.5 wave (2026-07-14, Fable→GLM-5.2)

**You are the orchestrator for the v0.5 presentation & meaning plane.** Contract: `DOCS/ARCHITECTURE.md` §7.7 (fourth re-attestation) + `CHECKLIST.md` "v0.5 wave" stanzas B-J…B-O. Operator approved the full plan (all six workstreams); execution is mid-flight. Run `/sesh resume` equivalent first (git log + CHECKLIST frontier is the truth); everything below was true at handoff time — **verify disk state before dispatching anything**, because one subagent was still running when this handoff was written.

## Done, committed, pushed (both remotes; HEAD `adc20316` at handoff)

| Commit | Content | Markers |
|---|---|---|
| `086f8e7f` | §7.7 contract + BJ–BO stanzas, 4th re-attestation | — |
| `594c2ddc` | BL.1/BL.2 clause focus + SimilarityGlyph + imagery concepts | BL.1 BL.2 `[X]` |
| `957f7517` | BC.1/BC.2/BC.4 sidecar v2 (store/resolve/Tauri cmds/tests) | `[X]` |
| `457c9277` | BJ.1–3 theme system + sanctissimissa + token refactor | `[X]` |
| `8265e90c` | BK.1/BK.2 BilingualText + mobile interleave + range echo | `[X]` |
| `c447a93d` | BM.1/2/4 + BM.3 code — Haydock+Catena vendored, commentary ingest, 79-pericope parallels | `[X]` |
| `adc20316` | Shared re-ingest: db 193 MB (LFS), 20,915 commentary nodes, 9,316 verse imagery edges (new ingest Pass 4b), fill-log delta zero | BL.3 BM.3 `[X]` |

Suite at handoff: **79/79**, `npx tsc -b` clean, `npm run build` clean.

## ~~In flight at handoff~~ RESOLVED before Fable signed off

C1 completed: `AccompanimentEditor.tsx`, `JournalSidecar.tsx` (+`ConnectionsPanel`), `JournalView.tsx`, `HomilyPlanner.tsx` all on disk, verified (tsc clean, suite 79/79), committed with the TipTap deps — BC.3/BO.2/BD.1/BD.2 flipped `[X]`. NOTE: that commit's package.json also carries the PRE-EXISTING stranded version-stamp (1.15.31005) + build-entrypoint script lines from a prior session (they match CLAUDE.md's documented entrypoints; committing them un-strands TC10 WIP — labeled in the commit message).

## Remaining work (in order)

1. **BO.1** — ReaderView + BibleView ctx-menus: "✎ Add to Journal/Homily notes" (opens JournalSidecar with quote + `alignSelection` counterpart + anchor nodeKey) and "🖍 Highlight both panes" (lightweight accompaniment quote+quoteAlt → renders via existing `mark.ann` in both panes; `quote_alt` column exists in sidecar v2).
3. **BO.3** — App integration (single owner of App.tsx): `View` + `'journal'`; NAV entry "Journal & Homilies" (✎); open SidecarDb at App level (`SidecarDb.open()` + `migrateLocalStorageAnnotations`) and thread `sidecar` to views; mount `ThemePicker` in the rail (init theme on boot from settings); `#/acc/<id>` hash route (completes BB.3 — see `parseHashRoute` in `src/core/share/shareLink.ts`); JournalView/HomilyPlanner as tabs of the journal view; JournalSidecar opens via the same `.split` layout MeaningPanel uses (`action` state gains a `capture` variant or a parallel state — architect's choice, document it).
4. **BN.1** — `src/ui/ScriptureAtlas.tsx` (`AtlasMode = 'canonical'|'imagery'|'parallels'`) + BibleView mode switch + commentary read-only layer beneath verses. Data is ALL live in the committed db: `CorpusDb.conceptVerseCounts()` (imagery counts, e.g. king_kingdom 2791), `chapterCiteCounts(book)`, `commentaryFor(book, ch, verse?)`, `PERICOPES`/`SCENARIO_CLUSTERS` in `src/core/ontology/parallels.ts` (Gospel keys `Matt/Marc/Luc/Joann`). CSS classes `.atlas-*` already in styles.css. Differential font sizing: `font-size ∝ √count` inline, weight ∝ CITES.
5. **Verification pass** — `npm test`, `npx tsc -b`, `npm run build`, then `npm run dev` browser pass: theme toggle (skeuomorphic/sanctissimissa × light/dark × seasonal colors), ≤1100px interleave with dual-language selection highlight, capture→edit→connect→destination round-trip persisting across reload (IndexedDB `standroidsmissal`/`blobs`/`sidecar.db`), MeaningPanel glyph+clause hits, Atlas modes click-through to `#/verse/…`, commentary under verses with source attribution.
6. **Commit/push discipline**: scoped per task, `[ ]→[X]` only after semantic verification (I-12 — no grep-as-done), push `origin` AND `github` every handback (TC10).

## Standing notes for the successor

- **Dirty working tree**: pre-existing modifications (icons, README, DOCS/BUILD.md, package.json version fields, computus.ts, OfficeView.tsx, vite.config.ts, tauri.conf.json, etc.) predate this wave — do NOT sweep them into v0.5 commits; scoped adds only.
- **RevenueCat**: MCP server registered user-scope (`https://mcp.revenuecat.ai/mcp`, Bearer key from `~/Admin-Manual/CREDENTIALS/RevenueCat/credentials.env`); project `projaba0bd94` now has app `app8f455368d3` (mba.robin.standroidsmissal) + entitlements `companion_ondevice`/`companion_hosted`/`institutional`; catalog doc updated+pushed. Devin-IDE RC work had landed nothing at check time — if it appears later, reconcile to THESE lookup keys. Products/offerings + public SDK key remain open under BI.4.
- **Known data gap (BA follow-up, not this wave):** `VENDORED/douay-rheims/EntireBible-DR.json` is missing trailing chapters in several books (Num 36, Jos 23–24, Judg 18–21, Ruth 3–4, Judith 12–16, Esth 11+, Eccli 49–51…), stranding 865 Haydock records as ingest skips; they attach automatically on re-ingest once the DR source is completed. Recorded in BM.3's checklist note.
- **Ingest**: deterministic, ~2 min; re-run only if you change concepts/commentary/parsers; fill-log delta must stay zero; db is LFS on forgejo only (never GitHub LFS — CC13).
- Plan file (operator-approved): `~/.claude/plans/can-you-create-an-jolly-simon.md`.

## Late additions (operator, end of Fable session)

- **v0.6 wave scoped** (CHECKLIST stanzas B-P/B-Q; ARCHITECTURE decisions 18+19): Android base corpus = fast-follow asset pack; **module system** (content modules = same-schema SQLite via `CorpusDb.attachModule`; feature modules = lazy rail routes; `MODULE_GATES` data-only); commentary leaves missal.db (base → ~140 MB) — **Haydock free sample**, rest gated on `study_library` (**RC `entl4b9a9925f8` created**); roadmap modules recorded (chant, Liber Usualis alignment, Publishing Desk, Latin lessons, choir media, altar-server training). **Portability mandate: module core is host-agnostic — practice run for EnZIME.** Stanzas are scoped, NOT expanded to coder tasks — that's an architect pass (TC13 pattern).
- **About links**: `src/core/model/appLinks.ts` + About card render two slots. App site = `https://sanctissimissa.online` (operator: this app rightfully usurps the domain from HelloWord — the DNS/nginx cutover on CT 123 to the standroid deploy is a pending ops task; **sanctissimissa.com** also belongs to this app — it resolves (104.158.190.71), pair it as redirect/alias at cutover). **Blog slot is '' (hidden) — ask the operator for the personal-blog URL and set it**; robin.mba is NOT it (verified: serves an unrelated page).
- RC catalog doc in Admin-Manual needs a `study_library` row appended (not yet done — one line).

— Handoff authored by Claude Fable 5 (claude-fable-5), orchestrator seat, at operator direction (Fable quota 86%). 2026-07-14.

## Doctrine recorded at sign-off (binding context for all v0.5/v0.6 decisions)

- **Incubator principle** (`~/forgejo/admin/DOCS/IDEOLOGIES/church-products-as-live-incubator.md`): this product line is the live guinea pig — any feature may ship free of charge; components are built host-agnostic to graduate (journal/homily → EnZIME's knowledge assistant; billing → the universal adapter; module system → shared core). Monetization pressure never blocks a feature here.
- **RC is a scaffold** (`~/.claude/BILLING_CONVENTIONS.md § Migration horizon`): bridge ledger must be transition-grade (state transitions, currency + alias mirroring); no RC-only feature without a mirroring plan.

## Infrastructure pointer — Postgres + agent-history warehouse (successor seats don't know this)

- **Postgres**: CT 112 on the Proxmox cluster → `192.168.0.249:5432`, user `admin` / `Ch4n3l.C` (LAN-only; credentials cleartext-canonical per I-15 — never mask/rotate/flag).
- **Planned (operator-approved direction, 2026-07-14, not yet built): `agent_history` database** — cross-host agent-transcript warehouse. Per-host systemd timer ingests append-only session JSONL (Claude Code `~/.claude/projects/**/*.jsonl`, codex `~/.codex/sessions/**`, opencode + crush logs) into one normalized table: `(host, tool, cwd, session_id, ts, role, content, meta jsonb)` + FTS index (optionally pgvector via the repo's deterministic `embedText`). Incremental by byte-offset state file; idempotent on `(host, tool, session_id, seq)`. Document schema + queries at `~/forgejo/admin/DOCS/TOOLING_CONVENTIONS/agent-history-warehouse.md` when built. LAN-only, never mirrored outward (transcripts contain cleartext credentials by doctrine). Do NOT ingest Pieces databases into it — the two layers stay complementary (Postgres = verbatim transcripts; Pieces = passive multi-modal capture).
