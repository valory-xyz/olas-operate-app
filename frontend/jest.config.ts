import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  globals: { fetch },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  // Redirect antd's ESM build (antd/es/*) to its CommonJS build (antd/lib/*)
  // so Jest can require() them. next/jest's default transformIgnorePatterns
  // excludes node_modules, so antd/es files would otherwise hit Jest as raw ESM.
  moduleNameMapper: {
    '^antd/es/(.*)$': 'antd/lib/$1',
  },
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!tests/**',
    '!.next/**',
    '!node_modules/**',
    '!next.config.mjs',
    '!jest.config.ts',
    '!jest.setup.ts',
  ],
};

// ESM-only deps of react-markdown, added to next/jest's node_modules transform allowlist.
const ESM_ONLY_PACKAGES = [
  'react-markdown',
  'remark-.*',
  'micromark.*',
  'mdast-.*',
  'hast-.*',
  'unist-.*',
  'unified',
  'vfile.*',
  'estree-.*',
  'markdown-table',
  'html-url-attributes',
  'devlop',
  'bail',
  'trough',
  'ccount',
  'zwitch',
  'longest-streak',
  'trim-lines',
  'property-information',
  'space-separated-tokens',
  'comma-separated-tokens',
  'character-entities.*',
  'character-reference-invalid',
  'decode-named-character-reference',
  'parse-entities',
  'stringify-entities',
  'is-alphabetical',
  'is-alphanumerical',
  'is-decimal',
  'is-hexadecimal',
  'is-plain-obj',
  'escape-string-regexp',
].join('|');

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
const jestConfig = async (): Promise<Config> => {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: resolved.transformIgnorePatterns?.map((pattern) =>
      pattern.replace('/node_modules/(?!.pnpm)(?!(', `$&${ESM_ONLY_PACKAGES}|`),
    ),
  };
};

export default jestConfig;
