#!/usr/bin/env node
// Fails CI if any dependency specifier in the local package.json is not an
// exact semver version pin. Invoked from each yarn tree's package.json via
// `yarn deps:check-pinned`.
//
// Policy: positive match against strict semver — anything that is NOT a
// pure semver string is rejected. This catches:
//   - Range specifiers: ^1.2.3, ~1.2.3, >=1.2.3, *, 1.x, "1 || 2"
//   - Dist-tags: latest, next, beta
//   - Non-registry protocols: npm:<alias>@<ver>, git+https://…, github:org/repo,
//     file:./local, link:../sibling, workspace:^, http(s) tarball URLs
//   - Aliased packages where the caret hides behind the alias prefix
//     (e.g. "pkg": "npm:@scope/aliased@^1.2.3")
//
// Why positive match: the previous negative-pattern regex silently allowed
// any non-semver protocol it didn't enumerate. Adopting workspaces or
// pulling a transitive via `git+` would have neutralised the gate without
// warning.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkgPath = resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const sections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'resolutions',
];
const all = sections.flatMap((s) => Object.entries(pkg[s] ?? {}).map(([k, v]) => [s, k, v]));

// Official semver pattern: MAJOR.MINOR.PATCH with optional pre-release and
// build-metadata suffixes. Anchored start-to-end to reject anything else.
const STRICT_SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const bad = all.filter(([, , v]) => !STRICT_SEMVER.test(v));

if (bad.length) {
  console.error(`Unpinned specifiers in ${pkgPath}:`);
  for (const [section, name, version] of bad) {
    console.error(`  ${section}.${name} = "${version}"`);
  }
  console.error(`\nFix: replace each with an exact semver version (MAJOR.MINOR.PATCH).`);
  console.error(`     Non-registry protocols (git+, github:, file:, npm:, workspace:, etc.)`);
  console.error(`     are not accepted — vendor the dep, fork to a registry release, or`);
  console.error(`     remove it.`);
  process.exit(1);
}

console.log(`All ${all.length} dependency specifiers in ${pkgPath} are exact-pinned semver.`);
