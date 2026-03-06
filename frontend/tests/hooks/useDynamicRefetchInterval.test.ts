import { renderHook, act } from '@testing-library/react';

import { useDynamicRefetchInterval } from '../../hooks/useDynamicRefetchInterval';

let hasFocusSpy: jest.SpyInstance;

beforeEach(() => {
  // jsdom's document.hasFocus() returns false by default; override per test
  hasFocusSpy = jest
    .spyOn(document, 'hasFocus')
    .mockReturnValue(true);
  Object.defineProperty(document, 'hidden', {
    value: false,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  hasFocusSpy.mockRestore();
});

describe('useDynamicRefetchInterval', () => {
  describe('with numeric interval', () => {
    it('returns the interval as-is when window is focused (1x multiplier)', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(5000));
      expect(result.current).toBe(5000);
    });

    it('returns 3x interval when window is visible but not focused', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(5000));

      hasFocusSpy.mockReturnValue(false);
      act(() => {
        window.dispatchEvent(new Event('blur'));
      });

      expect(result.current).toBe(15000);
    });

    it('returns 10x interval when document is hidden', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(5000));

      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current).toBe(50000);
    });

    it('returns 10x interval when blur fires while document is hidden', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(5000));

      Object.defineProperty(document, 'hidden', {
        value: true,
        writable: true,
        configurable: true,
      });
      act(() => {
        window.dispatchEvent(new Event('blur'));
      });

      expect(result.current).toBe(50000);
    });

    it('returns to 1x when window regains focus', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(5000));

      hasFocusSpy.mockReturnValue(false);
      act(() => {
        window.dispatchEvent(new Event('blur'));
      });
      expect(result.current).toBe(15000);

      hasFocusSpy.mockReturnValue(true);
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });
      expect(result.current).toBe(5000);
    });
  });

  describe('with false or undefined', () => {
    it('returns false as-is', () => {
      const { result } = renderHook(() =>
        useDynamicRefetchInterval(false as false),
      );
      expect(result.current).toBe(false);
    });

    it('returns undefined as-is', () => {
      const { result } = renderHook(() =>
        useDynamicRefetchInterval(undefined),
      );
      expect(result.current).toBeUndefined();
    });
  });

  describe('with function interval', () => {
    it('wraps a function and scales its numeric return value', () => {
      const intervalFn = jest.fn().mockReturnValue(2000);
      const { result } = renderHook(() =>
        useDynamicRefetchInterval(intervalFn),
      );

      const wrappedFn = result.current as (...args: unknown[]) => unknown;
      expect(typeof wrappedFn).toBe('function');

      const adjusted = wrappedFn({ queryKey: ['test'] });
      expect(adjusted).toBe(2000); // focused → 1x
    });

    it('passes through false from function without scaling', () => {
      const intervalFn = jest.fn().mockReturnValue(false);
      const { result } = renderHook(() =>
        useDynamicRefetchInterval(intervalFn),
      );

      const wrappedFn = result.current as (...args: unknown[]) => unknown;
      expect(wrappedFn({})).toBe(false);
    });

    it('passes through undefined from function without scaling', () => {
      const intervalFn = jest.fn().mockReturnValue(undefined);
      const { result } = renderHook(() =>
        useDynamicRefetchInterval(intervalFn),
      );

      const wrappedFn = result.current as (...args: unknown[]) => unknown;
      expect(wrappedFn({})).toBeUndefined();
    });
  });
});
