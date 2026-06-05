#!/usr/bin/env node
/**
 * License allowlist gate for the FRONTEND tree. Mirrors the backend's
 * tomte/configs/tox.ini [Licenses] block run by liccheck under PARANOID:
 * every PRODUCTION dependency's license must be in the allowlist, resolved
 * by a `licenseOverrides` entry, or exempted (by exact NAME for general
 * packages, by NARROW PREFIX only for publisher-controlled platform-binary
 * families). UNKNOWN / unlisted licenses FAIL — they are resolved, not
 * silenced.
 *
 * Scope = production. Mirrors `liccheck` running against the backend's
 * `tomte freeze-dependencies` output. devDependencies don't ship and
 * generate considerable transitive-license noise, so they are not scanned.
 * Override via `"scope": "all"` in the config if a future need arises.
 *
 * Wrapper is duplicated under scripts/license-check.mjs in the root tree —
 * keep the two files in sync. Each reads its own tree's
 * .supply-chain/license-allowlist.json.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const checker = require('license-checker-rseidelsohn');

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
  const validateEntry = (entry, kind, keyField) => {
    const errors = [];
    if (typeof entry[keyField] !== 'string' || !entry[keyField].trim()) errors.push(`\`${keyField}\` is required`);
    if (typeof entry.spdx !== 'string' || !entry.spdx.trim()) errors.push('`spdx` is required');
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) errors.push('`reason` is required');
    if (typeof entry.added !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.added)) {
      errors.push('`added` must be YYYY-MM-DD');
    }
    if (typeof entry.review !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.review)) {
      errors.push('`review` must be YYYY-MM-DD');
    }
    if (errors.length) {
      console.error(`::error::malformed ${kind} entry in ${ALLOWLIST_PATH}: ${errors.join('; ')} — ${JSON.stringify(entry)}`);
      process.exit(2);
    }
  };
  for (const entry of data.licenseOverrides || []) validateEntry(entry, 'licenseOverrides', 'package');
  for (const entry of data.exemptions || []) validateEntry(entry, 'exemptions', 'package');
  for (const entry of data.exemptionPrefixes || []) validateEntry(entry, 'exemptionPrefixes', 'prefix');
  return data;
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
  const t = String(token)
    .replace(/^[()]+|[()]+$/g, '')
    .replace(/\*+$/, '')
    .trim();
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

const allowlist = loadAllowlist();
const allowedSet = new Set(allowlist.allowedSpdx || []);
const unauthorizedSet = new Set(allowlist.unauthorizedSpdx || []);
const overrideByName = new Map();
for (const e of allowlist.licenseOverrides || []) overrideByName.set(e.package, e);
const exemptByName = new Map();
for (const e of allowlist.exemptions || []) exemptByName.set(e.package, e);
const exemptPrefixes = allowlist.exemptionPrefixes || [];

const scope = allowlist.scope || 'production';
if (scope !== 'production' && scope !== 'all') {
  console.error(`::error::invalid scope "${scope}" in ${ALLOWLIST_PATH} (must be "production" or "all")`);
  process.exit(2);
}

const initOpts = { start: ROOT, excludePrivatePackages: true };
if (scope === 'production') initOpts.production = true;

checker.init(initOpts, (err, report) => {
  if (err) {
    console.error('::error::license-checker failed to scan the dependency tree:', err.message || err);
    process.exit(2);
  }

  const violations = [];
  const overridden = [];
  const exempted = [];
  const prefixHits = new Map();

  const today = new Date().toISOString().slice(0, 10);
  const expired = [];
  const matchedNames = new Set();
  const matchedPrefixes = new Set();

  for (const [pkgVersion, info] of Object.entries(report)) {
    if (SELF_PKG && pkgVersion === SELF_PKG) continue;
    const lastAt = pkgVersion.lastIndexOf('@');
    const name = lastAt > 0 ? pkgVersion.slice(0, lastAt) : pkgVersion;

    const ex = exemptByName.get(name);
    if (ex) {
      matchedNames.add(name);
      exempted.push({ name, pkgVersion, declared: info.licenses, entry: ex, via: 'name' });
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

    const prefixEntry = exemptPrefixes.find((p) => name.startsWith(p.prefix));
    if (prefixEntry) {
      matchedPrefixes.add(prefixEntry.prefix);
      const list = prefixHits.get(prefixEntry.prefix) || [];
      list.push({ pkgVersion, declared: info.licenses });
      prefixHits.set(prefixEntry.prefix, list);
      if (prefixEntry.review && prefixEntry.review < today) {
        expired.push({ kind: 'exemptionPrefix', name: prefixEntry.prefix, entry: prefixEntry });
      }
      continue;
    }

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
    if (!matchedNames.has(e.package)) stale.push({ kind: 'override', name: e.package, entry: e });
  }
  for (const e of allowlist.exemptions || []) {
    if (!matchedNames.has(e.package)) stale.push({ kind: 'exemption', name: e.package, entry: e });
  }
  for (const e of allowlist.exemptionPrefixes || []) {
    if (!matchedPrefixes.has(e.prefix)) stale.push({ kind: 'exemptionPrefix', name: e.prefix, entry: e });
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
  if (prefixHits.size) {
    console.log(`Prefix exemptions matched (${prefixHits.size}):`);
    for (const [prefix, hits] of prefixHits) {
      const entry = exemptPrefixes.find((p) => p.prefix === prefix);
      console.log(`  prefix ${prefix} → exempt (${entry.spdx}); ${hits.length} package(s)`);
      for (const h of hits) console.log(`    ${h.pkgVersion}  declared=${JSON.stringify(h.declared)}`);
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
      `::warning::License ${s.kind} for ${s.name} is no longer matched by any installed package. Remove it from .supply-chain/license-allowlist.json.`,
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
    }
    console.error(
      '\nResolve each:\n' +
        '  (a) license is fine          → add the SPDX id to allowedSpdx[]\n' +
        '  (b) declared but mis-mapped  → add a licenseOverrides[] entry (CORRECTION; not a policy exception)\n' +
        '  (c) accepted copyleft        → add to exemptions[] (exact name) with reason + dated review\n' +
        '  (d) removable                → drop the dependency\n' +
        'Config: .supply-chain/license-allowlist.json\n',
    );
    process.exit(1);
  }

  const acceptedSummary = `${overridden.length} overridden, ${exempted.length} exempted by name, ${prefixHits.size} prefix group(s)`;
  console.log(`license-check: OK (${acceptedSummary}, 0 violations) — scope=${scope}.`);
  process.exit(0);
});
