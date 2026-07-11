import { useEffect, useMemo, useState } from 'react';
import { CorpusDb } from './core/data/corpusDb.ts';
import { loadCorpusBytes } from './core/data/loadCorpus.ts';
import { resolveDay } from './core/data/liturgicalDay.ts';
import type { DayInfo } from './core/data/types.ts';
import type { Station } from './core/model/massOrdo.ts';
import SubwayMap from './ui/SubwayMap.tsx';
import ReaderView, { type SelectionAction } from './ui/ReaderView.tsx';
import MeaningPanel from './ui/MeaningPanel.tsx';
import CalendarView from './ui/CalendarView.tsx';
import OfficeView from './ui/OfficeView.tsx';

type View = 'map' | 'reader' | 'calendar' | 'office';

const NAV: { id: View; ico: string; label: string }[] = [
  { id: 'map', ico: '🚇', label: 'Subway Map' },
  { id: 'reader', ico: '📖', label: 'Missal Reader' },
  { id: 'calendar', ico: '📅', label: 'Perpetual Calendar' },
  { id: 'office', ico: '🕰', label: 'Divine Office' },
];

export default function App() {
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
  // The user's LOCAL calendar date — never UTC: an evening user in Canada must
  // see today's feast, not tomorrow's (toISOString would skip ahead at 20:00 EDT).
  const [date, setDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [focus, setFocus] = useState<{ section: string | null; nonce: number }>({ section: null, nonce: 0 });
  const [action, setAction] = useState<SelectionAction | null>(null);

  useEffect(() => {
    loadCorpusBytes()
      .then((bytes) => CorpusDb.open(bytes))
      .then(setDb)
      .catch((e) => setError(String(e)));
  }, []);

  const day: DayInfo | null = useMemo(() => (db ? resolveDay(db, date) : null), [db, date]);

  useEffect(() => {
    document.documentElement.dataset.color = String(day?.color ?? 'green');
  }, [day?.color]);

  function onStation(s: Station) {
    setFocus({ section: s.sectionKey ?? s.id, nonce: Date.now() });
    setView('reader');
  }

  function onOpenKey(nodeKey: string) {
    // "section:Sancti/02-25#Introitus" — jump the reader to that source day/section.
    const m = nodeKey.match(/^section:(.+)#(.+)$/);
    if (!m) return;
    setFocus({ section: m[2], nonce: Date.now() });
    setView('reader');
    // Note: cross-corpus navigation opens the section within the current day's
    // reader when the path matches; a full corpus browser lands in Phase 2.
  }

  if (error) {
    return (
      <div className="loading">
        <div>
          <p>Could not open the liturgical corpus: {error}</p>
          <p>Run <code>npm run ingest</code> to build <code>missal.db</code>.</p>
        </div>
      </div>
    );
  }
  if (!db) {
    return (
      <div className="loading">
        <div style={{ textAlign: 'center' }}>
          <span className="rose">✠</span>
          <p>Opening the liturgical corpus…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="rail">
        <div className="brand">St. Android's Missal</div>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav${view === n.id ? ' active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <span className="ico">{n.ico}</span>
            <span className="label">{n.label}</span>
          </button>
        ))}
        <div className="spacer" />
        <div className="day-chip">
          <div className="date-row">
            <span className="swatch" title={`Liturgical color: ${day?.color}`} />
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          {day && (
            <>
              <div className="feast">{day.feastName ?? day.weekKey}</div>
              <div className="season">{day.season} · {day.weekday} · {day.weekKey}</div>
            </>
          )}
        </div>
      </nav>

      <div className="main">
        <header className="masthead">
          <h1>{day?.feastName ?? day?.weekKey ?? '—'}</h1>
          {day?.winner?.rankClass && <span className="rank-badge">{day.winner.rankClass}</span>}
          <span className="sub">
            {day?.date} · {day?.season} · {day?.temporaPath}
            {day && day.commemorations.length > 0 &&
              ` · Comm.: ${day.commemorations.slice(0, 2).map((c) => c.title ?? c.key).join('; ')}`}
          </span>
        </header>

        <div className={action ? 'split' : 'single'}>
          {view === 'map' && (
            <div className="content map-wrap">
              <SubwayMap day={day} onStation={onStation} />
            </div>
          )}
          {view === 'reader' && day && (
            <ReaderView db={db} day={day} focusSection={focus.section} focusNonce={focus.nonce} onAction={setAction} />
          )}
          {view === 'calendar' && (
            <CalendarView db={db} selected={date} onPick={(iso) => { setDate(iso); setView('reader'); setFocus({ section: null, nonce: 0 }); }} />
          )}
          {view === 'office' && <OfficeView day={day} />}

          {action && (
            <MeaningPanel db={db} action={action} onClose={() => setAction(null)} onOpenKey={onOpenKey} />
          )}
        </div>
      </div>
    </div>
  );
}
