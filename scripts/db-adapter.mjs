/**
 * db-adapter — a node:sqlite implementation of the CorpusDb query surface,
 * for Node-side harnesses and tests (the app itself uses sql.js; the
 * collinear rule applies to the app runtime, not to build/test tooling).
 */

import { DatabaseSync } from 'node:sqlite';

const META = new Set(['Rank', 'Rule', 'Name', 'Officium', 'Missa', 'Prelude', 'Comment', 'Rank1960', 'RankNewcal']);

export function openAdapter(dbPath = 'assets/missal.db') {
  const raw = new DatabaseSync(dbPath, { readOnly: true });

  const rowToNode = (r) => {
    let meta = {};
    try { meta = r.meta ? JSON.parse(String(r.meta)) : {}; } catch { meta = {}; }
    return {
      id: Number(r.id), kind: String(r.kind), key: String(r.key),
      title: r.title ?? null, category: r.category ?? null,
      rankClass: r.rank_class ?? null, rankNum: Number(r.rank_num ?? 0),
      color: r.color ?? null, meta,
    };
  };

  return {
    getFileNode(path) {
      const r = raw.prepare('SELECT * FROM nodes WHERE key = ?').get(`file:${path}`);
      return r ? rowToNode(r) : null;
    },
    hasFile(path) {
      return this.getFileNode(path) !== null;
    },
    getKalendar(mmdd) {
      return raw.prepare('SELECT file, title, rank FROM kalendar WHERE mmdd = ? ORDER BY ord').all(mmdd)
        .map((r) => ({ file: String(r.file), title: r.title ?? null, rank: Number(r.rank ?? 0) }));
    },
    getTransfers(source) {
      return raw.prepare('SELECT mmdd, target FROM kalendar_transfer WHERE source = ?').all(source)
        .map((r) => ({ mmdd: String(r.mmdd), target: String(r.target) }));
    },
    asDayMeta(n) {
      if (!n) return null;
      return {
        key: n.key.replace(/^file:/, ''), title: n.title ?? n.meta.office_name ?? null,
        rankClass: n.rankClass, rankNum: n.rankNum, color: n.color,
        festumDomini: n.meta.festum_domini === true,
      };
    },
    communeOf(path) {
      const r = raw.prepare(
        `SELECT n2.key k FROM edges e JOIN nodes n1 ON n1.id = e.src JOIN nodes n2 ON n2.id = e.dst
         WHERE e.rel = 'CROSS_REF' AND n1.key = ?`,
      ).get(`file:${path}`);
      return r ? String(r.k).replace(/^file:/, '') : null;
    },
    getSection(path, section) {
      const r = raw.prepare(
        'SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?',
      ).get(`section:${path}#${section}`);
      if (!r) return null;
      return {
        nodeKey: `section:${path}#${section}`, section,
        latin: r.latin ?? null, english: r.english ?? null,
        sourcePath: path, fromCommune: false,
      };
    },
    getFileSections(path) {
      return raw.prepare(
        `SELECT tb.section s, tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id
         WHERE n.key LIKE ? ORDER BY n.id`,
      ).all(`section:${path}#%`)
        .filter((r) => !META.has(String(r.s)))
        .map((r) => ({
          nodeKey: `section:${path}#${r.s}`, section: String(r.s),
          latin: r.latin ?? null, english: r.english ?? null,
          sourcePath: path, fromCommune: false,
        }));
    },
    getPsalm(num) {
      return this.getSection(`Psalterium/Psalmorum/Psalm${num}`, 'Psalmus');
    },
    getSkeleton(hourFile) {
      return raw.prepare('SELECT line FROM office_skeleton WHERE hour_file = ? ORDER BY ord').all(hourFile)
        .map((r) => String(r.line ?? ''));
    },
    getPsalmSchema(dayKey, hour) {
      return raw.prepare(
        'SELECT nocturn, slot_ord, antiphon_la, antiphon_en, psalm_ref, festal_bracket FROM office_psalm_schema WHERE day_key = ? AND hour = ? ORDER BY slot_ord',
      ).all(dayKey, hour).map((r) => ({
        nocturn: r.nocturn == null ? null : Number(r.nocturn),
        slot: Number(r.slot_ord),
        antiphonLa: r.antiphon_la ?? null,
        antiphonEn: r.antiphon_en ?? null,
        ref: String(r.psalm_ref),
        festal: Number(r.festal_bracket) === 1,
      }));
    },
    getNocturnVersicles(dayKey) {
      return raw.prepare(
        'SELECT nocturn, versicle_la, response_la, versicle_en, response_en FROM office_nocturn_versicle WHERE day_key = ? ORDER BY nocturn',
      ).all(dayKey).map((r) => ({
        nocturn: Number(r.nocturn),
        la: `V. ${r.versicle_la ?? ''}\nR. ${r.response_la ?? ''}`,
        en: r.versicle_en ? `V. ${r.versicle_en}\nR. ${r.response_en ?? ''}` : null,
      }));
    },
  };
}
