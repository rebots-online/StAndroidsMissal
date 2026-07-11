/**
 * The Divine Office — the daily cursus of the eight canonical hours.
 * The loop line (the day's perpetual round of prayer) is the hour selector;
 * beneath it the selected hour's FULL text, constructed on demand from the
 * corpus by OfficeEngine.buildHour (psalmody, antiphons, hymns, lessons,
 * canticles, orations — all real corpus rows, Latin normative).
 */

import { useMemo, useState } from 'react';
import { OFFICE_CURSUS, type Hour } from '../core/model/officeCursus.ts';
import { buildHour, type OfficeEntry } from '../core/office/engine.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo } from '../core/data/types.ts';

interface Props {
  db: CorpusDb;
  day: DayInfo | null;
}

/** Corpus text renderer: "!Citation" lines become styled rubric refs. */
function OfficeText({ text }: { text: string }) {
  return (
    <p>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('!')) {
          return (
            <span className="verse-ref" key={i}>
              {line.slice(1)}
            </span>
          );
        }
        return (
          <span key={i}>
            {line}
            {'\n'}
          </span>
        );
      })}
    </p>
  );
}

export default function OfficeView({ db, day }: Props) {
  const [sel, setSel] = useState<Hour>(OFFICE_CURSUS[1]); // Lauds by default
  const R = 92;
  const CX = 130;
  const CY = 130;

  const entries: OfficeEntry[] = useMemo(() => {
    if (!day) return [];
    try {
      return buildHour(db, day, sel.id);
    } catch {
      return [];
    }
  }, [db, day, sel.id]);

  return (
    <div className="content office-full">
      <aside className="office-rail">
        <svg className="office-loop" viewBox="0 0 260 260" role="img" aria-label="The eight canonical hours as a loop line">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line-office)" strokeWidth={7} />
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={12} fontStyle="italic" fill="var(--ink-soft)" fontFamily="var(--serif)">
            Officium Divinum
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fill="var(--ink-faint)">
            {day ? `${day.weekKey} · ${day.season}` : ''}
          </text>
          {OFFICE_CURSUS.map((h, i) => {
            const ang = (i / OFFICE_CURSUS.length) * Math.PI * 2 - Math.PI / 2;
            const x = CX + R * Math.cos(ang);
            const y = CY + R * Math.sin(ang);
            const lx = CX + (R + 24) * Math.cos(ang);
            const ly = CY + (R + 24) * Math.sin(ang);
            const active = sel.id === h.id;
            return (
              <g className="hour-node" key={h.id} onClick={() => setSel(h)}>
                <circle cx={x} cy={y} r={18} fill="transparent" stroke="none" />
                <circle cx={x} cy={y} r={active ? 10 : 7} fill="#fff" stroke={active ? 'var(--accent)' : 'var(--line-office)'} strokeWidth={active ? 4 : 3} />
                <text x={lx} y={ly + 3} textAnchor="middle" fontSize={10} fontFamily="var(--serif)" fontStyle="italic" fill="var(--ink)">
                  {h.latin}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="hour-meta">
          <h3>{sel.latin}</h3>
          <div className="eng">{sel.english} · circa {sel.clock}</div>
          {day && (
            <div className="eng" style={{ marginTop: 4 }}>
              {day.feastName ?? day.weekKey}
            </div>
          )}
        </div>
      </aside>

      <div className="reader office-reader">
        {!day && <p>Choose a date to construct the office.</p>}
        {day && entries.length === 0 && (
          <p>
            The corpus carries no constructible texts for <b>{sel.latin}</b> on {day.date} — this
            should not happen; please report the date.
          </p>
        )}
        {entries.map((e, i) =>
          e.rubric ? (
            <h2 className="office-heading" key={i}>
              {e.title}
            </h2>
          ) : (
            <section className="reader-section" key={i} data-nodekey={e.source}>
              <div className="head">
                <h3>{e.title}</h3>
                <span className="src">{e.source.replace(/^section:/, '')}</span>
              </div>
              <div className="bilingual">
                <div className="latin" lang="la">
                  <span className="lang-tag">Latine</span>
                  {e.latin ? <OfficeText text={e.latin} /> : <p style={{ opacity: 0.5 }}>—</p>}
                </div>
                <div className="english" lang="en">
                  <span className="lang-tag">English</span>
                  {e.english ? <OfficeText text={e.english} /> : <p style={{ opacity: 0.5 }}>—</p>}
                </div>
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
