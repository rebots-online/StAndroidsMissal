/**
 * Bilingual exegetical reader — the day's Mass propers in canonical order,
 * Latin normative on the left, English translation on the right. Text
 * selection (or right-click) opens the exegesis context menu:
 * Catholic meaning · similar passages · cross-references · annotate.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo, SectionText } from '../core/data/types.ts';
import { MASS_ORDO, READER_ORDER, ORDO_STATION_SECTION, stationActive } from '../core/model/massOrdo.ts';
import type { Season } from '../core/calendar/computus.ts';
import { annotationsFor, addAnnotation, removeAnnotation, type Annotation } from '../core/annotations/store.ts';
import { massTextsForDay } from '../core/data/liturgicalDay.ts';
import { alignSelection, wordEcho, wordAtPoint, type WordEchoResult } from '../core/text/align.ts';

export interface SelectionAction {
  kind: 'meaning' | 'similar' | 'crossrefs';
  term: string;
  nodeKey: string | null;
}

interface Props {
  db: CorpusDb;
  day: DayInfo;
  focusSection: string | null;
  /** Bumped on every navigation request so re-clicking the same station re-scrolls. */
  focusNonce: number;
  onAction: (a: SelectionAction) => void;
  /** Scroll-spy: reports the section anchor under the reading band (for the map strip). */
  onVisibleSection?: (anchor: string) => void;
}

interface Menu {
  x: number;
  y: number;
  term: string;
  nodeKey: string | null;
}

/** Render corpus text: "!Ps 24:6" verse refs become styled citations. */
function TextBlock({ text, quotes, echoLine }: { text: string; quotes: string[]; echoLine?: number }) {
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
        let rendered: (string | React.ReactElement)[] = [line];
        for (const q of quotes) {
          rendered = rendered.flatMap((part) => {
            if (typeof part !== 'string' || !q || !part.includes(q)) return [part];
            const bits = part.split(q);
            const out: (string | React.ReactElement)[] = [];
            bits.forEach((b, j) => {
              out.push(b);
              if (j < bits.length - 1) out.push(<mark className="ann" key={`${i}-${j}-${q.slice(0, 8)}`}>{q}</mark>);
            });
            return out;
          });
        }
        return (
          <span key={i} data-line={i} className={i === echoLine ? 'xlate-echo' : undefined}>
            {rendered}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        );
      })}
    </p>
  );
}

/** One renderable entry of the interleaved full-Mass reader. */
interface ReaderEntry extends SectionText {
  ordinary: boolean;
  displayTitle: string;
  /** Unique data-section anchor ("Introitus" or "ordo:Canon"). */
  anchor: string;
}

