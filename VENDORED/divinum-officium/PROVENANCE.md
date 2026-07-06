# PROVENANCE — divinum-officium (vendored snapshot)

Per Admin-Manual vendoring policy (I3 — Single-Master Additive Stewardship: trust
roots are ours), this is a **full, untracked snapshot** of the upstream repository.
It does not track upstream; no submodule, no remote. All future changes to these
files are local, deliberate, and logged below.

## Snapshot

| Field | Value |
| --- | --- |
| Upstream | https://github.com/DivinumOfficium/divinum-officium |
| Pinned commit | `f3b8a3f26191915f7cacf691315361a7a5b0242c` |
| Upstream commit date | 2026-07-04 14:30:11 -0400 |
| Upstream commit subject | Merge pull request #5367 from FAJ-Munich/varia |
| Snapshot taken | 2026-07-05 |
| Method | `git clone --depth 1`, `.git` stripped, full tree copied |

## License

Upstream licensing is recorded verbatim from the repository at the pinned commit:
the project's text corpus and code are a mix of public-domain liturgical texts
and contributions under the upstream project's terms (see `README.md` and any
license notices within this tree — preserved unmodified). Nothing in this
snapshot alters upstream's licensing; local modifications below are offered
under the same terms as the files they modify.

## What this snapshot is used for

- `web/www/missa/` — Mass propers (Tempora/Sancti/Commune) + Ordinary (`Latin/Ordo/`, `English/Ordo/`)
- `web/www/horas/` — Divine Office: Psalterium, hour texts, Commune/Sancti/Tempora
- Parsed by `scripts/ingest-corpus.mjs` into `assets/missal.db`. **No build step
  refers outside this repository.**

## Local modification log

Every local edit to a vendored file MUST be recorded here (file, date, reason).
Scriptural gap-fills performed automatically at ingest are logged separately in
`DOCS/CORPUS-FILL-LOG.md` — they do not modify vendored files.

| Date | File | Reason |
| --- | --- | --- |
| — | — | (none yet) |
