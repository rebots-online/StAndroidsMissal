/**
 * align — line-level Latin⇄English alignment inside one bilingual block.
 *
 * DO section texts are typically line-parallel between languages, and Bible
 * verses are aligned by construction — so the honest unit of "the direct
 * translation in context" is the LINE: find the line whose normalized form
 * (diacritics/ligatures/punctuation/case stripped) contains the normalized
 * selection, and pair it with the same-index line of the counterpart.
 * Word-level alignment does not exist in the corpus and is never faked.
 */

import { normalizeText } from './normalize.ts';

export interface AlignedLine {
  srcLang: 'latin' | 'english';
  /** Line index within the source-language block. */
  idx: number;
  srcLine: string;
  /** Same-index counterpart line, or null when the counterpart is missing. */
  dstLine: string | null;
  /** False when line counts differ — the pairing is positional best-effort. */
  countsMatch: boolean;
}

export function alignSelection(
  block: { latin: string | null; english: string | null },
  term: string,
): AlignedLine | null {
  const norm = normalizeText(term);
  if (!norm) return null;
  for (const srcLang of ['latin', 'english'] as const) {
    const src = block[srcLang];
    if (!src) continue;
    const lines = src.split('\n');
    const idx = lines.findIndex((l) => normalizeText(l).includes(norm));
    if (idx < 0) continue;
    const dst = block[srcLang === 'latin' ? 'english' : 'latin'];
    const dstLines = dst ? dst.split('\n') : null;
    return {
      srcLang,
      idx,
      srcLine: lines[idx],
      dstLine: dstLines && idx < dstLines.length ? dstLines[idx] : null,
      countsMatch: dstLines !== null && dstLines.length === lines.length,
    };
  }
  return null;
}

// ── Word-level echo (corpus-attested correspondence) ─────────────────
// No word alignments exist in the corpus; the corresponding word is
// DERIVED: across all aligned line pairs containing the source word
// (FTS concordance), count counterpart-line tokens — the most frequent
// non-stopword co-occurring token that also appears in the local aligned
// line is the best-attested correspondence. Positional ratio breaks ties.

const STOP_EN = new Set(('the and of a an to in is was be for with on by at it he she they them his her their that this not but as are were have has had from or who whom which what all my your our us we you i me him shall will may let o unto thee thou thy ye hath do did no nor so if then when there out up upon over also more than hast dost didst art wilt shalt canst mayest hadst wert').split(' '));
const STOP_LA = new Set(('et in ad de cum ex ut non est sunt esse qui quae quod quia sed si a ab per pro sub super me te se nos vos tu ego mihi tibi sibi nobis vobis meus tuus suus noster vester hic ille ipse is ea id o ne nec atque aut vel iam tam tunc ergo autem enim etiam quoque omnis omnes omnia').split(' '));

/** Minimal query surface wordEcho needs (CorpusDb and the node adapter both satisfy it). */
interface EchoDb {
  concordance(term: string, k?: number): { key: string }[];
  textOf(nodeKey: string): { latin: string | null; english: string | null } | null;
}

export interface WordEchoResult {
  /** Best-attested corresponding word (original casing/diacritics), or null. */
  word: string | null;
  /** The aligned counterpart line — always shown as context. */
  line: string | null;
  srcLang: 'latin' | 'english';
}

const tokens = (s: string) => normalizeText(s).split(/\s+/).filter(Boolean);

export function wordEcho(db: EchoDb, block: { latin: string | null; english: string | null }, rawWord: string): WordEchoResult | null {
  const w = normalizeText(rawWord).trim();
  if (!w || w.includes(' ')) return null;
  const aligned = alignSelection(block, rawWord);
  if (!aligned || !aligned.dstLine) return null;
  const dstLang = aligned.srcLang === 'latin' ? 'english' : 'latin';
  const stop = dstLang === 'english' ? STOP_EN : STOP_LA;
  const localDst = tokens(aligned.dstLine).filter((t) => !stop.has(t));

  // Corpus evidence: counterpart tokens co-occurring with w across aligned pairs.
  const freq = new Map<string, number>();
  for (const hit of db.concordance(w, 12)) {
    const t = db.textOf(hit.key);
    if (!t) continue;
    const src = t[aligned.srcLang];
    const dst = t[dstLang];
    if (!src || !dst) continue;
    const srcLines = src.split('\n');
    const dstLines = dst.split('\n');
    srcLines.forEach((line, i) => {
      if (!tokens(line).includes(w) || i >= dstLines.length) return;
      for (const tok of new Set(tokens(dstLines[i]))) {
        if (!stop.has(tok)) freq.set(tok, (freq.get(tok) ?? 0) + 1);
      }
    });
  }

  // Best candidate PRESENT in the local aligned line; positional ratio breaks ties.
  const srcToks = tokens(aligned.srcLine);
  const ratio = Math.max(0, srcToks.indexOf(w)) / Math.max(1, srcToks.length - 1);
  let best: string | null = null;
  let bestScore = -1;
  localDst.forEach((tok, i) => {
    const posCloseness = 1 - Math.abs(i / Math.max(1, localDst.length - 1) - ratio);
    const score = (freq.get(tok) ?? 0) * 10 + posCloseness;
    if (score > bestScore) {
      bestScore = score;
      best = tok;
    }
  });
  // Recover original casing/diacritics from the raw counterpart line.
  let display: string | null = null;
  if (best) {
    display = aligned.dstLine.split(/\s+/).find((orig) => tokens(orig)[0] === best) ?? best;
    display = display.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  }
  return { word: display, line: aligned.dstLine, srcLang: aligned.srcLang };
}

/** Word under a pointer event, via caret hit-testing (no per-word DOM spans). */
export function wordAtPoint(x: number, y: number): string | null {
  type CaretPos = { offsetNode: Node; offset: number };
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => CaretPos | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) {
      node = p.offsetNode;
      offset = p.offset;
    }
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) {
      node = r.startContainer;
      offset = r.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? '';
  const isWord = (ch: string) => /[\p{L}\p{M}]/u.test(ch);
  if (!isWord(text[offset] ?? '') && !isWord(text[offset - 1] ?? '')) return null;
  let a = offset;
  let b = offset;
  while (a > 0 && isWord(text[a - 1])) a--;
  while (b < text.length && isWord(text[b])) b++;
  const word = text.slice(a, b);
  return word.length >= 2 ? word : null;
}
