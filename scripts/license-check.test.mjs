#!/usr/bin/env node
/**
 * Unit tests for the pure helpers exported by scripts/license-check.mjs.
 * Uses Node's built-in test runner (node:test, available in Node ≥18) — no
 * new devDependencies. Run with `yarn test:license-check` or `node --test
 * scripts/license-check.test.mjs`.
 *
 * Edit/exemption matching, drift detection, and the checker.init integration
 * are deliberately out of scope here — they require mocking node_modules and
 * are exercised by the CI license-check job itself on every PR. These tests
 * cover the failure modes a contributor is most likely to hit when adjusting
 * the allowlist: alias normalization, the `*` marker, SPDX OR/AND
 * precedence, and the UNKNOWN/UNLICENSED/Custom early-exits.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalize, evalExpr } from './license-check.lib.mjs';

const allowed = new Set(['MIT', 'Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'Zlib', 'ISC']);
const unauthorized = new Set(['GPL-3.0', 'LGPL-3.0', 'AGPL-3.0']);

test('normalize: passes through canonical SPDX', () => {
  assert.equal(normalize('MIT'), 'MIT');
  assert.equal(normalize('Apache-2.0'), 'Apache-2.0');
});

test('normalize: strips the rseidelsohn `*` "guessed from file" marker', () => {
  assert.equal(normalize('MIT*'), 'MIT');
  assert.equal(normalize('Apache-2.0**'), 'Apache-2.0');
});

test('normalize: strips outer parens', () => {
  assert.equal(normalize('(MIT)'), 'MIT');
  assert.equal(normalize('((MIT))'), 'MIT');
});

test('normalize: applies npm-ecosystem aliases', () => {
  assert.equal(normalize('Apache2'), 'Apache-2.0');
  assert.equal(normalize('Apache 2.0'), 'Apache-2.0');
  assert.equal(normalize('Apache License 2.0'), 'Apache-2.0');
  assert.equal(normalize('Apache Software License'), 'Apache-2.0');
  assert.equal(normalize('Expat'), 'MIT');
  assert.equal(normalize('MIT license'), 'MIT');
  assert.equal(normalize('new BSD'), 'BSD-3-Clause');
  assert.equal(normalize('Simplified BSD'), 'BSD-2-Clause');
});

test('normalize: alias lookup is case-insensitive', () => {
  assert.equal(normalize('APACHE2'), 'Apache-2.0');
  assert.equal(normalize('expat'), 'MIT');
});

test('normalize: unknown tokens pass through unchanged', () => {
  assert.equal(normalize('SomeUnknownLicense'), 'SomeUnknownLicense');
});

test('evalExpr: plain allowed SPDX → allowed', () => {
  assert.equal(evalExpr('MIT', allowed, unauthorized), 'allowed');
});

test('evalExpr: plain unauthorized SPDX → unauthorized', () => {
  assert.equal(evalExpr('GPL-3.0', allowed, unauthorized), 'unauthorized');
});

test('evalExpr: plain unknown SPDX → unknown', () => {
  assert.equal(evalExpr('SomeNewLicense', allowed, unauthorized), 'unknown');
});

test('evalExpr: UNKNOWN / UNLICENSED / Custom: short-circuit to unknown', () => {
  assert.equal(evalExpr('UNKNOWN', allowed, unauthorized), 'unknown');
  assert.equal(evalExpr('unknown', allowed, unauthorized), 'unknown');
  assert.equal(evalExpr('UNLICENSED', allowed, unauthorized), 'unknown');
  assert.equal(evalExpr('Custom: see LICENSE', allowed, unauthorized), 'unknown');
});

test('evalExpr: null / undefined / empty string → unknown', () => {
  assert.equal(evalExpr(null, allowed, unauthorized), 'unknown');
  assert.equal(evalExpr(undefined, allowed, unauthorized), 'unknown');
  assert.equal(evalExpr('', allowed, unauthorized), 'unknown');
});

test('evalExpr: npm-legacy array form treated as OR', () => {
  assert.equal(evalExpr(['MIT', 'Apache2'], allowed, unauthorized), 'allowed');
  assert.equal(evalExpr(['GPL-3.0', 'LGPL-3.0'], allowed, unauthorized), 'unauthorized');
  assert.equal(evalExpr(['MIT', 'GPL-3.0'], allowed, unauthorized), 'allowed');
  assert.equal(evalExpr([], allowed, unauthorized), 'unknown');
});

test('evalExpr: SPDX OR — any allowed disjunct passes', () => {
  assert.equal(evalExpr('MIT OR GPL-3.0', allowed, unauthorized), 'allowed');
  assert.equal(evalExpr('GPL-3.0 OR LGPL-3.0', allowed, unauthorized), 'unauthorized');
});

test('evalExpr: SPDX AND — all must be allowed; any unauthorized fails', () => {
  assert.equal(evalExpr('MIT AND Zlib', allowed, unauthorized), 'allowed');
  assert.equal(evalExpr('MIT AND GPL-3.0', allowed, unauthorized), 'unauthorized');
  assert.equal(evalExpr('MIT AND SomeNewLicense', allowed, unauthorized), 'unknown');
});

test('evalExpr: outer parens stripped before splitting', () => {
  assert.equal(evalExpr('(MIT OR GPL-3.0)', allowed, unauthorized), 'allowed');
  assert.equal(evalExpr('(MIT AND Zlib)', allowed, unauthorized), 'allowed');
});

test('evalExpr: AND binds tighter than OR — SPDX precedence', () => {
  // `A AND B OR C` === `(A AND B) OR C`
  // MIT AND GPL-3.0 → unauthorized; OR with MIT → allowed
  assert.equal(evalExpr('MIT AND GPL-3.0 OR MIT', allowed, unauthorized), 'allowed');
  // GPL-3.0 OR MIT AND Zlib → GPL-3.0 OR (MIT AND Zlib) → allowed
  assert.equal(evalExpr('GPL-3.0 OR MIT AND Zlib', allowed, unauthorized), 'allowed');
});

test('evalExpr: alias normalization applies inside OR/AND', () => {
  assert.equal(evalExpr('Apache2 OR GPL-3.0', allowed, unauthorized), 'allowed');
  assert.equal(evalExpr('Expat AND Zlib', allowed, unauthorized), 'allowed');
});

test('evalExpr: `*` marker stripped inside compound expressions', () => {
  assert.equal(evalExpr('MIT*', allowed, unauthorized), 'allowed');
  assert.equal(evalExpr(['MIT*', 'GPL-3.0'], allowed, unauthorized), 'allowed');
});