export default function ReaderView({ db, day, focusSection, focusNonce, onAction, onVisibleSection }: Props) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteFor, setNoteFor] = useState<Menu | null>(null);
  const [noteText, setNoteText] = useState('');
  const [annVersion, setAnnVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Until this timestamp the scroll-spy stays quiet — programmatic scrolls must not echo. */
  const spyMuteUntil = useRef(0);
  /** Accordion: anchors whose body is folded away (all open by default). */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  /** Live translation echo: the aligned same-index line in the other pane
   *  highlights on hover (desktop), short-tap (touch), or during selection —
   *  the corpus is line-parallel, so the line IS the in-context translation. */
  const [echo, setEcho] = useState<{ nodeKey: string; idx: number } | null>(null);
  const echoFromEvent = (e: React.SyntheticEvent) => {
    const t = e.target as HTMLElement;
    const line = t.closest?.('span[data-line]') as HTMLElement | null;
    const sec = t.closest?.('section[data-nodekey]') as HTMLElement | null;
    if (line && sec?.dataset.nodekey) {
      setEcho({ nodeKey: sec.dataset.nodekey, idx: Number(line.dataset.line) });
    }
  };
  /** Word callout: hover (desktop) / finger-hold (touch) shows the
   *  corpus-attested corresponding word + its aligned line. */
  const [callout, setCallout] = useState<{ x: number; y: number; word: string; echo: WordEchoResult } | null>(null);
  const echoCache = useRef(new Map<string, WordEchoResult | null>());
  const lastWord = useRef<string | null>(null);
  const showCallout = (e: React.PointerEvent) => {
    const word = wordAtPoint(e.clientX, e.clientY);
    const sec = (e.target as HTMLElement).closest?.('section[data-nodekey]') as HTMLElement | null;
    const nodeKey = sec?.dataset.nodekey ?? null;
    if (!word || !nodeKey) {
      lastWord.current = null;
      setCallout(null);
      return;
    }
    const cacheKey = `${nodeKey}|${word.toLowerCase()}`;
    if (lastWord.current === cacheKey) return;
    lastWord.current = cacheKey;
    const src = entries.find((en) => en.nodeKey === nodeKey);
    if (!src) return setCallout(null);
    let result = echoCache.current.get(cacheKey);
    if (result === undefined) {
      result = wordEcho(db, { latin: src.latin, english: src.english }, word);
      echoCache.current.set(cacheKey, result);
    }
    if (result?.word) setCallout({ x: e.clientX, y: e.clientY, word, echo: result });
    else setCallout(null);
  };
  const toggleSection = (anchor: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(anchor)) next.delete(anchor);
      else next.add(anchor);
      return next;
    });

  const path = day.winner?.key ?? day.temporaPath;
  const entries: ReaderEntry[] = useMemo(() => {
    const propers = new Map(massTextsForDay(db, day).texts.map((s) => [s.section, s]));
    const ordo = db.getOrdoTexts();
    const out: ReaderEntry[] = [];
    for (const slot of READER_ORDER) {
      if (slot.kind === 'proper') {
        // Seasonal chant switch: a feast file may carry all four chant
        // alternatives (Graduale/Alleluia/Tractus/GradualeP for whenever the
        // feast falls) — render only the season's own, per the rubric the
        // subway map already encodes.
        const sw = MASS_ORDO.find((st) => st.branch === 'chant' && st.sectionKey === slot.section);
        if (sw && !stationActive(sw, day.season as Season)) continue;
        const s = propers.get(slot.section);
        if (s) out.push({ ...s, ordinary: false, displayTitle: s.section, anchor: s.section });
      } else {
        const s = ordo.get(slot.section);
        if (s && (s.latin || s.english)) {
          out.push({ ...s, ordinary: true, displayTitle: slot.title ?? s.section, anchor: `ordo:${slot.section}` });
        }
      }
    }
    return out;
  }, [db, path, day.season]);

  useEffect(() => {
    if (focusSection && rootRef.current) {
      // Accept a proper section key, an Ordo anchor, or an ordinary station id.
      const anchor = ORDO_STATION_SECTION[focusSection]
        ? `ordo:${ORDO_STATION_SECTION[focusSection]}`
        : focusSection;
      const root = rootRef.current;
      const el =
        root.querySelector(`[data-section="${CSS.escape(anchor)}"]`) ??
        root.querySelector(`[data-section="${CSS.escape(focusSection)}"]`);
      if (el) {
        // Navigating to a folded section unfolds it.
        const target = (el as HTMLElement).dataset.section;
        if (target) setCollapsed((prev) => {
          if (!prev.has(target)) return prev;
          const next = new Set(prev);
          next.delete(target);
          return next;
        });
        spyMuteUntil.current = Date.now() + 900;
        // Scroll the reader container itself, deterministically — never
        // scrollIntoView, whose scroll-chain heuristics land inconsistently.
        const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 6;
        root.scrollTo({ top, behavior: 'smooth' });
      }
    }
  }, [focusSection, focusNonce, day.date]);

  // Scroll-spy (the HelloWord mechanism): an asymmetric band in the upper part
  // of the viewport is the "reading position"; whichever section crosses it
  // becomes the map strip's you-are-here.
  useEffect(() => {
    if (!onVisibleSection || !rootRef.current) return;
    const observer = new IntersectionObserver(
      (hits) => {
        for (const hit of hits) {
          if (hit.isIntersecting && Date.now() > spyMuteUntil.current) {
            const anchor = (hit.target as HTMLElement).dataset.section;
            if (anchor) onVisibleSection(anchor);
          }
        }
      },
      { root: rootRef.current, rootMargin: '-20% 0px -65% 0px', threshold: 0 },
    );
    rootRef.current.querySelectorAll('section[data-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries, onVisibleSection]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, []);

  // Drag-selection echoes too: while selecting, the aligned line highlights
  // in BOTH panes ("the cursor selects both languages simultaneously").
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !rootRef.current) return;
      let el: Node | null = sel.anchorNode;
      while (el && el !== rootRef.current) {
        if (el instanceof HTMLElement && el.dataset.line !== undefined) {
          const sec = el.closest('section[data-nodekey]') as HTMLElement | null;
          if (sec?.dataset.nodekey) setEcho({ nodeKey: sec.dataset.nodekey, idx: Number(el.dataset.line) });
          return;
        }
        el = el.parentNode;
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  function openMenu(e: React.MouseEvent, nodeKey: string | null) {
    const sel = window.getSelection()?.toString().trim() ?? '';
    if (!sel) return;
    e.preventDefault();
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 270), y: Math.min(e.clientY + 6, window.innerHeight - 220), term: sel.slice(0, 300), nodeKey });
  }

  if (entries.length === 0) {
    return (
      <div className="content reader" ref={rootRef}>
        <p>
          No Mass propers stored for <b>{path}</b> — this office delegates to the ferial or
          commune texts. Choose another date, or open the tempora office{' '}
          <b>{day.temporaPath}</b> from the calendar.
        </p>
      </div>
    );
  }

  return (
    <div
      className="content reader"
      ref={rootRef}
      onContextMenu={(e) => {
        const sel = window.getSelection()?.toString().trim();
        if (sel) openMenu(e, menuNodeKeyFromSelection(rootRef.current));
      }}
      onMouseUp={(e) => {
        // Left-release with a selection also offers the menu (touch-friendly).
        if (e.button === 0) {
          const sel = window.getSelection()?.toString().trim();
          if (sel && sel.length > 1) openMenu(e, menuNodeKeyFromSelection(rootRef.current));
        }
      }}
      onPointerOver={(e) => {
        if (window.matchMedia('(hover: hover)').matches) echoFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) showCallout(e);
      }}
      onPointerDown={(e) => {
        // Touch: while the finger holds on a word, peek its correspondence.
        if (e.pointerType !== 'mouse') {
          echoFromEvent(e);
          showCallout(e);
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'mouse') {
          lastWord.current = null;
          setCallout(null);
        }
      }}
      onPointerLeave={() => {
        lastWord.current = null;
        setCallout(null);
      }}
      onClick={echoFromEvent}
    >
      {entries.map((s) => {
        const anns = annotationsFor(s.nodeKey);
        const quotes = anns.flatMap((a) => [a.quote, a.quoteAlt]).filter((q): q is string => Boolean(q));
        const echoLine = echo?.nodeKey === s.nodeKey ? echo.idx : undefined;
        void annVersion;
        const folded = collapsed.has(s.anchor);
        return (
          <section
            className={`reader-section${s.ordinary ? ' ordinary' : ''}${folded ? ' collapsed' : ''}`}
            key={s.anchor}
            data-section={s.anchor}
            data-nodekey={s.nodeKey}
          >
            <div
              className="head"
              onClick={() => toggleSection(s.anchor)}
              role="button"
              aria-expanded={!folded}
              title={folded ? 'Unfold section' : 'Fold section away'}
            >
              <span className="chev">{folded ? '▸' : '▾'}</span>
              <h3>{s.displayTitle}</h3>
              <span className={`src${s.fromCommune ? ' commune' : ''}`}>
                {s.ordinary ? 'Ordinarium Missæ' : s.fromCommune ? `ex communi — ${s.sourcePath} (vide)` : s.sourcePath}
              </span>
            </div>
            {folded ? null : (<>
            <div className="bilingual">
              <div className="latin" lang="la">
                <span className="lang-tag">Latine</span>
                {s.latin ? <TextBlock text={s.latin} quotes={quotes} echoLine={echoLine} /> : <p style={{ opacity: 0.5 }}>—</p>}
              </div>
              <div className="english" lang="en">
                <span className="lang-tag">English</span>
                {s.english ? <TextBlock text={s.english} quotes={quotes} echoLine={echoLine} /> : <p style={{ opacity: 0.5 }}>—</p>}
              </div>
            </div>
            {anns.length > 0 && (
              <div className="ann-list">
                {anns.map((a: Annotation) => (
                  <div className="ann-item" key={a.id}>
                    <button title="Remove annotation" onClick={() => { removeAnnotation(a.id); setAnnVersion((v) => v + 1); }}>×</button>
                    <span className="quote">“{a.quote.slice(0, 90)}”</span>
                    {a.note && <div>{a.note}</div>}
                  </div>
                ))}
              </div>
            )}
            </>)}
          </section>
        );
      })}

      {callout && (
        <div className="xlate-callout" style={{ left: Math.min(callout.x + 12, window.innerWidth - 260), top: callout.y - 44 }}>
          <b>{callout.echo.word}</b>
          <span className="xlate-callout-line">{(callout.echo.line ?? '').slice(0, 90)}</span>
        </div>
      )}

      {menu && (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }} onMouseUp={(e) => e.stopPropagation()}>
          <div className="sel">“{menu.term.slice(0, 80)}{menu.term.length > 80 ? '…' : ''}”</div>
          <button onClick={() => { onAction({ kind: 'meaning', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
            ✠ Catholic meaning of “{menu.term.slice(0, 24)}{menu.term.length > 24 ? '…' : ''}”
          </button>
          <button onClick={() => { onAction({ kind: 'similar', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
            ≈ Similar passages (vector)
          </button>
          <button onClick={() => { onAction({ kind: 'crossrefs', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
            🕸 Cross-references (graph)
          </button>
          <button onClick={() => { setNoteFor(menu); setNoteText(''); setMenu(null); }}>
            ✎ Annotate
          </button>
        </div>
      )}

      {noteFor && (
        <div className="ctx-menu" style={{ left: noteFor.x, top: noteFor.y }}>
          <div className="sel">“{noteFor.term.slice(0, 60)}…”</div>
          <div style={{ padding: '4px 8px' }}>
            <textarea
              autoFocus
              placeholder="Margin note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ width: '100%', minHeight: 56 }}
            />
            <button
              onClick={() => {
                if (noteFor.nodeKey) {
                  const src = entries.find((en) => en.nodeKey === noteFor.nodeKey);
                  const aligned = src ? alignSelection({ latin: src.latin, english: src.english }, noteFor.term) : null;
                  addAnnotation({
                    nodeKey: noteFor.nodeKey, quote: noteFor.term,
                    quoteAlt: aligned?.dstLine ?? undefined,
                    note: noteText, color: 'gold',
                  });
                  setAnnVersion((v) => v + 1);
                }
                setNoteFor(null);
              }}
            >
              Save annotation
            </button>
            <button onClick={() => setNoteFor(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Find the section node key that contains the current selection anchor. */
function menuNodeKeyFromSelection(root: HTMLElement | null): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  let el: Node | null = sel.getRangeAt(0).startContainer;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.dataset.nodekey) return el.dataset.nodekey;
    el = el.parentNode;
  }
  return null;
}
