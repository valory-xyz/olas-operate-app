#!/usr/bin/env node
/**
 * License allowlist gate for the FRONTEND tree. Mirrors the backend's
 * tomte/configs/tox.ini [Licenses] block run by liccheck under PARANOID:
 * every installed dependency's license must be in the allowlist, resolved
 * by a `licenseOverrides` entry, or exempted by exact NAME. UNKNOWN /
 * unlisted licenses FAIL — they are resolved, not silenced.
 *
 * Necessary because npm has no native license-policy gate, and
 * `license-checker` (the original) reports any package without an SPDX
 * string in its package.json as UNKNOWN. The rseidelsohn fork reads
 * LICENSE files for those, giving a real classification surface.
 *
 * See SUPPLY-CHAIN-SECURITY.md (to be added in Phase 4) and
 * CONTRIBUTING.md ("Supply-chain checks") for the contributor workflow.
 *
 * Wrapper is duplicated under scripts/license-check.mjs in the root tree —
 * keep the two files in sync. Each reads its own tree's
 * .supply-chain/license-allowlist.json.
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve('.');
const ALLOWLIST_PATH = resolve(ROOT, '.supply-chain/license-allowlist.json');
const SELF_PKG = (() => {
  try {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    return `${pkg.name}@${pkg.version}`;
  } catch {
    return null;
  }
})();

const CHECKER_TIMEOUT_MS = 5 * 60 * 1000;

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) {
    console.error(`::error::missing ${ALLOWLIST_PATH}`);
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch (err) {
    console.error(`::error::failed to parse ${ALLOWLIST_PATH}: ${err.message}`);
    process.exit(2);
  }
  for (const entry of [...(data.licenseOverrides || []), ...(data.exemptions || [])]) {
    const errors = [];
    if (typeof entry.package !== 'string' || !entry.package.trim()) errors.push('`package` is required');
    if (typeof entry.spdx !== 'string' || !entry.spdx.trim()) errors.push('`spdx` is required');
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) errors.push('`reason` is required');
    if (typeof entry.added !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.added)) {
      errors.push('`added` must be YYYY-MM-DD');
    }
    if (typeof entry.review !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.review)) {
      errors.push('`review` must be YYYY-MM-DD');
    }
    if (errors.length) {
      console.error(`::error::malformed entry in ${ALLOWLIST_PATH}: ${errors.join('; ')} — ${JSON.stringify(entry)}`);
      process.exit(2);
    }
  }
  return data;
}

function runChecker() {
  return new Promise((resolvePromise) => {
    const child = spawn(
      'npx',
      ['license-checker-rseidelsohn', '--json', '--excludePrivatePackages', '--start', '.'],
      { stdio: ['ignore', 'pipe', 'pipe'], shell: true },
    );
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, CHECKER_TIMEOUT_MS);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        console.error(`::error::license-checker timed out after ${CHECKER_TIMEOUT_MS / 1000}s.`);
        process.exit(2);
      }
      resolvePromise({ stdout, stderr, code });
    });
  });
}

const NORMALIZE = new Map([
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

function normalize(token) {
  const t = String(token).trim().replace(/^[()]+|[()]+$/g, '').trim();
  return NORMALIZE.get(t.toLowerCase()) || t;
}

function evalExpr(raw, allowedSet, unauthorizedSet) {
  if (raw == null) return 'unknown';

  if (Array.isArray(raw)) {
    const parts = raw.map(normalize);
    if (parts.some((p) => allowedSet.has(p))) return 'allowed';
    if (parts.length && parts.every((p) => unauthorizedSet.has(p))) return 'unauthorized';
    return 'unknown';
  }

  const s = String(raw).trim();
  if (!s || /^UNKNOWN$/i.test(s) || /^Custom:/i.test(s)) return 'unknown';

  const inner = s.replace(/^\((.*)\)$/, '$1');

  if (/\sOR\s/i.test(inner)) {
    const parts = inner.split(/\sOR\s/i).map(normalize);
    if (parts.some((p) => allowedSet.has(p))) return 'allowed';
    if (parts.every((p) => unauthorizedSet.has(p))) return 'unauthorized';
    return 'unknown';
  }
  if (/\sAND\s/i.test(inner)) {
    const parts = inner.split(/\sAND\s/i).map(normalize);
    if (parts.some((p) => unauthorizedSet.has(p))) return 'unauthorized';
    if (parts.every((p) => allowedSet.has(p))) return 'allowed';
    return 'unknown';
  }

  const t = normalize(inner);
  if (allowedSet.has(t)) return 'allowed';
  if (unauthorizedSet.has(t)) return 'unauthorized';
  return 'unknown';
}

const allowlist = loadAllowlist();
const allowedSet = new Set(allowlist.allowedSpdx || []);
const unauthorizedSet = new Set(allowlist.unauthorizedSpdx || []);
const overrideByName = new Map();
for (const e of allowlist.licenseOverrides || []) overrideByName.set(e.package, e);
const exemptByName = new Map();
for (const e of allowlist.exemptions || []) exemptByName.set(e.package, e);

const { stdout, stderr, code } = await runChecker();
if (!stdout) {
  console.error('::error::license-checker produced no output.');
  if (stderr) console.error(stderr);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(stdout);
} catch (err) {
  console.error(`::error::failed to parse license-checker output: ${err.message}`);
  if (code !== 0) console.error(`  (checker exit code: ${code})`);
  process.exit(2);
}

const violations = [];
const overridden = [];
const exempted = [];

const today = new Date().toISOString().slice(0, 10);
const expired = [];
const matchedNames = new Set();

for (const [pkgVersion, info] of Object.entries(report)) {
  if (SELF_PKG && pkgVersion === SELF_PKG) continue;
  const lastAt = pkgVersion.lastIndexOf('@');
  const name = lastAt > 0 ? pkgVersion.slice(0, lastAt) : pkgVersion;

  const ex = exemptByName.get(name);
  if (ex) {
    matchedNames.add(name);
    exempted.push({ name, pkgVersion, declared: info.licenses, entry: ex });
    if (ex.review && ex.review < today) expired.push({ kind: 'exemption', name, entry: ex });
    continue;
  }

  const ov = overrideByName.get(name);
  const effective = ov ? ov.spdx : info.licenses;
  if (ov) {
    matchedNames.add(name);
    overridden.push({ name, pkgVersion, declared: info.licenses, entry: ov });
    if (ov.review && ov.review < today) expired.push({ kind: 'override', name, entry: ov });
  }

  const cls = evalExpr(effective, allowedSet, unauthorizedSet);
  if (cls === 'allowed') continue;

  violations.push({
    name,
    pkgVersion,
    declared: info.licenses,
    effective,
    cls,
    path: info.path,
    repository: info.repository,
  });
}

const stale = [];
for (const e of allowlist.licenseOverrides || []) {
  if (!matchedNames.has(e.package)) stale.push({ kind: 'override', entry: e });
}
for (const e of allowlist.exemptions || []) {
  if (!matchedNames.has(e.package)) stale.push({ kind: 'exemption', entry: e });
}

if (overridden.length) {
  console.log(`Overrides applied (${overridden.length}):`);
  for (const { pkgVersion, declared, entry } of overridden) {
    console.log(`  ${pkgVersion}  declared=${JSON.stringify(declared)} → spdx=${entry.spdx}`);
    console.log(`    ${entry.reason}`);
    console.log(`    added ${entry.added}, review by ${entry.review}`);
  }
  console.log('');
}
if (exempted.length) {
  console.log(`Exemptions applied (${exempted.length}):`);
  for (const { pkgVersion, declared, entry } of exempted) {
    console.log(`  ${pkgVersion}  declared=${JSON.stringify(declared)} → exempt (${entry.spdx})`);
    console.log(`    ${entry.reason}`);
    console.log(`    added ${entry.added}, review by ${entry.review}`);
  }
  console.log('');
}

for (const e of expired) {
  console.log(
    `::warning::License ${e.kind} for ${e.name} expired on ${e.entry.review}. Re-justify with a fresh review date or remove if the upstream license has been corrected.`,
  );
}
for (const s of stale) {
  console.log(
    `::warning::License ${s.kind} for ${s.entry.package} is no longer in the tree. Remove it from .supply-chain/license-allowlist.json.`,
  );
}

if (violations.length) {
  console.error('');
  console.error(`::error::${violations.length} license violation(s) in the installed tree:`);
  for (const v of violations) {
    console.error(`  [${v.cls}] ${v.pkgVersion}`);
    console.error(`    license: ${JSON.stringify(v.declared)}`);
    if (v.effective !== v.declared) console.error(`    effective: ${JSON.stringify(v.effective)}`);
    if (v.repository) console.error(`    repo: ${v.repository}`);
    if (v.path) console.error(`    path: ${v.path}`);
    console.error(
      `    fix: add to .supply-chain/license-allowlist.json (allowedSpdx for new permissive licenses, licenseOverrides for UNKNOWNs whose LICENSE file is permissive, exemptions for copyleft that can't be replaced).`,
    );
    console.error('');
  }
  process.exit(1);
}

console.log(
  `license-check: OK (${overridden.length} overridden, ${exempted.length} exempted, 0 violations).`,
);
process.exit(0);
