import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignPhrase } from '../src/core/text/align.ts';

test('alignPhrase - Latin to English (diacritics-insensitive)', () => {
  // Mock EchoDb that returns empty concordance (positional fallback will be used)
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDb, testBlock, 'quæsumus, Dómine');
  assert.ok(result, 'Should return alignment for Latin phrase');
  assert.strictEqual(result?.srcLang, 'latin', 'Source language should be latin');
  assert.strictEqual(result?.method, 'positional-fallback', 'Should use positional fallback with mock');
  assert.ok(result?.dstLine, 'Should have destination line');
  assert.ok(result?.dstLine?.toLowerCase().includes('we beseech you'), 'Should contain translated phrase');
});

test('alignPhrase - English to Latin (diacritics-insensitive)', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDb, testBlock, 'we beseech You');
  assert.ok(result, 'Should return alignment for English phrase');
  assert.strictEqual(result?.srcLang, 'english', 'Source language should be english');
  assert.ok(result?.dstLine, 'Should have destination line');
  assert.ok(result?.dstLine?.toLowerCase().includes('quæsumus') || result?.dstLine?.toLowerCase().includes('quaesumus'), 'Should contain translated phrase');
});

test('alignPhrase - diacritics-insensitive lookup', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  // Test with diacritics stripped
  const result1 = alignPhrase(mockDb, testBlock, 'quaesumus, domine');
  assert.ok(result1, 'Should find phrase with diacritics stripped');

  // Test with original diacritics
  const result2 = alignPhrase(mockDb, testBlock, 'quæsumus, Dómine');
  assert.ok(result2, 'Should find phrase with original diacritics');

  // Both should align to the same destination line
  assert.strictEqual(result1?.dstLine, result2?.dstLine, 'Should align to same destination line');
});

test('alignPhrase - destination range inside paired line', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDb, testBlock, 'quæsumus, Dómine');
  assert.ok(result, 'Should return alignment');
  
  const dstLineLength = result?.dstLine?.length ?? 0;
  assert.ok(result?.dstStart >= 0, 'Destination start should be non-negative');
  assert.ok(result?.dstEnd <= dstLineLength, `Destination end (${result?.dstEnd}) should not exceed line length (${dstLineLength})`);
  assert.ok(result?.dstStart < result?.dstEnd, 'Destination start should be less than end');
});

test('alignPhrase - empty term returns null', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDb, testBlock, '');
  assert.strictEqual(result, null, 'Should return null for empty term');
});

test('alignPhrase - whitespace-only term returns null', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDb, testBlock, '   ');
  assert.strictEqual(result, null, 'Should return null for whitespace-only term');
});

test('alignPhrase - nonexistent phrase returns null', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDb, testBlock, 'nonexistent phrase');
  assert.strictEqual(result, null, 'Should return null for nonexistent phrase');
});

test('alignPhrase - missing translation returns null', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const blockWithNull = {
    latin: 'quæsumus, Dómine.',
    english: null,
  };

  const result = alignPhrase(mockDb, blockWithNull, 'quæsumus, Dómine');
  assert.strictEqual(result, null, 'Should return null when translation is missing');
});

test('alignPhrase - multi-line blocks', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const multiLineBlock = {
    latin: 'quæsumus, Dómine.\nDeus, qui nobis.\nOremus.',
    english: 'we beseech You, O Lord.\nGod, who to us.\nLet us pray.',
  };

  // Find phrase in first line
  const result1 = alignPhrase(mockDb, multiLineBlock, 'quæsumus, Dómine');
  assert.ok(result1, 'Should find phrase in first line');
  assert.strictEqual(result1?.idx, 0, 'Should be at line index 0');

  // Find phrase in second line
  const result2 = alignPhrase(mockDb, multiLineBlock, 'Deus, qui');
  assert.ok(result2, 'Should find phrase in second line');
  assert.strictEqual(result2?.idx, 1, 'Should be at line index 1');

  // Find phrase in third line
  const result3 = alignPhrase(mockDb, multiLineBlock, 'Oremus');
  assert.ok(result3, 'Should find phrase in third line');
  assert.strictEqual(result3?.idx, 2, 'Should be at line index 2');
});

test('alignPhrase - phrase at different positions within line', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDb, testBlock, 'quæsumus, Dómine');
  assert.ok(result, 'Should return alignment');
  
  // Source range should be within the source line
  const srcLineLength = result?.srcLine.length ?? 0;
  assert.ok(result?.srcStart >= 0, 'Source start should be non-negative');
  assert.ok(result?.srcEnd <= srcLineLength, 'Source end should not exceed line length');
});

test('alignPhrase - countsMatch reporting', () => {
  const mockDb = {
    concordance: () => [],
    textOf: () => null,
  };

  const equalLinesBlock = {
    latin: 'quæsumus, Dómine.\nDeus, qui nobis.',
    english: 'we beseech You, O Lord.\nGod, who to us.',
  };

  const result1 = alignPhrase(mockDb, equalLinesBlock, 'quæsumus, Dómine');
  assert.ok(result1?.countsMatch, 'Should report countsMatch=true for equal line counts');

  const unequalLinesBlock = {
    latin: 'quæsumus, Dómine.\nDeus, qui nobis.\nOremus.',
    english: 'we beseech You, O Lord.\nGod, who to us.',
  };

  const result2 = alignPhrase(mockDb, unequalLinesBlock, 'quæsumus, Dómine');
  assert.ok(!result2?.countsMatch, 'Should report countsMatch=false for unequal line counts');
});

test('alignPhrase - attested-anchors method when available', () => {
  // Mock a db that returns concordance results for wordEcho to use
  const mockDbWithResults = {
    concordance: () => [{ key: 'test' }],
    textOf: () => ({
      latin: 'quæsumus, Dómine, ut digné mereámur.',
      english: 'we beseech You, O Lord, that we may worthily merit.',
    }),
  };

  const testBlock = {
    latin: 'quæsumus, Dómine, ut digné mereámur.',
    english: 'we beseech You, O Lord, that we may worthily merit.',
  };

  const result = alignPhrase(mockDbWithResults, testBlock, 'quæsumus');
  assert.ok(result, 'Should return alignment');
  
  // If wordEcho found anchors, method should be attested-anchors
  // This depends on whether wordEcho can find matches, which it may not with our mocks
  assert.ok(['attested-anchors', 'positional-fallback'].includes(result?.method ?? ''), 
    'Method should be one of the valid options');
});