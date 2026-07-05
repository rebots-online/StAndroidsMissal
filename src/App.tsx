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

type View = 'home' | 'reader' | 'calendar' | 'map' | 'office';

const NAV: { id: View; ico: string; label: string; group?: 'study' }[] = [
  { id: 'home', ico: '✠', label: 'Today' },
  { id: 'reader', ico: '📖', label: 'Read the Mass' },
  { id: 'calendar', ico: '📅', label: 'Choose a Day' },
  { id: 'map', ico: '🚇', label: 'Explore the Map', group: 'study' },
  { id: 'office', ico: '🕰', label: 'Divine Office', group: 'study' },
];

function HomeView({ day, onOpen }: { day: DayInfo; onOpen: (view: View) => void }) {
  return (
    <div className="content home-view">
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="eyebrow">Today in the traditional Roman liturgy</span>
          <h2>{day.feastName ?? day.weekKey}</h2>
          <p className="welcome-meta">
            <span className="swatch" aria-hidden="true" />
            {day.weekday} · {day.season}
          </p>
          <p>
            Begin with the prayers for the day. Latin and English appear together, and the deeper study tools stay out of the way until you call for them.
          </p>
          <div className="primary-actions">
            <button className="primary" onClick={() => onOpen('reader')}>Begin reading</button>
            <button className="secondary" onClick={() => onOpen('calendar')}>Choose another day</button>
          </div>
        </div>
        <div className="welcome-mark" aria-hidden="true">✠</div>
      </section>

      <section className="starter-grid" aria-label="Ways to use St. Android's Missal">
        <button className="starter-card" onClick={() => onOpen('reader')}>
          <span className="starter-icon">📖</span>
          <strong>Follow the Mass</strong>
          <span>Read the day’s texts in Latin and English, section by section.</span>
        </button>
        <button className="starter-card" onClick={() => onOpen('map')}>
          <span className="starter-icon">🚇</span>
          <strong>See where you are</strong>
          <span>Use the subway map to understand the shape and movement of the Mass.</span>
        </button>
        <button className="starter-card" onClick={() => onOpen('office')}>
          <span className="starter-icon">🕰</span>
          <strong>Explore the Divine Office</strong>
          <span>Meet the eight Hours as a daily cycle rather than a wall of unfamiliar terms.</span>
        </button>
      </section>

      <section className="gentle-guide">
        <div>
          <span className="eyebrow">New here?</span>
          <h3>No liturgical decoder ring required.</h3>
        </div>
        <ol>
          <li><strong>Pick a day.</strong> The calendar determines the season, feast, and liturgical colour.</li>
          <li><strong>Read naturally.</strong> Latin is paired with English rather than presented as an entrance exam.</li>
          <li><strong>Go deeper when curious.</strong> Select a word or passage for annotations, concordance, and related texts.</li>
        </ol>
      </section>
    </div>
  );
}

export default function App() {
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('home');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [focusSection, setFocusSection] = useState<string | null>(null);
  const [action, setAction] = useState<SelectionAction | null>(null);
  const [showDetails, setShowDetails] = useState(false);

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

  function openView(next: View) {
    setAction(null);
    setView(next);
  }

  function onStation(s: Station) {
    setFocusSection(s.sectionKey ?? null);
    openView('reader');
  }

  function onOpenKey(nodeKey: string) {
    const m = nodeKey.match(/^section:(.+)#(.+)$/);
    if (!m) return;
    setFocusSection(m[2]);
    openView('reader');
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
  if (!db || !day) {
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
      <nav className="rail" aria-label="Main navigation">
        <button className="brand" onClick={() => openView('home')}>
          <span>St. Android's</span>
          <span>Missal</span>
        </button>

        <div className="nav-group">
          {NAV.filter((n) => !n.group).map((n) => (
            <button
              key={n.id}
              className={`nav${view === n.id ? ' active' : ''}`}
              onClick={() => openView(n.id)}
            >
              <span className="ico">{n.ico}</span>
              <span className="label">{n.label}</span>
            </button>
          ))}
        </div>

        <div className="nav-caption">Explore & study</div>
        <div className="nav-group">
          {NAV.filter((n) => n.group === 'study').map((n) => (
            <button
              key={n.id}
              className={`nav${view === n.id ? ' active' : ''}`}
              onClick={() => openView(n.id)}
            >
              <span className="ico">{n.ico}</span>
              <span className="label">{n.label}</span>
            </button>
          ))}
        </div>

        <div className="spacer" />
        <div className="day-chip">
          <div className="date-row">
            <span className="swatch" title={`Liturgical color: ${day.color}`} />
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Liturgical date" />
          </div>
          <div className="feast">{day.feastName ?? day.weekKey}</div>
          <div className="season">{day.season} · {day.weekday}</div>
        </div>
      </nav>

      <div className="main">
        <header className="masthead">
          <div className="masthead-title">
            <h1>{view === 'home' ? 'Welcome' : day.feastName ?? day.weekKey}</h1>
            {view !== 'home' && day.winner?.rankClass && <span className="rank-badge">{day.winner.rankClass}</span>}
          </div>
          <span className="sub">{day.weekday} · {day.season}</span>
          <button className="details-toggle" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails}>
            {showDetails ? 'Hide details' : 'Liturgical details'}
          </button>
          {showDetails && (
            <div className="technical-details">
              <span>{day.date}</span>
              <span>{day.weekKey}</span>
              <span>{day.temporaPath}</span>
              {day.commemorations.length > 0 && (
                <span>Commemorations: {day.commemorations.slice(0, 2).map((c) => c.title ?? c.key).join('; ')}</span>
              )}
            </div>
          )}
        </header>

        <div className={action ? 'split' : undefined} style={{ overflow: 'hidden', height: '100%' }}>
          {view === 'home' && <HomeView day={day} onOpen={openView} />}
          {view === 'map' && (
            <div className="content map-wrap">
              <div className="view-intro">
                <span className="eyebrow">The whole Mass at a glance</span>
                <h2>Follow the route, then open any station.</h2>
                <p>Solid routes show the ordinary movement of the Mass. Seasonal and conditional parts appear as branches rather than surprises.</p>
              </div>
              <SubwayMap day={day} onStation={onStation} />
            </div>
          )}
          {view === 'reader' && (
            <ReaderView db={db} day={day} focusSection={focusSection} onAction={setAction} />
          )}
          {view === 'calendar' && (
            <CalendarView db={db} selected={date} onPick={(iso) => { setDate(iso); openView('reader'); setFocusSection(null); }} />
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
