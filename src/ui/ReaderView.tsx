/**
 * Bilingual exegetical reader — the day's Mass propers in canonical order,
 * Latin normative on the left, English translation on the right. Text
 * selection (or right-click) opens the exegesis context menu:
 * Catholic meaning · similar passages · cross-references · annotate.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo, SectionText } from '../core/data/types.ts';
import { READER_ORDER, ORDO_STATION_SECTION } from '../core/model/massOrdo.ts';
import { annotationsFor, addAnnotation, removeAnnotation, type Annotation } from '../core/annotations/store.ts';

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
}

interface Menu {
  x: number;
  y: number;
  term: string;
  nodeKey: string | null;
}

/** Render corpus text: "!Ps 24:6" verse refs become styled citations. */
function TextBlock({ text, quotes }: { text: string; quotes: string[] }) {
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
          <span key={i}>
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

export default function ReaderView({ db, day, focusSection, focusNonce, onAction }: Props) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteFor, setNoteFor] = useState<Menu | null>(null);
  const [noteText, setNoteText] = useState('');
  const [annVersion, setAnnVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const path = day.winner?.key ?? day.temporaPath;
  const entries: ReaderEntry[] = useMemo(() => {
    const propers = new Map(db.getMassTexts(path).map((s) => [s.section, s]));
    const ordo = db.getOrdoTexts();
    const out: ReaderEntry[] = [];
    for (const slot of READER_ORDER) {
      if (slot.kind === 'proper') {
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
  }, [db, path]);

  useEffect(() => {
    if (focusSection && rootRef.current) {
      // Accept a proper section key, an Ordo anchor, or an ordinary station id.
      const anchor = ORDO_STATION_SECTION[focusSection]
        ? `ordo:${ORDO_STATION_SECTION[focusSection]}`
        : focusSection;
      const el =
        rootRef.current.querySelector(`[data-section="${CSS.escape(anchor)}"]`) ??
        rootRef.current.querySelector(`[data-section="${CSS.escape(focusSection)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusSection, focusNonce, day.date]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
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
    >
      {entries.map((s) => {
        const anns = annotationsFor(s.nodeKey);
        const quotes = anns.map((a) => a.quote).filter(Boolean);
        void annVersion;
        return (
          <section
            className={`reader-section${s.ordinary ? ' ordinary' : ''}`}
            key={s.anchor}
            data-section={s.anchor}
            data-nodekey={s.nodeKey}
          >
            <div className="head">
              <h3>{s.displayTitle}</h3>
              <span className={`src${s.fromCommune ? ' commune' : ''}`}>
                {s.ordinary ? 'Ordinarium Missæ' : s.fromCommune ? `ex communi — ${s.sourcePath} (vide)` : s.sourcePath}
              </span>
            </div>
            <div className="bilingual">
              <div className="latin" lang="la">
                <span className="lang-tag">Latine</span>
                {s.latin ? <TextBlock text={s.latin} quotes={quotes} /> : <p style={{ opacity: 0.5 }}>—</p>}
              </div>
              <div className="english" lang="en">
                <span className="lang-tag">English</span>
                {s.english ? <TextBlock text={s.english} quotes={quotes} /> : <p style={{ opacity: 0.5 }}>—</p>}
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
          </section>
        );
      })}

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
                  addAnnotation({ nodeKey: noteFor.nodeKey, quote: noteFor.term, note: noteText, color: 'gold' });
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
