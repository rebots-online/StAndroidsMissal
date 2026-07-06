# The Divinum Officium Flat-Text Schema — and How To Modify It Locally

The liturgical corpus is the vendored snapshot at `VENDORED/divinum-officium/`
(see its `PROVENANCE.md`). `scripts/ingest-corpus.mjs` parses the flat-text
tree into `assets/missal.db`. Nothing refers outside this repository.

## Tree layout (what the ingest reads)

| Corpus path key | Source in vendored tree |
| --- | --- |
| `Tempora/<f>`, `Sancti/<f>` | `web/www/missa/<lang>/{Tempora,Sancti}/<f>.txt` (merged with same-path horas file when both exist) |
| `Commune/<f>` | `web/www/horas/<lang>/Commune/<f>.txt` (the Commune serves both Mass and Office) |
| `Psalterium/<rel>` | `web/www/horas/<lang>/Psalterium/**.txt` |
| `Ordo/Missae` | `web/www/missa/<lang>/Ordo/Ordo.txt` (`#`-heading format) |
| `Horas/Tempora/<f>`, `Horas/Sancti/<f>` | `web/www/horas/<lang>/{Tempora,Sancti}/<f>.txt` |

Languages: `Latin` (normative) and `English`, merged into bilingual
`text_blocks`. A missing English file simply yields `english = NULL`.

## File format

```
[SectionName] (optional qualifier)
content lines …
```

- **`[Section]` headers** — one per section; an optional parenthesized
  qualifier (e.g. `(communi Summorum Pontificum)`) is preserved in the section
  node's `meta.qualifier`.
- **`!` lines** — scripture citations (`!Ps 27:8-9`) or rubrics. The reader
  styles them as citations; the ingest treats a citation with no following
  text as an *orphan* and gap-fills it (see below).
- **`v.` / `V.` / `R.` / `S.` / `M.`** — speaker/verse markers, kept verbatim.
- **`[Rank]`** — `name;;class;;num;;extra`, e.g. `;;Duplex;;3;;vide C4b`.
  `num` is the precedence rank (float). A `vide <C-ref>` names the Commune
  file that supplies missing sections → `CROSS_REF` edge.
- **`[Rule]`** — rubrical switches (Gloria, Credo, `Prefatio=…`, `vide C4b;`).
  Stored as a meta section; `vide` here also produces the `CROSS_REF`.

## Directives (resolved inline at ingest)

| Directive | Meaning | Graph edge |
| --- | --- | --- |
| `@Path/File` | include the *same-named* section from another file | `INCLUDES` |
| `@Path/File:Section` | include a specific section | `INCLUDES` |
| `@Path/File:Section:xform` | include + transform: a line range (`2-4`), one or more `s/…/…/` substitutions, or both (`1 s/a/b/`) | `INCLUDES` |
| `&Name` / `$Name` | expand a named prayer from `missa/<lang>/Ordo/Prayers.txt` (falling back to `horas/<lang>/Psalterium/Common/Prayers.txt`) | `EXPANDS` |
| `&psalm(N)` | insert Psalm N from `Psalterium/Psalmorum/PsalmN.txt` | `EXPANDS` |

Unknown engine-function macros (hour-construction calls that only make sense
at office-assembly time) are kept as italic rubric markers `![Name]` and
logged.

## Gap-fill policy (V0.7 — generation never breaks)

Occasional hiccoughs exist in the corpus: directives whose targets are
missing (e.g. `@Sancti/12-25:Octava` where no `[Octava]` exists), or
citations with the quoted text still missing. Resolution chain:

1. **Same section elsewhere** — the include path is retried against both the
   `missa` and `horas` trees (they share path space).
2. **The file's `vide` Commune** — the section is sought in the cross-ref'd
   Commune file.
3. **Vendored scripture** — if a citation can be parsed, the verse text is
   served from `VENDORED/vulgate-clementina/vul.tsv` (Latin) or
   `VENDORED/douay-rheims/EntireBible-DR.json` (English).
4. **Placeholder** — `![Section — Path (textus deest)]`, clearly marked.

Every fill is recorded in **`DOCS/CORPUS-FILL-LOG.md`** (regenerated each
ingest) with the broken directive verbatim, the resolution, the filled
content, its citation, and the supplying source. Filled sections carry
`meta.filled = true` on their graph node so the UI can indicate supplied text.

## Modifying the vendored corpus locally

1. Edit the `.txt` file(s) under `VENDORED/divinum-officium/web/www/…`
   directly — this snapshot is ours; there is no upstream to conflict with.
2. Record every modification in the **Local modification log** table of
   `VENDORED/divinum-officium/PROVENANCE.md` (file, date, reason).
3. Re-run `npm run ingest` and review `DOCS/CORPUS-FILL-LOG.md` — a good
   modification usually *removes* fill-log rows.
4. Run `npm test` (parser + corpus invariants must hold).

## Output schema (`assets/missal.db`)

- `nodes(kind ∈ {file, section}, key, title, category, rank_class, rank_num, color, meta)`
  — keys `file:<path>` / `section:<path>#<Section>`.
- `edges(src, dst, rel ∈ {HAS_SECTION, CROSS_REF, INCLUDES, EXPANDS}, meta)` —
  directive text preserved in `meta.directive`.
- `text_blocks(node_id, section, latin, english)` — resolved bilingual text.
- `embeddings(node_id, dim, vec)` — 128-d hashed-trigram int8, Latin normative.
- `search` — FTS5 over `(key, section, content)`, meta sections excluded.
