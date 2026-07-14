/**
 * BibleView — "Sacred Scripture": the vendored Vulgate + Douay-Rheims as a
 * first-class reading surface (§7.6, CHECKLIST BB.2). Book grid → chapter
 * grid → bilingual chapter reader. Selection offers the same exegesis menu
 * as the missal reader (Catholic meaning · similar · cross-refs · annotate);
 * the CITES graph drives the "appears in the liturgy" panel, whose entries
 * open the citing section on its own source day via onOpenKey.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SectionText } from '../core/data/types.ts';
import type { SelectionAction } from './ReaderView.tsx';
import { annotationsFor, addAnnotation, removeAnnotation, type Annotation } from '../core/annotations/store.ts';
import { verseHash } from '../core/share/shareLink.ts';
import { alignSelection, wordEcho, wordAtPoint, type WordEchoResult } from '../core/text/align.ts';
import { useNarrow } from './BilingualText.tsx';

interface Props {
  db: CorpusDb;
  /** Deep-link focus: "Gen/1" or "Gen/1/5". */
  focusRef: string | null;
  focusNonce: number;
  onAction: (a: SelectionAction) => void;
  /** Open a citing liturgical section on its source day (App.onOpenKey). */
  onOpenKey: (nodeKey: string) => void;
}

interface Menu {
  x: number;
  y: number;
  term: string;
  nodeKey: string | null;
}

function nodeKeyFromSelection(root: HTMLElement | null): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  let el: Node | null = sel.getRangeAt(0).startContainer;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.dataset.nodekey) return el.dataset.nodekey;
    el = el.parentNode;
  }
  return null;
}

