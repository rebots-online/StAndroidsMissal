/**
 * Perpetual universal calendar — Butcher's Easter computus and
 * Divinum Officium week keys. UTC-safe port of HelloWord
 * liturgical-api/lib/calendar.js (same season boundaries and key format).
 */

const DAY_MS = 86_400_000;

export type Season =
  | 'Advent'
  | 'Christmastide'
  | 'Time after Epiphany'
  | 'Pre-Lent'
  | 'Lent'
  | 'Paschaltide'
  | 'Time after Pentecost';

export type LiturgicalColor = 'purple' | 'white' | 'red' | 'green' | 'black' | 'rose';

/** Easter Sunday for a Gregorian year — Butcher's algorithm (UTC date). */
export function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function utcDate(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day));
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return utcDate(y, m, d);
}

export function toISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/**
 * DO week key for a date, e.g. "Adv1-0", "Quadp3-3", "Pasc0-0", "Pent12-4".
 * Format: {prefix}{week}-{dayOfWeek 0=Sunday}; Pent weeks zero-padded.
 */
export function getWeekKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const dow = date.getUTCDay();

  const easter = getEaster(year);
  const christmas = utcDate(year, 12, 25);
  const advent1 = addDays(christmas, -christmas.getUTCDay() - 21);
  const septuagesima = addDays(easter, -63);
  const lent1Sunday = addDays(easter, -42);
  const pentecostOctaveEnd = addDays(easter, 55);

  if (date >= advent1 && date < christmas) {
    const week = Math.floor(daysBetween(date, advent1) / 7) + 1;
    return `Adv${Math.min(week, 4)}-${dow}`;
  }

  // Christmastide: Dec 25 – Jan 13
  if ((month === 12 && day >= 25) || (month === 1 && day <= 13)) {
    if (month === 12) return `Nat${Math.floor((day - 25) / 7)}-${dow}`;
    return `Nat${Math.floor((day + 6) / 7)}-${dow}`;
  }

  const epiphany = utcDate(year, 1, 6);
  if (date >= epiphany && date < septuagesima) {
    const week = Math.floor(daysBetween(date, epiphany) / 7) + 1;
    return `Epi${week}-${dow}`;
  }

  // Pre-Lent: Septuagesima through the Saturday before Lent I
  // (Ash Wednesday and its ferias belong to Quadp3 — Quinquagesima week).
  if (date >= septuagesima && date < lent1Sunday) {
    const week = Math.floor(daysBetween(date, septuagesima) / 7) + 1;
    return `Quadp${week}-${dow}`;
  }

  if (date >= lent1Sunday && date < easter) {
    const week = 1 + Math.floor(daysBetween(date, lent1Sunday) / 7);
    return `Quad${Math.min(week, 6)}-${dow}`;
  }

  // Paschaltide: Easter Sunday (Pasc0-0) through Pentecost octave Saturday (Pasc7-6)
  if (date >= easter && date <= pentecostOctaveEnd) {
    const week = Math.floor(daysBetween(date, easter) / 7);
    return `Pasc${Math.min(week, 7)}-${dow}`;
  }

  if (date > pentecostOctaveEnd && date < advent1) {
    const week = Math.ceil(daysBetween(date, pentecostOctaveEnd) / 7);
    return `Pent${String(Math.min(week, 24)).padStart(2, '0')}-${dow}`;
  }

  return `Adv4-${dow}`;
}

export function getSeason(weekKey: string): Season {
  if (!weekKey) return 'Time after Pentecost';
  if (weekKey.startsWith('Adv')) return 'Advent';
  if (weekKey.startsWith('Nat')) return 'Christmastide';
  if (weekKey.startsWith('Epi')) return 'Time after Epiphany';
  if (weekKey.startsWith('Quadp')) return 'Pre-Lent';
  if (weekKey.startsWith('Quad')) return 'Lent';
  if (weekKey.startsWith('Pasc')) return 'Paschaltide';
  if (weekKey.startsWith('Pent')) return 'Time after Pentecost';
  return 'Time after Pentecost';
}

/** Season fallback color, with feast-title overrides (martyr/virgin/confessor). */
export function seasonColor(weekKey: string, feast: string | null = null): LiturgicalColor {
  if (feast) {
    const f = feast.toLowerCase();
    if (f.includes('martyr')) return 'red';
    if (f.includes('virgin') || f.includes('confessor')) return 'white';
  }
  switch (getSeason(weekKey)) {
    case 'Advent':
    case 'Pre-Lent':
    case 'Lent':
      return 'purple';
    case 'Christmastide':
    case 'Paschaltide':
    case 'Time after Epiphany':
      return 'white';
    default:
      return 'green';
  }
}
