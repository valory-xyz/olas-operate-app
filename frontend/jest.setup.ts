import '@testing-library/jest-dom';

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

// Polyfill AbortSignal.timeout for jsdom 20 (added in jsdom 22). Production
// Electron's Chromium has it natively; tests run on the older jsdom shipped
// with jest-environment-jsdom 29.
if (typeof AbortSignal !== 'undefined' && !('timeout' in AbortSignal)) {
  (AbortSignal as unknown as { timeout: (ms: number) => AbortSignal }).timeout =
    (ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    };
}