export default function BibleView({ db, focusRef, focusNonce, onAction, onOpenKey }: Props) {
  const books = useMemo(() => db.getBooks(), [db]);
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [focusVerse, setFocusVerse] = useState<number | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteFor, setNoteFor] = useState<Menu | null>(null);
  const [noteText, setNoteText] = useState('');
  const [annVersion, setAnnVersion] = useState(0);
  const [liturgyOpen, setLiturgyOpen] = useState(false);
  /** Verse echo: hover/tap/selection lights the aligned verse in BOTH panes. */
  const [echoVerse, setEchoVerse] = useState<number | null>(null);
  const [callout, setCallout] = useState<{ x: number; y: number; echo: WordEchoResult } | null>(null);
  const echoCache = useRef(new Map<string, WordEchoResult | null>());
  const lastWord = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Below 1100px the two verse panes interleave into one column (§7.7). */
  const narrow = useNarrow(1100);

  // Deep-link navigation ("Gen/1" or "Gen/1/5").
  useEffect(() => {
    if (!focusRef) return;
    const m = focusRef.match(/^([A-Za-z0-9]+)\/(\d+)(?:\/(\d+))?$/);
    if (!m) return;
    setBook(m[1]);
    setChapter(Number(m[2]));
    setFocusVerse(m[3] ? Number(m[3]) : null);
  }, [focusRef, focusNonce]);

  const bookMeta = useMemo(() => books.find((b) => b.key === book) ?? null, [books, book]);
  const verses: SectionText[] = useMemo(
    () => (book && chapter ? db.getChapter(book, chapter) : []),
    [db, book, chapter],
  );
  const citing = useMemo(() => {
    if (!book || !chapter) return [];
    // Group CITES rows by citing section; keep verse coverage + best quality.
    const bySection = new Map<string, { title: string | null; sourcePath: string; verses: Set<string>; exact: boolean }>();
    for (const c of db.liturgyCitingChapter(book, chapter)) {
      const g = bySection.get(c.sectionKey) ?? {
        title: c.sectionTitle,
        sourcePath: c.sourcePath,
        verses: new Set<string>(),
        exact: false,
      };
      g.verses.add(c.verseKey.split('/').pop() ?? '');
      if (c.quality === 'exact') g.exact = true;
      bySection.set(c.sectionKey, g);
    }
    return [...bySection.entries()].map(([key, g]) => ({ key, ...g }));
  }, [db, book, chapter]);

  // Scroll a deep-linked verse into view once the chapter renders.
  useEffect(() => {
    if (!focusVerse || !rootRef.current) return;
    const el = rootRef.current.querySelector(`[data-verse="${focusVerse}"]`);
    if (el) {
      const root = rootRef.current;
      const top = (el as HTMLElement).getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 8;
      root.scrollTo({ top, behavior: 'smooth' });
    }
  }, [focusVerse, verses]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, []);

  function openMenu(e: React.MouseEvent) {
    const sel = window.getSelection()?.toString().trim() ?? '';
    if (!sel || sel.length < 2) return;
    e.preventDefault();
    setMenu({
      x: Math.min(e.clientX, window.innerWidth - 270),
      y: Math.min(e.clientY + 6, window.innerHeight - 220),
      term: sel.slice(0, 300),
      nodeKey: nodeKeyFromSelection(rootRef.current),
    });
  }

  const verseFromEvent = (e: React.SyntheticEvent) => {
    const el = (e.target as HTMLElement).closest?.('[data-verse]') as HTMLElement | null;
    if (el) setEchoVerse(Number(el.dataset.verse));
  };
  const showCallout = (e: React.PointerEvent) => {
    const word = wordAtPoint(e.clientX, e.clientY);
    const el = (e.target as HTMLElement).closest?.('[data-nodekey]') as HTMLElement | null;
    const nodeKey = el?.dataset.nodekey ?? null;
    if (!word || !nodeKey) {
      lastWord.current = null;
      setCallout(null);
      return;
    }
    const cacheKey = `${nodeKey}|${word.toLowerCase()}`;
    if (lastWord.current === cacheKey) return;
    lastWord.current = cacheKey;
    const v = verses.find((x) => x.nodeKey === nodeKey);
    if (!v) return setCallout(null);
    let result = echoCache.current.get(cacheKey);
    if (result === undefined) {
      result = wordEcho(db, { latin: v.latin, english: v.english }, word);
      echoCache.current.set(cacheKey, result);
    }
    if (result?.word) setCallout({ x: e.clientX, y: e.clientY, echo: result });
    else setCallout(null);
  };

  // Drag-selection lights the aligned verse in both panes.
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !rootRef.current) return;
      let el: Node | null = sel.anchorNode;
      while (el && el !== rootRef.current) {
        if (el instanceof HTMLElement && el.dataset.verse !== undefined) {
          setEchoVerse(Number(el.dataset.verse));
          return;
        }
        el = el.parentNode;
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  // ── Book grid ────────────────────────────────────────────────────
  if (!book) {
    return (
      <div className="content reader">
        {(['OT', 'NT'] as const).map((t) => (
          <section className="reader-section" key={t}>
            <div className="head">
              <h3>{t === 'OT' ? 'Vetus Testamentum' : 'Novum Testamentum'}</h3>
            </div>
            <div className="bible-book-grid">
              {books.filter((b) => b.testament === t).map((b) => (
                <button
                  key={b.key}
                  className="bible-book"
                  onClick={() => { setBook(b.key); setChapter(null); setFocusVerse(null); }}
                  title={b.hasLatin ? `${b.title} — ${b.chapters} capitula` : `${b.title} — English only (Latin source pending)`}
                >
                  {b.title}
                  {!b.hasLatin && <span className="bible-en-only"> EN</span>}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // ── Chapter grid ─────────────────────────────────────────────────
  if (!chapter) {
    return (
      <div className="content reader">
        <section className="reader-section">
          <div className="head">
            <button className="bible-back" onClick={() => setBook(null)}>‹ Libri</button>
            <h3>{bookMeta?.title}</h3>
          </div>
          <div className="bible-chapter-grid">
            {Array.from({ length: bookMeta?.chapters ?? 0 }, (_, i) => i + 1).map((n) => (
              <button key={n} className="bible-chapter" onClick={() => { setChapter(n); setFocusVerse(null); }}>
                {n}
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ── Chapter reader ───────────────────────────────────────────────
  const chapterAnns = verses.flatMap((v) => annotationsFor(v.nodeKey));
  void annVersion;
  return (
    <div
      className="content reader"
      ref={rootRef}
      onContextMenu={openMenu}
      onMouseUp={(e) => {
        if (e.button === 0) openMenu(e);
      }}
      onPointerOver={(e) => {
        if (window.matchMedia('(hover: hover)').matches) verseFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) showCallout(e);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'mouse') {
          verseFromEvent(e);
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
      onClick={verseFromEvent}
    >
      <section className="reader-section" data-section={`bible:${book}/${chapter}`}>
        <div className="head">
          <button className="bible-back" onClick={() => { setChapter(null); setFocusVerse(null); }}>‹ {bookMeta?.title}</button>
          <h3>{bookMeta?.title} {chapter}</h3>
          <span className="bible-chapter-nav">
            <button disabled={chapter <= 1} onClick={() => { setChapter(chapter - 1); setFocusVerse(null); }}>‹</button>
            <button
              disabled={chapter >= (bookMeta?.chapters ?? 1)}
              onClick={() => { setChapter(chapter + 1); setFocusVerse(null); }}
            >
              ›
            </button>
          </span>
          <span className="src">Vulgata Clementina · Douay-Rheims{bookMeta?.hasLatin ? '' : ' (English only)'}</span>
        </div>

        {citing.length > 0 && (
          <div className="bible-liturgy">
            <button className="bible-liturgy-toggle" onClick={() => setLiturgyOpen((o) => !o)}>
              {liturgyOpen ? '▾' : '▸'} In liturgia — cited by {citing.length} liturgical section{citing.length === 1 ? '' : 's'}
            </button>
            {liturgyOpen && (
              <ul>
                {citing.slice(0, 40).map((c) => (
                  <li key={c.key}>
                    <button onClick={() => onOpenKey(c.key)} title={`Open on its source day (${c.sourcePath})`}>
                      {c.title ?? c.key.replace(/^section:/, '')}
                    </button>
                    <span className="bible-cite-meta">
                      {c.sourcePath} · vv. {[...c.verses].join(', ')}{c.exact ? ' · verbatim' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {narrow ? (
          // Interleaved verse pairs (§7.7 mobile): Latin verse first, its
          // English beneath, one .il-pair per verse. The pair carries the
          // verse's data-nodekey/data-verse so the existing echo, selection,
          // deep-link scroll and focus mechanics keep working unchanged.
          <div className="bilingual interleaved">
            {verses.map((v) => {
              const n = Number(v.nodeKey.split('/').pop());
              const echoed = echoVerse === n;
              return (
                <p
                  key={v.nodeKey}
                  data-nodekey={v.nodeKey}
                  data-verse={n}
                  className={`bible-verse il-pair${focusVerse === n ? ' focus' : ''}${echoed ? ' xlate-echo' : ''}`}
                >
                  <span className={`il-la${echoed ? ' xlate-echo' : ''}`} data-lang="la" lang="la">
                    <sup>{n}</sup> {v.latin ?? <span style={{ opacity: 0.5 }}>—</span>}
                  </span>
                  {v.english !== null && (
                    <span className={`il-en${echoed ? ' xlate-echo' : ''}`} data-lang="en" lang="en">
                      {v.english}
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        ) : (
        <div className="bilingual">
          <div className="latin" lang="la">
            <span className="lang-tag">Latine</span>
            {verses.map((v) => {
              const n = Number(v.nodeKey.split('/').pop());
              return (
                <p key={v.nodeKey} data-nodekey={v.nodeKey} data-verse={n} className={`bible-verse${focusVerse === n ? ' focus' : ''}${echoVerse === n ? ' xlate-echo' : ''}`}>
                  <sup>{n}</sup> {v.latin ?? <span style={{ opacity: 0.5 }}>—</span>}
                </p>
              );
            })}
          </div>
          <div className="english" lang="en">
            <span className="lang-tag">English</span>
            {verses.map((v) => {
              const n = Number(v.nodeKey.split('/').pop());
              return (
                <p key={v.nodeKey} data-nodekey={v.nodeKey} data-verse={n} className={`bible-verse${focusVerse === n ? ' focus' : ''}${echoVerse === n ? ' xlate-echo' : ''}`}>
                  <sup>{n}</sup> {v.english ?? <span style={{ opacity: 0.5 }}>—</span>}
                </p>
              );
            })}
          </div>
        </div>
        )}

        {chapterAnns.length > 0 && (
          <div className="ann-list">
            {chapterAnns.map((a: Annotation) => (
              <div className="ann-item" key={a.id}>
                <button title="Remove annotation" onClick={() => { removeAnnotation(a.id); setAnnVersion((v) => v + 1); }}>×</button>
                <span className="quote">“{a.quote.slice(0, 90)}”</span>
                {a.note && <div>{a.note}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

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
          <button
            onClick={() => {
              const n = menu.nodeKey?.match(/^verse:[^/]+\/(\d+)\/(\d+)$/);
              const hash = n ? verseHash(book, Number(n[1]), Number(n[2])) : verseHash(book, chapter);
              navigator.clipboard?.writeText(`${location.origin}${location.pathname}${hash}`);
              setMenu(null);
            }}
          >
            ⛓ Copy verse link
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
                  const v = verses.find((x) => x.nodeKey === noteFor.nodeKey);
                  const aligned = v ? alignSelection({ latin: v.latin, english: v.english }, noteFor.term) : null;
                  addAnnotation({
                    nodeKey: noteFor.nodeKey, quote: noteFor.term,
                    quoteAlt: aligned?.dstLine ?? undefined,
                    note: noteText, color: 'gold',
                  });
                  setAnnVersion((v2) => v2 + 1);
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
