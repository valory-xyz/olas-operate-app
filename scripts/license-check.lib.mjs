/**
 * Pure helpers extracted from scripts/license-check.mjs so they can be
 * unit-tested without firing the script's top-level side effects
 * (allowlist load, checker.init scan, process.exit). Imported by both
 * the script and scripts/license-check.test.mjs.
 *
 * No I/O, no exit, no global state — same input → same output.
 */

// Aliases for npm-ecosystem license strings that mean an SPDX identifier
// but don't match it character-for-character. Lower-cased on both sides.
export const NORMALIZE = new Map([
  ['apache2', 'Apache-2.0'],
  ['apache 2.0', 'Apache-2.0'],
  ['apache license 2.0', 'Apache-2.0'],
  ['apache license, version 2.0', 'Apache-2.0'],
  ['apache license version 2.0', 'Apache-2.0'],
  ['apache software license', 'Apache-2.0'],
  ['expat', 'MIT'],
  ['mit license', 'MIT'],
  ['new bsd', 'BSD-3-Clause'],
  ['(new) bsd', 'BSD-3-Clause'],
  ['simplified bsd', 'BSD-2-Clause'],
  ['3-clause bsd', 'BSD-3-Clause'],
  ['bsd 3-clause', 'BSD-3-Clause'],
]);

/**
 * Strip surrounding parens AND the trailing `*` that license-checker-rseidelsohn
 * appends when the SPDX was inferred from the LICENSE file rather than declared
 * in package.json. Apply alias map case-insensitively. Lookup must succeed on
 * `MIT*` and `Apache2` the same as on `MIT` / `Apache-2.0`.
 */
export function normalize(token) {
  const t = String(token)
    .replace(/^[()]+|[()]+$/g, '')
    .replace(/\*+$/, '')
    .trim();
  return NORMALIZE.get(t.toLowerCase()) || t;
}

/**
 * Evaluate an SPDX-ish license expression against the allow/deny lists.
 * Returns 'allowed' | 'unauthorized' | 'unknown'.
 *
 * SPDX precedence: AND binds tighter than OR. `A AND B OR C` === `(A AND B) OR C`.
 * Splitting on OR at the top level naturally respects this (recursion handles AND
 * inside each disjunct).
 *
 * - Array of strings → npm legacy OR (any allowed → allowed; all unauthorized → unauthorized).
 * - String with " OR " → SPDX OR.
 * - String with " AND " → SPDX AND.
 * - Plain string → look up directly (after normalization, incl. `*` strip).
 */
export function evalExpr(raw, allowedSet, unauthorizedSet) {
  if (raw == null) return 'unknown';

  if (Array.isArray(raw)) {
    const parts = raw.map(normalize);
    if (parts.some((p) => allowedSet.has(p))) return 'allowed';
    if (parts.length && parts.every((p) => unauthorizedSet.has(p))) return 'unauthorized';
    return 'unknown';
  }

  const s = String(raw).trim();
  if (!s || /^UNKNOWN$/i.test(s) || /^UNLICENSED$/i.test(s) || /^Custom:/i.test(s)) return 'unknown';

  const inner = s.replace(/^\((.*)\)$/, '$1');

  if (/\sOR\s/i.test(inner)) {
    const parts = inner.split(/\sOR\s/i).map((p) => evalExpr(p, allowedSet, unauthorizedSet));
    if (parts.some((p) => p === 'allowed')) return 'allowed';
    if (parts.every((p) => p === 'unauthorized')) return 'unauthorized';
    return 'unknown';
  }
  if (/\sAND\s/i.test(inner)) {
    const parts = inner.split(/\sAND\s/i).map((p) => evalExpr(p, allowedSet, unauthorizedSet));
    if (parts.some((p) => p === 'unauthorized')) return 'unauthorized';
    if (parts.every((p) => p === 'allowed')) return 'allowed';
    return 'unknown';
  }

  const t = normalize(inner);
  if (allowedSet.has(t)) return 'allowed';
  if (unauthorizedSet.has(t)) return 'unauthorized';
  return 'unknown';
}
