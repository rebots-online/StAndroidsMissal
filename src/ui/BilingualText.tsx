/**
 * BilingualText — shared bilingual renderer (§7.7, CHECKLIST BK.1/BK.2).
 * Extracted from ReaderView's internal TextBlock and generalized:
 *
 *  - `TextLines` is the low-level single-language block (byte-identical DOM
 *    semantics to the old TextBlock: `span[data-line]`, `.xlate-echo` on
 *    echoed lines, annotation quotes as `mark.ann`, `!`-refs as `.verse-ref`).
 *  - `layout='columns'` renders the classic two-pane `.bilingual` grid.
 *  - `layout='interleaved'` (mobile, `useNarrow`) zips the line-parallel
 *    corpus into `.il-pair` rows: Latin first (`.il-la`), its English
 *    directly beneath (`.il-en`); NULL English → Latin-only pair.
 *
 * Echo accepts a line RANGE (`echoLine`..`echoTo`) so the selection-range
 * echo (BK.2) can light every counterpart line; a single-line echo is a
 * one-line range. Dialogue voice markers (V./R./℣./℟./P./S.) are wrapped in
 * `.dialogue-p` / `.dialogue-s` spans via `dialogueClass` (render-only).
 */

import { useEffect, useState, type ReactElement } from 'react';
import { dialogueClass } from '../core/text/dialogue.ts';

/** Leading versicle/response marker (must match dialogue.ts detection). */
const DIALOGUE_MARKER = /^\s*(?:V|℣|P|R|℟|S)\./u;

/** matchMedia width probe driving the interleave switch. SSR-safe. */
export function useNarrow(px = 1100): boolean {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return narrow;
}

/**
 * Render one display line: optional leading dialogue-voice span, then the
 * body with annotation quotes marked — exactly the old TextBlock inner loop.
 */
function renderLine(line: string, quotes: string[], lineKey: number): (string | ReactElement)[] {
  const out: (string | ReactElement)[] = [];
  let body = line;
  const voice = dialogueClass(line);
  if (voice) {
    const m = line.match(DIALOGUE_MARKER);
    if (m) {
      out.push(
        <span className={voice} key={`v-${lineKey}`}>
          {m[0]}
        </span>,
      );
      body = line.slice(m[0].length);
    }
  }
  let rendered: (string | ReactElement)[] = [body];
  for (const q of quotes) {
    rendered = rendered.flatMap((part) => {
      if (typeof part !== 'string' || !q || !part.includes(q)) return [part];
      const bits = part.split(q);
      const o: (string | ReactElement)[] = [];
      bits.forEach((b, j) => {
        o.push(b);
        if (j < bits.length - 1) o.push(<mark className="ann" key={`${lineKey}-${j}-${q.slice(0, 8)}`}>{q}</mark>);
      });
      return o;
    });
  }
  return out.concat(rendered);
}

const inRange = (i: number, from?: number, to?: number) =>
  from !== undefined && i >= from && i <= (to ?? from);

/**
 * Low-level single-language block — the old ReaderView TextBlock, verbatim
 * DOM semantics, with echo generalized to a line range (`echoLine`..`echoTo`;
 * omitting `echoTo` keeps the historic single-line behavior).
 */
export function TextLines({
  text,
  quotes,
  echoLine,
  echoTo,
}: {
  text: string;
  quotes: string[];
  echoLine?: number;
  echoTo?: number;
}) {
  const lines = text.split('\n');
  return (
    <p>
      {lines.map((line, i) => {
        if (line.startsWith('!')) {
          return (
            <span className="verse-ref" key={i}>
              {line.slice(1)}
            </span>
          );
        }
        return (
          <span key={i} data-line={i} className={inRange(i, echoLine, echoTo) ? 'xlate-echo' : undefined}>
            {renderLine(line, quotes, i)}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        );
      })}
    </p>
  );
}

export default function BilingualText({
  latin,
  english,
  quotes,
  echoLine,
  echoTo,
  layout,
}: {
  latin: string | null;
  english: string | null;
  quotes?: string[];
  echoLine?: number;
  /** End of the echoed line range (inclusive); defaults to `echoLine`. */
  echoTo?: number;
  layout: 'columns' | 'interleaved';
}) {
  const q = quotes ?? [];

  if (layout === 'columns') {
    return (
      <div className="bilingual">
        <div className="latin" lang="la">
          <span className="lang-tag">Latine</span>
          {latin ? <TextLines text={latin} quotes={q} echoLine={echoLine} echoTo={echoTo} /> : <p style={{ opacity: 0.5 }}>—</p>}
        </div>
        <div className="english" lang="en">
          <span className="lang-tag">English</span>
          {english ? <TextLines text={english} quotes={q} echoLine={echoLine} echoTo={echoTo} /> : <p style={{ opacity: 0.5 }}>—</p>}
        </div>
      </div>
    );
  }

  // ── Interleaved: zip the line-parallel corpus into Latin-first pairs ──
  const laLines = latin ? latin.split('\n') : [];
  const enLines = english ? english.split('\n') : [];
  const count = Math.max(laLines.length, enLines.length);
  return (
    <div className="bilingual interleaved">
      {Array.from({ length: count }, (_, i) => {
        const la = laLines[i];
        const en = enLines[i];
        const laRef = la !== undefined && la.startsWith('!');
        const enRef = en !== undefined && en.startsWith('!');
        const echoed = inRange(i, echoLine, echoTo);
        return (
          <p className="il-pair" key={i}>
            {la !== undefined &&
              (laRef ? (
                <span className="verse-ref">{la.slice(1)}</span>
              ) : (
                <span
                  className={`il-la${echoed ? ' xlate-echo' : ''}`}
                  data-line={i}
                  data-lang="la"
                  lang="la"
                >
                  {renderLine(la, q, i)}
                </span>
              ))}
            {en !== undefined &&
              // A verse-ref line paired with the same Latin ref renders once.
              (enRef ? (
                laRef ? null : <span className="verse-ref">{en.slice(1)}</span>
              ) : (
                <span
                  className={`il-en${echoed ? ' xlate-echo' : ''}`}
                  data-line={i}
                  data-lang="en"
                  lang="en"
                >
                  {renderLine(en, q, i)}
                </span>
              ))}
          </p>
        );
      })}
    </div>
  );
}
