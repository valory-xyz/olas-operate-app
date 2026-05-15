#!/usr/bin/env node
/**
 * Run `yarn audit --groups dependencies` and fail on high/critical
 * advisories in the production dependencies — unless the advisory is
 * listed in .supply-chain/audit-allowlist.json with a reason and
 * review date.
 *
 * Necessary because the stock Yarn 1.x `yarn audit` has no suppression
 * mechanism and its exit code is a severity bitmask, not a threshold —
 * a `--level high` filter changes printed output but NOT exit code.
 *
 * See SUPPLY-CHAIN-SECURITY.md (to be added in Phase 4) and
 * CONTRIBUTING.md ("Supply-chain checks") for the contributor workflow.
 *
 * Wrapper is duplicated under scripts/audit.mjs — keep the two files in
 * sync. Each reads its own tree's .supply-chain/audit-allowlist.json.
 */

import { readFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve('.');
const ALLOWLIST_PATH = resolve(ROOT, '.supply-chain/audit-allowlist.json');

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return { entries: [] };
  let data;
  try {
    data = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  } catch (err) {
    console.error(`::error::failed to parse ${ALLOWLIST_PATH}: ${err.message}`);
    process.exit(2);
  }
  for (const entry of data.entries || []) {
    const errors = [];
    if (typeof entry.id !== 'number') errors.push('`id` must be a number');
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

// Bound the subprocess so a hung npm registry can't pin the CI job at
// the workflow-level timeout. 5 min is well above the typical 30s yarn
// audit while still failing fast on a registry outage.
const AUDIT_TIMEOUT_MS = 5 * 60 * 1000;

function runYarnAudit() {
  return new Promise((resolvePromise) => {
    // `shell: true` is required on Windows so the `yarn.cmd` shim in
    // PATH resolves; harmless on Linux/macOS runners where `yarn` is a
    // plain executable.
    const child = spawn('yarn', ['audit', '--groups', 'dependencies', '--json'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, AUDIT_TIMEOUT_MS);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        console.error(`::error::yarn audit timed out after ${AUDIT_TIMEOUT_MS / 1000}s (npm registry likely unresponsive).`);
        process.exit(2);
      }
      resolvePromise({ stdout, stderr, code });
    });
  });
}

function parseAdvisories(stdout) {
  const advisories = new Map();
  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (row.type !== 'auditAdvisory') continue;
    const a = row.data.advisory;
    const key = a.id;
    if (!advisories.has(key)) advisories.set(key, { advisory: a, paths: new Set() });
    advisories.get(key).paths.add(row.data.resolution.path);
  }
  return [...advisories.values()];
}

const allowlist = loadAllowlist();
const allowed = new Map();
for (const entry of allowlist.entries || []) {
  if (typeof entry.id !== 'number') continue;
  allowed.set(entry.id, entry);
}

const { stdout, stderr } = await runYarnAudit();

// Yarn 1.x exits non-zero even on success when advisories exist; we
// don't gate on exit code — we parse the JSON and apply our own gate.
if (!stdout) {
  console.error('::error::`yarn audit` produced no output.');
  if (stderr) console.error(stderr);
  process.exit(2);
}

const advisories = parseAdvisories(stdout);

const blocking = [];
const suppressed = [];
const expired = [];
const stale = [];

const today = new Date().toISOString().slice(0, 10);

for (const { advisory, paths } of advisories) {
  const sev = advisory.severity;
  if (sev !== 'high' && sev !== 'critical') continue;
  const entry = allowed.get(advisory.id);
  if (!entry) {
    blocking.push({ advisory, paths });
    continue;
  }
  suppressed.push({ advisory, paths, entry });
  if (entry.review && entry.review < today) {
    expired.push({ advisory, entry });
  }
}

// Entries allowlisted but no longer suppressing a high/critical advisory — drift.
// Compare against the *suppressed* set, not the full advisory list: an advisory
// whose severity has dropped below high/critical still appears in `advisories`,
// but the allowlist entry is no longer doing any work.
const suppressedIds = new Set(suppressed.map(({ advisory }) => advisory.id));
for (const entry of allowlist.entries || []) {
  if (!suppressedIds.has(entry.id)) {
    stale.push(entry);
  }
}

if (suppressed.length > 0) {
  console.log(`Allowlisted (${suppressed.length}):`);
  for (const { advisory, paths, entry } of suppressed) {
    console.log(`  [${advisory.severity}] ${advisory.module_name} ${advisory.vulnerable_versions}`);
    console.log(`    advisory ${advisory.id} (${advisory.github_advisory_id || 'no GHSA'})`);
    console.log(`    ${paths.size} path(s). reason: ${entry.reason}`);
    console.log(`    added ${entry.added}, review by ${entry.review}`);
  }
  console.log('');
}

for (const { advisory, entry } of expired) {
  console.log(
    `::warning::Allowlist entry for advisory ${advisory.id} (${advisory.module_name}) expired on ${entry.review}. Review and either update the review date with fresh justification, or remove if a fix is available.`,
  );
}

for (const entry of stale) {
  console.log(
    `::warning::Allowlist entry ${entry.id} (${entry.package}) is no longer in the production tree. Remove it from .supply-chain/audit-allowlist.json.`,
  );
}

if (blocking.length > 0) {
  console.error('');
  console.error(`::error::${blocking.length} HIGH/CRITICAL advisory/advisories in the production tree are not allowlisted:`);
  for (const { advisory, paths } of blocking) {
    console.error(`  [${advisory.severity}] ${advisory.module_name} ${advisory.vulnerable_versions} → fix in ${advisory.patched_versions}`);
    console.error(`    advisory ${advisory.id} (${advisory.github_advisory_id || 'no GHSA'})`);
    console.error(`    ${advisory.title}`);
    console.error(`    ${paths.size} path(s), e.g. ${[...paths][0]}`);
    console.error(`    fix: bump the dep, add a Yarn resolution, or allowlist in .supply-chain/audit-allowlist.json with a reason + review date.`);
    console.error('');
  }
  process.exit(1);
}

console.log(`yarn audit: OK (${suppressed.length} allowlisted, no unlisted high/critical).`);
process.exit(0);
