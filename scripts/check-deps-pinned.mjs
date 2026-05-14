#!/usr/bin/env node
// Fails CI if any dependency specifier in the local package.json is not an
// exact version pin (^, ~, >=, *, .x wildcard, ||, whitespace ranges, etc.).
// Invoked from each yarn tree's package.json via `yarn deps:check-pinned`.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'resolutions'];
const all = sections.flatMap((s) => Object.entries(pkg[s] ?? {}).map(([k, v]) => [s, k, v]));

const UNPINNED = /^[\^~]|^[<>]=?|^\*$|\|\||\.x$|\s|^latest$|^next$/;

const bad = all.filter(([, , v]) => UNPINNED.test(v));

if (bad.length) {
  console.error(`Unpinned specifiers in ${pkgPath}:`);
  for (const [section, name, version] of bad) {
    console.error(`  ${section}.${name} = "${version}"`);
  }
  console.error(`\nFix: replace each with the exact resolved version from yarn.lock.`);
  process.exit(1);
}

console.log(`All ${all.length} dependency specifiers in ${pkgPath} are exact-pinned.`);
