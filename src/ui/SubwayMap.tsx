/**
 * The whole Mass as a subway map. Two trunk lines — Catechumens (gold) and
 * Faithful (deep red) — joined by an S-curve connector; the Ember-Day loop
 * rises between the Collect and the Epistle; the seasonal chant tracks run
 * as parallel routes between the Epistle and the Gospel; Super populum is a
 * Lenten spur. Proper stations render as interchange rings in the day's
 * liturgical color. Clicking any station opens the reader at that section.
 */

import { trunkOf, branchOf, stationActive, type Station } from '../core/model/massOrdo.ts';
import type { DayInfo } from '../core/data/types.ts';

interface Props {
  day: DayInfo | null;
  onStation: (station: Station) => void;
}

const ACCENTS: Record<string, string> = {
  purple: '#5d3a80', red: '#9c2733', green: '#3f7a52',
  white: '#c9a227', black: '#2c2925', rose: '#d193a3',
};

const X0 = 100;
const XSTEP = 112;
const Y1 = 190;
const Y2 = 470;

export default function SubwayMap({ day, onStation }: Props) {
  const accent = ACCENTS[String(day?.color ?? 'green')] ?? '#3f7a52';
  const season = day?.season ?? 'Time after Pentecost';

  const cat = trunkOf('catechumens').filter((s) => s.id !== 'asperges');
  const fai = trunkOf('faithful');
  const ember = branchOf('ember');
  const chants = branchOf('chant');
  const superPopulum = branchOf('spur').find((s) => s.id === 'super-populum');

  // Slot layout: the ember loop borrows 2 extra slots after the Collect, the
  // chant switch 2 extra slots after the Epistle — room for the branches.
  const catX = new Map<string, number>();
  {
    let slot = 0;
    for (const s of cat) {
      catX.set(s.id, X0 + slot * XSTEP);
      slot += 1;
      if (s.id === 'oratio') slot += 2;
      if (s.id === 'lectio') slot += 2;
    }
  }
  const faiX = (i: number) => X0 + i * XSTEP;
  const catEnd = Math.max(...catX.values());
  const width = Math.max(catEnd, faiX(fai.length - 1)) + 130;

  const xOratio = catX.get('oratio')!;
  const xLectio = catX.get('lectio')!;
  const xEvang = catX.get('evangelium')!;
  const emberY = Y1 - 84;

  const emberActive = ['Advent', 'Lent', 'Time after Pentecost'].includes(season);
  const spActive = superPopulum ? stationActive(superPopulum, season) : false;
  const xPost = faiX(fai.findIndex((s) => s.id === 'postcommunio'));
  const xIte = faiX(fai.findIndex((s) => s.id === 'ite'));

  function StationDot({ s, x, y, small, stagger }: { s: Station; x: number; y: number; small?: boolean; stagger?: boolean }) {
    const active = stationActive(s, season);
    const isProper = s.kind === 'proper' || s.kind === 'switch';
    const r = small ? 7.5 : isProper ? 12 : 9;
    return (
      <g
        className={`station${active ? '' : ' inactive'}`}
        transform={`translate(${x},${y})`}
        onClick={() => active && onStation(s)}
      >
        <title>{`${s.latin} — ${s.english}${s.note ? ` (${s.note})` : ''}`}</title>
        <circle className="halo" r={r + 9} />
        {isProper ? (
          <>
            <circle r={r} fill="#fff" stroke={accent} strokeWidth={small ? 3 : 4} />
            <circle r={Math.max(r - 6, 2.5)} fill={accent} />
          </>
        ) : (
          <circle r={r} fill="#fff" stroke="#4a4034" strokeWidth={3} />
        )}
        {s.kind === 'conditional' && (
          <circle r={r + 4.5} fill="none" stroke="#4a4034" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {small ? (
          <text className="st-label" y={stagger ? -r - 22 : -r - 8} textAnchor="middle" fontStyle="italic">
            {s.latin}
          </text>
        ) : (
          <>
            <text className="st-latin" transform={`translate(-2,${-r - 24}) rotate(-34)`} textAnchor="start">
              {s.latin}
            </text>
            <text className="st-label" y={stagger ? r + 34 : r + 20} textAnchor="middle">
              {s.english}
            </text>
          </>
        )}
      </g>
    );
  }

  return (
    <div className="map-wrap">
      <svg
        className="subway"
        viewBox={`0 0 ${width} 700`}
        role="img"
        aria-label="Subway map of the Order of Mass"
      >
        <text className="line-name" x={X0 - 60} y={62} fill="var(--line-catechumens)">
          ① Missa Catechumenorum — Mass of the Catechumens
        </text>
        <text className="line-name" x={X0 - 60} y={Y2 + 130} fill="var(--line-faithful)">
          ② Missa Fidelium — Mass of the Faithful
        </text>

        {/* Trunk 1 */}
        <path className="track" stroke="var(--line-catechumens)" strokeWidth={9}
          d={`M ${X0 - 45} ${Y1} H ${catEnd + 10}`} />

        {/* S-curve connector: end of line 1 → start of line 2 */}
        <path className="track" stroke="var(--line-faithful)" strokeWidth={9} opacity={0.85}
          d={`M ${catEnd + 10} ${Y1} C ${catEnd + 95} ${Y1}, ${catEnd + 95} ${(Y1 + Y2) / 2}, ${catEnd - 20} ${(Y1 + Y2) / 2} H ${X0 - 25} C ${X0 - 100} ${(Y1 + Y2) / 2}, ${X0 - 100} ${Y2}, ${X0 - 45} ${Y2}`} />

        {/* Trunk 2 */}
        <path className="track" stroke="var(--line-faithful)" strokeWidth={9}
          d={`M ${X0 - 45} ${Y2} H ${faiX(fai.length - 1) + 45}`} />

        {/* Ember-Day loop between Oratio and Lectio */}
        <g className={emberActive ? '' : 'inactive'}>
          <path className="track" stroke="var(--line-catechumens)" strokeWidth={5} strokeDasharray="10 6"
            d={`M ${xOratio} ${Y1} C ${xOratio + 50} ${emberY}, ${xLectio - 50} ${emberY}, ${xLectio} ${Y1}`} />
          <text className="st-label" x={(xOratio + xLectio) / 2} y={emberY - 34} textAnchor="middle" fontStyle="italic">
            Quatuor Tempora — the Ember-Day lessons
          </text>
        </g>
        {ember.map((s, i) => {
          const t = (i + 1) / (ember.length + 1);
          const x = xOratio + (xLectio - xOratio) * t;
          return <StationDot key={s.id} s={s} x={x} y={emberY + 14} small stagger={i % 2 === 1} />;
        })}

        {/* Chant switch: parallel routes between Epistle and Gospel */}
        {chants.map((s) => {
          const lane: Record<string, number> = {
            graduale: Y1, alleluia: Y1 - 58, tractus: Y1 + 58, 'graduale-p': Y1 + 112,
          };
          const y = lane[s.id] ?? Y1;
          const active = stationActive(s, season);
          return (
            <g key={s.id} className={active ? '' : 'inactive'}>
              <path className="track" stroke="var(--line-catechumens)" strokeWidth={active ? 6 : 3}
                d={y === Y1
                  ? `M ${xLectio} ${Y1} H ${xEvang}`
                  : `M ${xLectio} ${Y1} C ${xLectio + 55} ${y}, ${xEvang - 55} ${y}, ${xEvang} ${Y1}`} />
              <StationDot s={s} x={(xLectio + xEvang) / 2} y={y} small={y !== Y1} />
            </g>
          );
        })}
        <text className="st-label" x={(xLectio + xEvang) / 2} y={Y1 + 148} textAnchor="middle" fontStyle="italic">
          seasonal chant routes — Gradual · Alleluia · Tract
        </text>

        {/* Trunk 1 stations */}
        {cat.map((s, i) => <StationDot key={s.id} s={s} x={catX.get(s.id)!} y={Y1} stagger={i % 2 === 1} />)}

        {/* Super populum spur (Lenten ferias) */}
        {superPopulum && (
          <g className={spActive ? '' : 'inactive'}>
            <path className="track" stroke="var(--line-faithful)" strokeWidth={5} strokeDasharray="10 6"
              d={`M ${xPost} ${Y2} C ${xPost + 30} ${Y2 + 66}, ${xIte - 30} ${Y2 + 66}, ${xIte} ${Y2}`} />
            <StationDot s={superPopulum} x={(xPost + xIte) / 2} y={Y2 + 66} small />
          </g>
        )}

        {/* Trunk 2 stations */}
        {fai.map((s, i) => <StationDot key={s.id} s={s} x={faiX(i)} y={Y2} stagger={i % 2 === 1} />)}

        {/* Legend */}
        <g className="legend" transform={`translate(${X0 - 45}, 660)`}>
          <circle cx={8} cy={0} r={8} fill="#fff" stroke={accent} strokeWidth={4} />
          <circle cx={8} cy={0} r={3} fill={accent} />
          <text x={24} y={4}>Proper of the day — interchange, in the day's color ({String(day?.color ?? '')})</text>
          <circle cx={420} cy={0} r={7} fill="#fff" stroke="#4a4034" strokeWidth={3} />
          <text x={434} y={4}>Ordinary (invariable)</text>
          <circle cx={600} cy={0} r={7} fill="#fff" stroke="#4a4034" strokeWidth={2} strokeDasharray="3 3" />
          <text x={614} y={4}>Conditional by rubric</text>
          <text x={790} y={4} fontStyle="italic">Faded = not travelled in {season}</text>
        </g>
      </svg>
    </div>
  );
}
