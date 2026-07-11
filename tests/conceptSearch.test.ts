import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS, type ConceptDef } from '../src/core/ontology/concepts.ts';

test('CONCEPTS is a non-empty array', () => {
  assert.ok(Array.isArray(CONCEPTS));
  assert.ok(CONCEPTS.length >= 25, `expected >= 25 concepts, got ${CONCEPTS.length}`);
});

test('every concept has required fields', () => {
  for (const c of CONCEPTS) {
    assert.ok(c.id, 'concept must have id');
    assert.ok(c.label, 'concept must have label');
    assert.ok(c.description, 'concept must have description');
    assert.ok(Array.isArray(c.sectionNames), 'concept must have sectionNames array');
    assert.ok(Array.isArray(c.patterns), 'concept must have patterns array');
    assert.ok(Array.isArray(c.keywords), 'concept must have keywords array');
  }
});

test('concept ids are unique', () => {
  const ids = CONCEPTS.map((c) => c.id);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size, 'duplicate concept ids found');
});

test('broader references point to existing concept ids', () => {
  const ids = new Set(CONCEPTS.map((c) => c.id));
  for (const c of CONCEPTS) {
    if (c.broader) {
      assert.ok(ids.has(c.broader), `concept "${c.id}" references unknown broader "${c.broader}"`);
    }
  }
});

test('doxology concept is present and has detection patterns', () => {
  const dox = CONCEPTS.find((c) => c.id === 'doxology');
  assert.ok(dox, 'doxology concept must exist');
  assert.ok(dox.patterns.length > 0, 'doxology must have regex patterns');
  assert.ok(dox.keywords.length > 0, 'doxology must have keywords');
});

test('section-name-based concepts cover major Mass parts', () => {
  const sectionNameConcepts = CONCEPTS.filter((c) => c.sectionNames.length > 0);
  const allSectionNames = new Set(sectionNameConcepts.flatMap((c) => c.sectionNames));
  assert.ok(allSectionNames.has('Introitus'), 'Introitus must be covered');
  assert.ok(allSectionNames.has('Graduale'), 'Graduale must be covered');
  assert.ok(allSectionNames.has('Offertorium'), 'Offertorium must be covered');
  assert.ok(allSectionNames.has('Communio'), 'Communio must be covered');
  assert.ok(allSectionNames.has('Oratio'), 'Oratio must be covered');
  assert.ok(allSectionNames.has('Sanctus'), 'Sanctus must be covered');
  assert.ok(allSectionNames.has('Agnus Dei'), 'Agnus Dei must be covered');
});

test('hierarchy forms a valid tree (no cycles)', () => {
  const idToConcept = new Map(CONCEPTS.map((c) => [c.id, c]));
  for (const c of CONCEPTS) {
    if (!c.broader) continue;
    let cur: ConceptDef | undefined = c;
    const visited = new Set<string>();
    while (cur?.broader) {
      if (visited.has(cur.id)) {
        assert.fail(`cycle detected at concept "${cur.id}"`);
      }
      visited.add(cur.id);
      cur = idToConcept.get(cur.broader);
    }
  }
});
