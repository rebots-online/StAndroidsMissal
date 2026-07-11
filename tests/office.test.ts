/**
 * Golden tests for the Divine Office engine (CHECKLIST OB.4 subset) —
 * headless, against the committed assets/missal.db.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openAdapter } from '../scripts/db-adapter.mjs';
import { resolveDay } from '../src/core/data/liturgicalDay.ts';
import { buildHour } from '../src/core/office/engine.ts';
import type { CorpusDb } from '../src/core/data/corpusDb.ts';

const db = openAdapter('assets/missal.db') as unknown as CorpusDb;

test('office plane ingested: schema baselines', () => {
  const day0 = db.getPsalmSchema('Day0', 'Laudes1');
  assert.deepEqual(
    day0.map((s) => s.ref),
    ['92', '99', '62', '210', '148'],
    'Sunday Lauds I psalms',
  );
  const matins = db.getPsalmSchema('Day0', 'Matutinum');
  assert.equal(matins.length, 9, 'Sunday Matins has nine psalm slots');
  assert.ok(db.getSkeleton('Laudes').length > 30, 'Laudes skeleton present');
  assert.ok(db.getPsalm('94')?.latin?.includes('Veníte'), 'Ps 94 text');
});

test('Sunday Lauds (Pent VI, 2026-07-05) builds full psalmody + frame', () => {
  const day = resolveDay(db, '2026-07-05');
  assert.match(day.feastName ?? '', /Dominica VI Post Pentecosten/);
  const entries = buildHour(db, day, 'laudes');
  const titles = entries.map((e) => e.title);

  const psalms = titles.filter((t) => /^(Psalmus|Canticum \()/.test(t));
  assert.equal(psalms.length, 5, `five psalmody slots, got: ${psalms.join(', ')}`);
  assert.ok(titles.includes('Capitulum'), 'has Capitulum');
  assert.ok(titles.includes('Hymnus'), 'has Hymnus');
  assert.ok(titles.some((t) => t.startsWith('Ant. ad Benedictus')), 'has Benedictus antiphon');
  assert.ok(titles.some((t) => t.startsWith('Canticum: Benedictus')), 'has Benedictus');
  const oratio = entries.find((e) => e.title === 'Oratio' && !e.rubric && e.latin);
  assert.ok(oratio?.latin && oratio.latin.length > 40, 'Oratio has real text');
  // Deus in adjutorium comes from the Incipit block.
  assert.ok(entries.some((e) => e.latin?.includes('Deus + in adjutórium') || e.latin?.includes('Deus in adjutórium')), 'Incipit');
});

test('Sunday Matins builds invitatory, nocturns, lessons, Te Deum', () => {
  const day = resolveDay(db, '2026-07-05');
  const entries = buildHour(db, day, 'matutinum');
  const titles = entries.map((e) => e.title);
  assert.ok(titles.includes('Invitatorium'), 'invitatory');
  assert.ok(titles.some((t) => t.startsWith('Psalmus 94')), 'Venite');
  const lessons = titles.filter((t) => /^Lectio \d/.test(t));
  assert.ok(lessons.length >= 3, `at least three lessons, got ${lessons.length}`);
  assert.ok(titles.includes('Te Deum'), 'Te Deum on a green Sunday');
  const psalms = titles.filter((t) => /^Psalmus/.test(t) && !t.startsWith('Psalmus 94'));
  assert.ok(psalms.length >= 9, `nine matins psalms, got ${psalms.length}`);
});

test('feast Vespers (Most Precious Blood, 2026-07-01) uses proper antiphons + collect', () => {
  const day = resolveDay(db, '2026-07-01');
  assert.match(day.feastName ?? '', /Pretiosissimi Sanguinis/);
  const entries = buildHour(db, day, 'vesperae');
  const all = entries.map((e) => e.latin ?? '').join('\n');
  // First proper Vespers antiphon of the feast:
  assert.match(all, /Quis est iste|redemísti nos/i, 'proper antiphon text present');
  assert.ok(entries.some((e) => e.title.startsWith('Canticum: Magnificat')), 'Magnificat');
  const oratio = entries.find((e) => e.title === 'Oratio' && !e.rubric && e.latin);
  assert.ok(oratio?.latin, 'feast collect present');
});

test('Compline carries Nunc dimittis and the seasonal Marian antiphon', () => {
  const day = resolveDay(db, '2026-07-05');
  const entries = buildHour(db, day, 'completorium');
  const titles = entries.map((e) => e.title);
  assert.ok(titles.some((t) => t.startsWith('Canticum: Nunc dimittis')), 'Nunc dimittis');
  const marian = entries.find((e) => e.title === 'Antiphona finalis B.M.V.');
  assert.ok(marian?.latin?.includes('Salve'), 'Salve Regina in Time after Pentecost');
});

test('every hour of an arbitrary week renders non-empty, real text', () => {
  for (const iso of ['2026-07-05', '2026-07-06', '2026-07-08', '2026-12-08', '2026-02-25']) {
    const day = resolveDay(db, iso);
    for (const hour of ['matutinum', 'laudes', 'prima', 'tertia', 'sexta', 'nona', 'vesperae', 'completorium']) {
      const entries = buildHour(db, day, hour);
      assert.ok(entries.length >= 4, `${iso} ${hour}: ${entries.length} entries`);
      const text = entries.map((e) => e.latin ?? '').join('');
      assert.ok(text.length > 400, `${iso} ${hour}: substantial text (${text.length})`);
      assert.ok(!/textus deest/.test(text), `${iso} ${hour}: no placeholders`);
    }
  }
});
