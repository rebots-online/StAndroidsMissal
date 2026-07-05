/**
 * The Divine Office as a loop line — the daily cursus of the eight canonical
 * hours, drawn as a circle (the day's perpetual round of prayer). Selecting
 * an hour shows its rubrical skeleton. Full hour texts, constructed from the
 * corpus by the custom hour-construction schema, are the Phase-2 major
 * deliverable (see DOCS/ARCHITECTURE).
 */

import { useState } from 'react';
import { OFFICE_CURSUS, type Hour } from '../core/model/officeCursus.ts';
import type { DayInfo } from '../core/data/types.ts';

interface Props {
  day: DayInfo | null;
}

export default function OfficeView({ day }: Props) {
  const [sel, setSel] = useState<Hour>(OFFICE_CURSUS[1]); // Lauds by default
  const R = 150;
  const CX = 210;
  const CY = 210;

  return (
    <div className="content">
      <div className="office-wrap">
        <svg className="office-loop" viewBox="0 0 420 420" role="img" aria-label="The eight canonical hours as a loop line">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line-office)" strokeWidth={9} />
          <text x={CX} y={CY - 10} textAnchor="middle" fontSize={15} fontStyle="italic" fill="var(--ink-soft)" fontFamily="var(--serif)">
            Officium Divinum
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize={11.5} fill="var(--ink-faint)">
            {day ? `${day.weekKey} · ${day.season}` : 'the daily round of prayer'}
          </text>
          {OFFICE_CURSUS.map((h, i) => {
            const ang = (i / OFFICE_CURSUS.length) * Math.PI * 2 - Math.PI / 2;
            const x = CX + R * Math.cos(ang);
            const y = CY + R * Math.sin(ang);
            const lx = CX + (R + 34) * Math.cos(ang);
            const ly = CY + (R + 34) * Math.sin(ang);
            const active = sel.id === h.id;
            return (
              <g className="hour-node" key={h.id} onClick={() => setSel(h)}>
                <circle cx={x} cy={y} r={active ? 13 : 10} fill="#fff" stroke={active ? 'var(--accent)' : 'var(--line-office)'} strokeWidth={active ? 5 : 3.5} />
                <text x={lx} y={ly - 2} textAnchor="middle" fontSize={12.5} fontFamily="var(--serif)" fontStyle="italic" fill="var(--ink)">
                  {h.latin}
                </text>
                <text x={lx} y={ly + 12} textAnchor="middle" fontSize={10} fill="var(--ink-faint)">
                  {h.clock}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="hour-card">
          <h3>{sel.latin}</h3>
          <div className="eng">{sel.english} · circa {sel.clock}</div>
          <ol>
            {sel.parts.map((p) => <li key={p}>{p}</li>)}
          </ol>
          <div className="phase2">
            ✠ <b>Next major:</b> the full {sel.english} texts — psalms, antiphons, lessons and
            responsories — constructed dynamically from the corpus graph by the hour-construction
            schema (the Breviary counterpart of the Mass propers engine), for every day of the
            perpetual calendar.
          </div>
        </div>
      </div>
    </div>
  );
}
