/**
 * Day resolution — computed on demand from the perpetual calendar and the
 * corpus graph; never pre-generated (cache only what's used).
 */

import { parseISODate, getWeekKey, getSeason, seasonColor } from '../calendar/computus.ts';
import { resolveWinner } from '../calendar/precedence.ts';
import type { CorpusDb } from './corpusDb.ts';
import type { DayInfo } from './types.ts';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const dayCache = new Map<string, DayInfo>();

export function resolveDay(db: CorpusDb, iso: string): DayInfo {
  const cached = dayCache.get(iso);
  if (cached) return cached;

  const date = parseISODate(iso);
  const dow = date.getUTCDay();
  const weekKey = getWeekKey(date);
  const season = getSeason(weekKey);
  const temporaPath = `Tempora/${weekKey}`;

  const tempora = db.asDayMeta(db.getFileNode(temporaPath));
  const sancti = db
    .getSanctiForDate(date.getUTCMonth() + 1, date.getUTCDate())
    .map((n) => db.asDayMeta(n)!)
    .filter((m) => m.rankNum > 0);

  const winner = resolveWinner(dow, season, tempora, sancti);
  const feastName = winner?.title ?? null;
  let rank = winner?.rankNum ?? 0.5;
  if (dow === 0 && (winner === null || winner === tempora)) {
    rank = Math.max(rank, ['Advent', 'Lent', 'Paschaltide'].includes(season) ? 8 : 5);
  }

  const info: DayInfo = {
    date: iso,
    weekday: WEEKDAYS[dow],
    weekKey,
    season,
    color: winner?.color ?? seasonColor(weekKey, feastName),
    temporaPath,
    winner,
    feastName,
    rank,
    commemorations: [tempora, ...sancti].filter(
      (m): m is NonNullable<typeof m> => !!m && m.key !== winner?.key && m.rankNum > 0,
    ),
  };
  dayCache.set(iso, info);
  return info;
}
