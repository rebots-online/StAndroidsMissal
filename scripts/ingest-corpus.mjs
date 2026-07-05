/**
 * ingest-corpus — transform the resolved Divinum Officium corpus
 * (HelloWord liturgical.db: do_files / do_sections) into St. Android's
 * Missal graph + vector database (assets/missal.db).
 *
 *   node --experimental-strip-types scripts/ingest-corpus.mjs \
 *     [/path/to/liturgical.db] [assets/missal.db]
 *
 * Graph realization of László Kiss' flat-text directives:
 *   - each source file  → node  kind='file'    key='file:<path>'
 *   - each section      → node  kind='section' key='section:<path>#<key>'
 *   - file ─HAS_SECTION→ section
 *   - "[Rank] … vide C10 / ex C2" cross-refs → file ─CROSS_REF→ file:Commune/C10
 *     (meta records the directive verbatim)
 *   - Latin + English language rows merge into one bilingual text_block
 *     (Latin normative)
 *   - every section gets a deterministic 128-d int8 embedding
 *   - FTS5 `search` table over (key, section, content) for the concordance
 *
 * Phase 2 adds INCLUDES (@file:section) and EXPANDS ($/& macro) edges from the
 * raw DO tree; the resolved DB no longer contains those directives.
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { embedText, EMBED_DIM } from '../src/core/vector/embed.ts';

const SRC = process.argv[2] ?? '../HelloWord/liturgical-api/assets/liturgical.db';
const OUT = process.argv[3] ?? 'assets/missal.db';

const src = new DatabaseSync(resolve(SRC), { readOnly: true });
mkdirSync(dirname(resolve(OUT)), { recursive: true });
const out = new DatabaseSync(resolve(OUT));

out.exec(`
  PRAGMA journal_mode = MEMORY;
  PRAGMA foreign_keys = OFF;
  DROP TABLE IF EXISTS search;
  DROP TABLE IF EXISTS embeddings;
  DROP TABLE IF EXISTS text_blocks;
  DROP TABLE IF EXISTS edges;
  DROP TABLE IF EXISTS nodes;
  CREATE TABLE nodes (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    title TEXT,
    category TEXT,
    rank_class TEXT,
    rank_num REAL,
    color TEXT,
    meta TEXT
  );
  CREATE TABLE edges (
    id INTEGER PRIMARY KEY,
    src INTEGER NOT NULL REFERENCES nodes(id),
    dst INTEGER NOT NULL REFERENCES nodes(id),
    rel TEXT NOT NULL,
    weight REAL NOT NULL DEFAULT 1.0,
    meta TEXT
  );
  CREATE INDEX idx_nodes_kind ON nodes(kind);
  CREATE INDEX idx_edges_src ON edges(src, rel);
  CREATE INDEX idx_edges_dst ON edges(dst, rel);
  CREATE TABLE text_blocks (
    node_id INTEGER PRIMARY KEY REFERENCES nodes(id),
    section TEXT NOT NULL,
    latin TEXT,
    english TEXT
  );
  CREATE TABLE embeddings (
    node_id INTEGER PRIMARY KEY REFERENCES nodes(id),
    dim INTEGER NOT NULL,
    vec BLOB NOT NULL
  );
  CREATE VIRTUAL TABLE search USING fts5(key, section, content);
`);

const insNode = out.prepare(
  'INSERT INTO nodes (kind, key, title, category, rank_class, rank_num, color, meta) VALUES (?,?,?,?,?,?,?,?)',
);
const insEdge = out.prepare('INSERT INTO edges (src, dst, rel, weight, meta) VALUES (?,?,?,?,?)');
const insText = out.prepare('INSERT INTO text_blocks (node_id, section, latin, english) VALUES (?,?,?,?)');
const insEmb = out.prepare('INSERT INTO embeddings (node_id, dim, vec) VALUES (?,?,?)');
const insFts = out.prepare('INSERT INTO search (key, section, content) VALUES (?,?,?)');

// ── 1. File nodes ─────────────────────────────────────────────────
const files = src.prepare('SELECT * FROM do_files').all();
const fileNodeId = new Map(); // path → node id
out.exec('BEGIN');
for (const f of files) {
  const r = insNode.run(
    'file',
    `file:${f.path}`,
    f.title ?? f.office_name ?? f.path,
    f.category,
    f.rank_class ?? null,
    f.rank_num ?? 0,
    f.color ?? null,
    JSON.stringify({ office_name: f.office_name ?? null, cross_ref: f.cross_ref ?? null }),
  );
  fileNodeId.set(f.path, Number(r.lastInsertRowid));
}

// ── 2. CROSS_REF edges from "vide C10" / "ex C2" directives ──────
let crossRefCount = 0;
for (const f of files) {
  if (!f.cross_ref) continue;
  const firstLine = String(f.cross_ref).split('\n')[0].trim();
  const m = firstLine.match(/(?:vide|ex)\s+((?:Commune\/)?C\d+\w*)/i);
  if (!m) continue;
  const communePath = m[1].startsWith('Commune/') ? m[1] : `Commune/${m[1]}`;
  const dst = fileNodeId.get(communePath);
  if (!dst) continue;
  insEdge.run(fileNodeId.get(f.path), dst, 'CROSS_REF', 1.0, JSON.stringify({ directive: firstLine }));
  crossRefCount++;
}

// ── 3. Section nodes, bilingual text blocks, embeddings, FTS ─────
// do_sections carries one row per language; merge Latin + English.
const sections = src
  .prepare("SELECT file_id, section, language, content FROM do_sections ORDER BY file_id, section, language")
  .all();
const fileById = new Map(files.map((f) => [f.id, f]));
const fileByPath = new Map(files.map((f) => [f.path, f]));
const merged = new Map(); // "path#section" → { path, section, latin, english }
for (const s of sections) {
  const f = fileById.get(s.file_id);
  if (!f) continue;
  const k = `${f.path}#${s.section}`;
  let entry = merged.get(k);
  if (!entry) {
    entry = { path: f.path, section: s.section, latin: null, english: null };
    merged.set(k, entry);
  }
  const lang = String(s.language ?? '').toLowerCase();
  if (lang === 'la' || lang.startsWith('lat')) entry.latin = s.content;
  else entry.english = entry.english ? `${entry.english}\n${s.content}` : s.content;
}

// Metadata sections carry rubrical bookkeeping, not prayed text — keep them
// in text_blocks/graph but out of the similarity/concordance space.
const META_SECTIONS = new Set(['Rank', 'Rule', 'Name', 'Officium', 'Missa', 'Prelude', 'Comment', 'Rank1960', 'RankNewcal']);

let sectionCount = 0;
for (const e of merged.values()) {
  const key = `section:${e.path}#${e.section}`;
  const fid = fileNodeId.get(e.path);
  const r = insNode.run('section', key, e.section, fileByPath.get(e.path)?.category ?? null, null, null, null, null);
  const nid = Number(r.lastInsertRowid);
  insEdge.run(fid, nid, 'HAS_SECTION', 1.0, null);
  insText.run(nid, e.section, e.latin, e.english);
  // Latin is normative — embed it when present; FTS indexes both languages.
  const isMeta = META_SECTIONS.has(e.section);
  const embedSource = isMeta ? '' : (e.latin ?? e.english ?? '');
  const ftsSource = isMeta ? '' : [e.latin, e.english].filter(Boolean).join('\n');
  if (embedSource.trim()) {
    const vec = embedText(embedSource);
    insEmb.run(nid, EMBED_DIM, Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength));
  }
  if (ftsSource.trim()) insFts.run(key, e.section, ftsSource);
  sectionCount++;
}
out.exec('COMMIT');
out.exec('VACUUM');

const counts = {
  files: files.length,
  sections: sectionCount,
  crossRefEdges: crossRefCount,
  embeddings: out.prepare('SELECT COUNT(*) c FROM embeddings').get().c,
  edges: out.prepare('SELECT COUNT(*) c FROM edges').get().c,
};
console.log('ingest complete:', JSON.stringify(counts, null, 2));

// Mirror to public/ so the web build serves the same bytes the native build embeds.
try {
  copyFileSync(resolve(OUT), resolve('public/missal.db'));
  console.log('copied →', resolve('public/missal.db'));
} catch (err) {
  console.warn('public copy skipped:', err.message);
}
