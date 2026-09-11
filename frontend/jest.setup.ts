import '@testing-library/jest-dom';

import { randomUUID } from 'node:crypto';

// Polyfill window.matchMedia for antd components that use useBreakpoint().
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Polyfill crypto.randomUUID, which jsdom does not implement. Pearl's renderer loads from
// http://localhost, a potentially-trustworthy origin, so Chromium provides it at runtime;
// jsdom is the only environment where it is missing.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    writable: true,
    value: { ...globalThis.crypto, randomUUID },
  });
}
