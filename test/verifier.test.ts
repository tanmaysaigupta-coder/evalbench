import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression, checkNumericClaims } from '../src/verifiers/mathExpr';
import { runAutomatedCheck, analyzeCase } from '../src/engine';
import { CASES } from '../src/fixtures/cases';

test('evaluateExpression handles operator precedence and parens', () => {
  assert.equal(evaluateExpression('2 + 3 * 4'), 14);
  assert.equal(evaluateExpression('(2 + 3) * 4'), 20);
  assert.equal(evaluateExpression('2 ^ 3 ^ 2'), 512); // right-associative: 2^(3^2)
  assert.equal(evaluateExpression('-2 ^ 2'), -4); // unary minus binds looser than ^ here: -(2^2)
});

test('evaluateExpression rejects malformed input', () => {
  assert.throws(() => evaluateExpression('2 +'));
  assert.throws(() => evaluateExpression('2 / 0'));
  assert.throws(() => evaluateExpression('2 + a'));
});

test('checkNumericClaims extracts and verifies "expr = value" claims from prose', () => {
  const results = checkNumericClaims('First, 12000 * 1.157625 = 13891.50, so the total is confirmed.');
  assert.equal(results.length, 1);
  assert.equal(results[0].matches, true);
});

test('checkNumericClaims flags a wrong claimed result', () => {
  const results = checkNumericClaims('8500 * 1.2167 = 10200.00');
  assert.equal(results.length, 1);
  assert.equal(results[0].matches, false);
  assert.ok(Math.abs(results[0].actualValue - 10341.95) < 0.01);
});

test('MATH-01 (correct compound interest) is confirmed by the automated checker', () => {
  const c = CASES.find((c) => c.id === 'MATH-01')!;
  const result = runAutomatedCheck(c);
  assert.equal(result.ran, true);
  assert.ok(result.claims.length >= 1);
  assert.equal(result.allMatch, true);
});

test('MATH-02 (arithmetic slip) is caught by the automated checker', () => {
  const c = CASES.find((c) => c.id === 'MATH-02')!;
  const result = runAutomatedCheck(c);
  assert.equal(result.ran, true);
  assert.equal(result.allMatch, false);
});

test('SCI-01 (dosage division error) is caught by the automated checker', () => {
  const c = CASES.find((c) => c.id === 'SCI-01')!;
  const result = runAutomatedCheck(c);
  assert.equal(result.ran, true);
  assert.equal(result.allMatch, false);
});

test('automated verdicts agree with hand-authored expert verdicts on every automated case', () => {
  for (const c of CASES) {
    if (c.verification !== 'automated') continue;
    const analysis = analyzeCase(c);
    assert.notEqual(analysis.agrees, false, `automated check disagrees with expert verdict on ${c.id}`);
  }
});

test('every case has a non-empty rationale and at least one rubric score set', () => {
  for (const c of CASES) {
    assert.ok(c.expert.rationale.length > 20, `${c.id} rationale looks too short`);
    for (const dim of ['factualAccuracy', 'reasoningValidity', 'instructionFollowing', 'safety', 'clarity'] as const) {
      const score = c.expert.scores[dim];
      assert.ok(score >= 0 && score <= 4, `${c.id} has an out-of-range score for ${dim}`);
    }
  }
});

test('every fail/partial verdict has at least one flagged issue, and non-pairwise pass verdicts have none', () => {
  // For pairwise cases, verdict describes whether the *comparative judgment* was
  // correct — a "pass" can still carry an issue documenting what's wrong with the
  // losing response, so that rule only applies to single-response cases.
  for (const c of CASES) {
    if (c.category === 'pairwise') continue;
    if (c.expert.verdict === 'pass') {
      assert.equal(c.expert.issues.length, 0, `${c.id} is marked pass but has flagged issues`);
    } else {
      assert.ok(c.expert.issues.length > 0, `${c.id} is marked ${c.expert.verdict} but has no flagged issues`);
    }
  }
});

test('pairwise cases have a responseB and a declared winner', () => {
  const pairwise = CASES.filter((c) => c.category === 'pairwise');
  assert.ok(pairwise.length > 0);
  for (const c of pairwise) {
    assert.ok(c.responseB, `${c.id} is pairwise but missing responseB`);
    assert.ok(c.pairwiseWinner, `${c.id} is pairwise but missing pairwiseWinner`);
  }
});

test('case ids are unique', () => {
  const ids = CASES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});
