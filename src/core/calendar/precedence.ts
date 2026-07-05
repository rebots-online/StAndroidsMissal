/**
 * 1962 rubrical precedence — which office "wins" a given day.
 * Port of HelloWord CalendarEngine.resolveWinner, including the T-1 fix:
 * privileged Lenten ferias (rank ≥ 2.1) outrank III-classis feasts (< 4.0).
 */

import type { Season } from './computus.ts';

export interface DayFileMeta {
  key: string; // corpus path, e.g. "Sancti/02-25"
  title: string | null;
  rankClass: string | null;
  rankNum: number;
  color: string | null;
}

const PRIVILEGED_SEASONS: Season[] = ['Advent', 'Lent', 'Paschaltide'];

export function sundayRank(dayOfWeek: number, season: Season): number {
  if (dayOfWeek !== 0) return 0;
  return PRIVILEGED_SEASONS.includes(season) ? 8 : 5;
}

export function resolveWinner(
  dayOfWeek: number,
  season: Season,
  tempora: DayFileMeta | null,
  sancti: DayFileMeta[],
): DayFileMeta | null {
  const topSanctus = sancti[0] ?? null;
  const topSanctusRank = topSanctus?.rankNum ?? 0;
  const sunRank = sundayRank(dayOfWeek, season);

  // Privileged Lenten ferias: only Duplex majus (4.0+) can displace them.
  const privilegedLentenFeria = season === 'Lent' && tempora !== null && tempora.rankNum >= 2.1;
  if (privilegedLentenFeria && topSanctusRank < 4) return tempora;

  if (dayOfWeek === 0 && tempora && sunRank >= topSanctusRank) return tempora;
  if (tempora && tempora.rankNum > topSanctusRank) return tempora;
  return topSanctus ?? tempora ?? null;
}
