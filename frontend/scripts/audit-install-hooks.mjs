#!/usr/bin/env node
/**
 * Enumerate every package in node_modules that declares a non-trivial
 * preinstall / install / postinstall script, and diff the list against
 * a checked-in allowlist at .supply-chain/install-hooks.allowlist.
 *
 * New names in the tree but not in the allowlist = fail. Names in the
 * allowlist but not in the tree = fail (drift — allowlist is stale).
 *
 * Use `--update` to regenerate the allowlist from the current tree.
 * Run after any dependency change:
 *   yarn install
 *   node scripts/audit-install-hooks.mjs --update
 *   git add .supply-chain/install-hooks.allowlist
 *
 * Distinct from `.npmrc`'s `ignore-scripts=true` (which prevents
 * execution); this gate makes additions reviewable so a malicious
 * transitive that introduces a new postinstall in its latest version
 * fails CI until the new hook is explicitly justified.
 *
 * Wrapper is duplicated under scripts/audit-install-hooks.mjs —
 * keep the two files in sync. Each reads its own tree's allowlist.
 *
 * See CONTRIBUTING.md "Supply-chain checks → install-hook gate" for the
 * contributor workflow, and SUPPLY-CHAIN-SECURITY.md (added in Phase 4)
 * for the rationale.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Paths are anchored to the current working directory, not a CLI argument.
// yarn scripts always run from the workspace root, which is what we want.
// Taking a root path from argv would let it flow into readFileSync /
// writeFileSync as an unvalidated path (a path-traversal sink flagged by
// static analysis). The only CLI option the script accepts is `--update`,
// matched as a literal string below — it is never used as a file path.
const ROOT = resolve('.');
const ALLOWLIST_PATH = resolve(ROOT, '.supply-chain/install-hooks.allowlist');
const NODE_MODULES = resolve(ROOT, 'node_modules');
const UPDATE = process.argv.includes('--update');

const HOOK_KEYS = ['preinstall', 'install', 'postinstall'];

// Defence-in-depth: bound recursion into nested node_modules in case
// a pathological tree (symlink loop, malicious self-containment) exists.
// Real hoisted trees never exceed single-digit depth.
const MAX_DEPTH = 20;

// Hook commands we treat as trivial (no-op / log only). Everything else
// counts as "carries an install hook".
//
// The echo pattern uses a negative lookahead to reject any shell metachar
// that could chain a real command (e.g. `echo "ok" && node install.js`,
// `echo $(curl …)`). Without this, an attacker prefixing `echo ` would slip
// past the trivial filter. \n and \r are included because package.json
// `scripts` strings can contain literal newlines after JSON decoding, and
// `echo ok\nrm -rf /` would otherwise be classified as trivial.
const TRIVIAL = [
  /^(?!.*[&|;`$()<>\n\r])echo(\s|$)/,
  /^true$/,
  /^:$/,
  /^exit\s+0$/,
];

function isTrivial(cmd) {
  if (!cmd || typeof cmd !== 'string') return true;
  const t = cmd.trim();
  if (!t) return true;
  return TRIVIAL.some((r) => r.test(t));
}

/**
 * Recursively walk node_modules, yielding every package.json path.
 * Symlinked entries are skipped (Dirent.isDirectory() is false on a symlink) —
 * rare in this tree because Yarn 1.x hoists deps rather than symlinks them.
 * Out of scope for the registry-published-malicious-package threat model;
 * if a workflow change ever introduces symlinked deps, this needs to follow
 * symlinks via realpathSync with cycle detection.
 */
function* walkPackageJsons(dir, depth = 0) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = join(dir, entry.name);
    // Scoped packages: recurse into @scope/ to find @scope/pkg/package.json
    if (entry.name.startsWith('@')) {
      yield* walkPackageJsons(full, depth + 1);
      continue;
    }
    const pkgJson = join(full, 'package.json');
    if (existsSync(pkgJson)) {
      try {
        if (statSync(pkgJson).isFile()) yield pkgJson;
      } catch {}
    }
    // Recurse into nested node_modules (hoisting-related)
    const nested = join(full, 'node_modules');
    if (existsSync(nested)) yield* walkPackageJsons(nested, depth + 1);
  }
}

function collectHooks() {
  if (!existsSync(NODE_MODULES)) {
    console.error(`node_modules not found at ${NODE_MODULES} — run \`yarn install\` first.`);
    process.exit(2);
  }
  const found = new Map(); // name -> Set of "hook:cmd"
  for (const path of walkPackageJsons(NODE_MODULES)) {
    let pkg;
    try {
      pkg = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      continue;
    }
    if (!pkg.name || !pkg.scripts) continue;
    for (const hook of HOOK_KEYS) {
      const cmd = pkg.scripts[hook];
      if (!cmd || isTrivial(cmd)) continue;
      if (!found.has(pkg.name)) found.set(pkg.name, new Set());
      found.get(pkg.name).add(`${hook}: ${cmd.replace(/\s+/g, ' ').trim()}`);
    }
  }
  return found;
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_PATH)) return new Set();
  const raw = readFileSync(ALLOWLIST_PATH, 'utf8');
  const names = new Set();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Allow either "name" or "name  # comment" — strip inline comment.
    const name = trimmed.split(/\s+#/)[0].trim();
    if (name) names.add(name);
  }
  return names;
}

function writeAllowlist(hooks) {
  const names = [...hooks.keys()].sort();
  const lines = [
    '# .supply-chain/install-hooks.allowlist',
    '#',
    '# Every package in node_modules that declares a non-trivial',
    '# preinstall / install / postinstall script. Regenerate with',
    '# `yarn audit:install-hooks:update` after any dependency change.',
    '# CI runs the same script without --update and fails if this',
    '# file drifts from the tree.',
    '#',
    '# Each entry has an inline comment naming the hook command(s).',
    '# When adding a new entry, replace the auto-generated comment with',
    '# a one-line justification of WHAT the hook does and WHY it is',
    '# safe to run on a contributor machine.',
    '',
  ];
  for (const name of names) {
    const hookLines = [...hooks.get(name)].sort();
    lines.push(`${name}  # ${hookLines.join(' | ')}`);
  }
  writeFileSync(ALLOWLIST_PATH, lines.join('\n') + '\n');
}

const found = collectHooks();

if (UPDATE) {
  writeAllowlist(found);
  console.log(`Wrote ${found.size} entries to ${ALLOWLIST_PATH}.`);
  process.exit(0);
}

const allowed = loadAllowlist();
const foundNames = new Set(found.keys());
const unexpected = [...foundNames].filter((n) => !allowed.has(n)).sort();
const missing = [...allowed].filter((n) => !foundNames.has(n)).sort();

if (unexpected.length === 0 && missing.length === 0) {
  console.log(`install-hooks: OK (${foundNames.size} allowlisted).`);
  process.exit(0);
}

if (unexpected.length > 0) {
  console.error('::error::install-hook audit found NEW packages with install hooks not in the allowlist:');
  for (const name of unexpected) {
    console.error(`  + ${name}`);
    for (const hook of found.get(name)) console.error(`      ${hook}`);
  }
  console.error('');
  console.error('Review the hook. If it is legitimate, add the package to');
  console.error('.supply-chain/install-hooks.allowlist (run: yarn audit:install-hooks:update).');
}

if (missing.length > 0) {
  console.error('::error::install-hook allowlist has entries no longer in the tree (drift):');
  for (const name of missing) console.error(`  - ${name}`);
  console.error('');
  console.error('Remove the stale entries (run: yarn audit:install-hooks:update).');
}

process.exit(1);
