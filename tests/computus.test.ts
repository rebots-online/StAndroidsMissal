import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEaster, getWeekKey, getSeason, seasonColor, parseISODate, toISODate } from '../src/core/calendar/computus.ts';
import { resolveWinner } from '../src/core/calendar/precedence.ts';

// Known Easter dates (Gregorian), including the earliest possible (Mar 22)
// and latest possible (Apr 25) occurrences.
const KNOWN_EASTER: Record<number, string> = {
  1818: '1818-03-22',
  1886: '1886-04-25',
  1943: '1943-04-25',
  2000: '2000-04-23',
  2024: '2024-03-31',
  2025: '2025-04-20',
  2026: '2026-04-05',
  2038: '2038-04-25',
};

test('Butcher computus matches known Easter dates', () => {
  for (const [year, iso] of Object.entries(KNOWN_EASTER)) {
    assert.equal(toISODate(getEaster(Number(year))), iso, `Easter ${year}`);
  }
});

test('week keys match DO conventions', () => {
  // Easter Sunday 2026
  assert.equal(getWeekKey(parseISODate('2026-04-05')), 'Pasc0-0');
  // Pentecost Sunday 2026 = Easter + 49
  assert.equal(getWeekKey(parseISODate('2026-05-24')), 'Pasc7-0');
  // Ash Wednesday 2026 = Easter − 46 → belongs to Quinquagesima week (Quadp3)
  assert.equal(getWeekKey(parseISODate('2026-02-18')), 'Quadp3-3');
  // First Sunday of Lent 2026 = Easter − 42
  assert.equal(getWeekKey(parseISODate('2026-02-22')), 'Quad1-0');
  // Lent I Wednesday (Ember Wednesday) — the Quad1-3 fixture used throughout
  assert.equal(getWeekKey(parseISODate('2026-02-25')), 'Quad1-3');
  // Christmas 2026 falls on a Friday
  assert.equal(getWeekKey(parseISODate('2026-12-25')), 'Nat0-5');
  // Time after Pentecost is zero-padded
  const pent = getWeekKey(parseISODate('2026-08-16'));
  assert.match(pent, /^Pent\d{2}-0$/);
});

test('seasons and colors derive from week keys', () => {
  assert.equal(getSeason('Quad1-3'), 'Lent');
  assert.equal(getSeason('Quadp2-4'), 'Pre-Lent');
  assert.equal(getSeason('Pasc3-2'), 'Paschaltide');
  assert.equal(seasonColor('Quad1-3'), 'purple');
  assert.equal(seasonColor('Pent12-4'), 'green');
  assert.equal(seasonColor('Pent12-4', 'St. N., Martyr'), 'red');
});

test('privileged Lenten feria outranks III-classis feast', () => {
  const feria = { key: 'Tempora/Quad1-3', title: 'Feria IV', rankClass: 'Feria major', rankNum: 2.1, color: 'purple' };
  const feast3 = { key: 'Sancti/02-25', title: 'S. N.', rankClass: 'III classis', rankNum: 3, color: 'white' };
  const feast4 = { key: 'Sancti/02-24', title: 'S. Matthiae', rankClass: 'II classis', rankNum: 5, color: 'red' };
  assert.equal(resolveWinner(3, 'Lent', feria, [feast3])?.key, 'Tempora/Quad1-3');
  assert.equal(resolveWinner(3, 'Lent', feria, [feast4])?.key, 'Sancti/02-24');
});
