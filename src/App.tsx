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
type Experience = 'guided' | 'scholar';
type Aesthetic =
  | 'traditional'
  | 'modernist'
  | 'austere'
  | 'glass-acrylic'
  | 'glass-clear'
  | 'skeuomorphic'
  | 'retro'
  | 'brutalist'
  | 'dopamine'
  | 'anti-design';
type Mode = 'system' | 'light' | 'dark';

const AESTHETICS: { id: Aesthetic; label: string }[] = [
  { id: 'traditional', label: 'Traditional' },
  { id: 'modernist', label: 'Modernist' },
  { id: 'austere', label: 'Austere' },
  { id: 'glass-acrylic', label: 'Glass · Acrylic' },
  { id: 'glass-clear', label: 'Glass · Clear' },
  { id: 'skeuomorphic', label: 'Skeuomorphic' },
  { id: 'retro', label: 'Retro-futurist' },
  { id: 'brutalist', label: 'Brutalist' },
  { id: 'dopamine', label: 'Dopamine' },
  { id: 'anti-design', label: 'Anti-design' },
];

const NAV: { id: View; ico: string; label: string; group?: 'study' }[] = [
  { id: 'home', ico: '✠', label: 'Today' },
  { id: 'reader', ico: '📖', label: 'Read the Mass' },
  { id: 'calendar', ico: '📅', label: 'Choose a Day' },
  { id: 'map', ico: '🚇', label: 'Explore the Map', group: 'study' },
  { id: 'office', ico: '🕰', label: 'Divine Office', group: 'study' },
];

function storedChoice<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

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
            Begin with the prayers for the day. Latin and English appear together, while deeper study tools remain nearby without blocking the doorway.
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
  const [experience, setExperience] = useState<Experience>(() =>
    storedChoice('standroids-experience', ['guided', 'scholar'] as const, 'guided')
  );
  const [aesthetic, setAesthetic] = useState<Aesthetic>(() =>
    storedChoice('standroids-aesthetic', AESTHETICS.map((item) => item.id), 'traditional')
  );
  const [mode, setMode] = useState<Mode>(() =>
    storedChoice('standroids-mode', ['system', 'light', 'dark'] as const, 'system')
  );
  const [showDetails, setShowDetails] = useState(() =>
    storedChoice('standroids-experience', ['guided', 'scholar'] as const, 'guided') === 'scholar'
  );

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

  useEffect(() => {
    document.documentElement.dataset.experience = experience;
    localStorage.setItem('standroids-experience', experience);
  }, [experience]);

  useEffect(() => {
    document.documentElement.dataset.aesthetic = aesthetic;
    localStorage.setItem('standroids-aesthetic', aesthetic);
  }, [aesthetic]);

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    localStorage.setItem('standroids-mode', mode);
  }, [mode]);

  function changeExperience(next: Experience) {
    setExperience(next);
    if (next === 'scholar') setShowDetails(true);
  }

  function openView(next: View) {
    setAction(null);
    setView(next);
  }

  function onStation(station: Station) {
    setFocusSection(station.sectionKey ?? null);
    openView('reader');
  }

  function onOpenKey(nodeKey: string) {
    const match = nodeKey.match(/^section:(.+)#(.+)$/);
    if (!match) return;
    setFocusSection(match[2]);
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
          {NAV.filter((item) => !item.group).map((item) => (
            <button
              key={item.id}
              className={`nav${view === item.id ? ' active' : ''}`}
              onClick={() => openView(item.id)}
            >
              <span className="ico">{item.ico}</span>
              <span className="label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="nav-caption">Explore & study</div>
        <div className="nav-group">
          {NAV.filter((item) => item.group === 'study').map((item) => (
            <button
              key={item.id}
              className={`nav${view === item.id ? ' active' : ''}`}
              onClick={() => openView(item.id)}
            >
              <span className="ico">{item.ico}</span>
              <span className="label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="spacer" />

        <section className="appearance-panel" aria-label="Interface preferences">
          <label>
            <span>Experience</span>
            <select value={experience} onChange={(event) => changeExperience(event.target.value as Experience)}>
              <option value="guided">Guided</option>
              <option value="scholar">Scholar</option>
            </select>
          </label>
          <label>
            <span>Aesthetic</span>
            <select value={aesthetic} onChange={(event) => setAesthetic(event.target.value as Aesthetic)}>
              {AESTHETICS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span>Light</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </section>

        <div className="day-chip">
          <div className="date-row">
            <span className="swatch" title={`Liturgical color: ${day.color}`} />
            <input type="date" value={date} onChange={(event) => event.target.value && setDate(event.target.value)} aria-label="Liturgical date" />
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
                <span>Commemorations: {day.commemorations.slice(0, 2).map((item) => item.title ?? item.key).join('; ')}</span>
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
          {view === 'reader' && <ReaderView db={db} day={day} focusSection={focusSection} onAction={setAction} />}
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
