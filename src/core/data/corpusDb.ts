/**
 * CorpusDb — the single query layer over missal.db (sql.js), identical on
 * web and Tauri. Graph queries (nodes/edges), bilingual text retrieval with
 * non-inverted commune gap-filling, vector similarity, FTS concordance.
 */

import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { embedText, cosine } from '../vector/embed.ts';
import { MASS_SECTION_ORDER } from '../model/massOrdo.ts';
import type { GraphNode, SectionText, SimilarHit, ConcordanceHit, CrossRef } from './types.ts';
import type { DayFileMeta } from '../calendar/precedence.ts';

function rowToNode(r: Record<string, unknown>): GraphNode {
  let meta: Record<string, unknown> = {};
  try {
    meta = r.meta ? JSON.parse(String(r.meta)) : {};
  } catch {
    meta = {};
  }
  return {
    id: Number(r.id),
    kind: String(r.kind) as GraphNode['kind'],
    key: String(r.key),
    title: (r.title as string) ?? null,
    category: (r.category as string) ?? null,
    rankClass: (r.rank_class as string) ?? null,
    rankNum: Number(r.rank_num ?? 0),
    color: (r.color as string) ?? null,
    meta,
  };
}

export class CorpusDb {
  private db: Database;

  private constructor(db: Database) {
    this.db = db;
  }

  /** Embedding cache: node key → Int8Array, loaded lazily on first similarity query. */
  private vectors: { key: string; section: string; vec: Int8Array }[] | null = null;

  static async open(bytes: Uint8Array): Promise<CorpusDb> {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    return new CorpusDb(new SQL.Database(bytes));
  }

  private all(sql: string, params: unknown[] = []): Record<string, unknown>[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
      return rows;
    } finally {
      stmt.free();
    }
  }

  getFileNode(path: string): GraphNode | null {
    const rows = this.all('SELECT * FROM nodes WHERE key = ?', [`file:${path}`]);
    return rows.length ? rowToNode(rows[0]) : null;
  }

  /** All Sancti file nodes for MM-DD (incl. v/r variants), rank DESC. */
  getSanctiForDate(month: number, day: number): GraphNode[] {
    const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return this.all(
      "SELECT * FROM nodes WHERE kind='file' AND (key = ? OR key LIKE ?) ORDER BY rank_num DESC",
      [`file:Sancti/${mmdd}`, `file:Sancti/${mmdd}%`],
    ).map(rowToNode);
  }

  asDayMeta(n: GraphNode | null): DayFileMeta | null {
    if (!n) return null;
    return {
      key: n.key.replace(/^file:/, ''),
      title: n.title ?? (n.meta.office_name as string | null),
      rankClass: n.rankClass,
      rankNum: n.rankNum,
      color: n.color,
    };
  }

  /** Raw section texts of one corpus file, keyed by DO section name. */
  private sectionsOf(path: string): Map<string, { latin: string | null; english: string | null }> {
    const rows = this.all(
      `SELECT tb.section, tb.latin, tb.english
       FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
       WHERE n.key LIKE ?`,
      [`section:${path}#%`],
    );
    const map = new Map<string, { latin: string | null; english: string | null }>();
    for (const r of rows) {
      map.set(String(r.section), {
        latin: (r.latin as string) ?? null,
        english: (r.english as string) ?? null,
      });
    }
    return map;
  }

  /** CROSS_REF target (commune path) of a file node, if any. */
  communeOf(path: string): string | null {
    const rows = this.all(
      `SELECT n2.key FROM edges e
       JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
       WHERE e.rel = 'CROSS_REF' AND n1.key = ?`,
      [`file:${path}`],
    );
    return rows.length ? String(rows[0].key).replace(/^file:/, '') : null;
  }

  /**
   * Mass texts for a corpus file in canonical order.
   * Non-inverted commune gap-fill: sections present in the feast file always
   * win; only MISSING Mass sections come from the CROSS_REF commune.
   */
  getMassTexts(path: string): SectionText[] {
    const own = this.sectionsOf(path);
    const communePath = this.communeOf(path);
    const commune = communePath ? this.sectionsOf(communePath) : null;
    const out: SectionText[] = [];
    for (const section of MASS_SECTION_ORDER) {
      const ownText = own.get(section);
      const communeText = commune?.get(section);
      const chosen = ownText ?? communeText;
      if (!chosen || (!chosen.latin && !chosen.english)) continue;
      const fromCommune = !ownText && !!communeText;
      const sourcePath = fromCommune ? (communePath as string) : path;
      out.push({
        nodeKey: `section:${sourcePath}#${section}`,
        section,
        latin: chosen.latin,
        english: chosen.english,
        sourcePath,
        fromCommune,
      });
    }
    return out;
  }

  /** Graph edges out of / into a file node. */
  crossRefs(path: string): CrossRef[] {
    return this.all(
      `SELECT n1.key fromKey, n2.key toKey, e.rel, e.meta, n2.title toTitle
       FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
       WHERE e.rel = 'CROSS_REF' AND (n1.key = ? OR n2.key = ?)`,
      [`file:${path}`, `file:${path}`],
    ).map((r) => {
      let directive: string | null = null;
      try {
        directive = r.meta ? (JSON.parse(String(r.meta)).directive ?? null) : null;
      } catch {
        directive = null;
      }
      return {
        fromKey: String(r.fromKey),
        toKey: String(r.toKey),
        rel: String(r.rel),
        directive,
        toTitle: (r.toTitle as string) ?? null,
      };
    });
  }

  private loadVectors(): { key: string; section: string; vec: Int8Array }[] {
    if (this.vectors) return this.vectors;
    const rows = this.all(
      `SELECT n.key, n.title section, e.vec FROM embeddings e JOIN nodes n ON n.id = e.node_id`,
    );
    this.vectors = rows.map((r) => {
      const raw = r.vec as Uint8Array;
      return {
        key: String(r.key),
        section: String(r.section ?? ''),
        vec: new Int8Array(raw.buffer, raw.byteOffset, raw.byteLength),
      };
    });
    return this.vectors;
  }

  /** Vector-similar passages for free text (e.g. the user's selection). */
  similarToText(text: string, k = 8, excludeKey?: string): SimilarHit[] {
    const q = embedText(text);
    const scored = this.loadVectors()
      .filter((v) => v.key !== excludeKey)
      .map((v) => ({ key: v.key, section: v.section, score: cosine(q, v.vec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    return scored.map((s) => {
      const tb = this.all(
        `SELECT tb.latin, tb.english, n.title FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
        [s.key],
      )[0];
      return {
        key: s.key,
        section: s.section,
        title: (tb?.title as string) ?? null,
        score: s.score,
        latin: (tb?.latin as string) ?? null,
        english: (tb?.english as string) ?? null,
      };
    });
  }

  /** FTS5 concordance. Malformed input returns [] (guard kept from HelloWord). */
  concordance(term: string, k = 20): ConcordanceHit[] {
    const safe = term
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
      .filter(Boolean)
      .map((w) => `"${w}"`)
      .join(' ');
    if (!safe) return [];
    try {
      return this.all(
        `SELECT key, section, snippet(search, 2, '«', '»', ' … ', 12) snippet
         FROM search WHERE search MATCH ? ORDER BY rank LIMIT ?`,
        [safe, k],
      ).map((r) => ({
        key: String(r.key),
        section: String(r.section),
        snippet: String(r.snippet),
      }));
    } catch {
      return [];
    }
  }
}
