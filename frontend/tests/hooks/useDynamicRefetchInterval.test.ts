import { renderHook } from '@testing-library/react';
import { act } from 'react';

import { useDynamicRefetchInterval } from '../../hooks/useDynamicRefetchInterval';

describe('useDynamicRefetchInterval', () => {
  let hasFocusSpy: jest.SpyInstance;
  let hiddenDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    // jsdom hasFocus() returns false by default; override to true (focused)
    hasFocusSpy = jest.spyOn(document, 'hasFocus').mockReturnValue(true);

    // document.hidden is a getter; store original and override
    hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    hasFocusSpy.mockRestore();

    // Restore original document.hidden
    if (hiddenDescriptor) {
      Object.defineProperty(document, 'hidden', hiddenDescriptor);
    } else {
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false,
      });
    }
  });

  describe('when window is focused (hasFocus=true, hidden=false)', () => {
    it('returns numeric interval unchanged (1x multiplier)', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(5000));
      expect(result.current).toBe(5000);
    });
  });

  describe('when window is visible but not focused (hasFocus=false, hidden=false)', () => {
    it('returns interval multiplied by 3', () => {
      hasFocusSpy.mockReturnValue(false);

      const { result } = renderHook(() => useDynamicRefetchInterval(5_000));
      // The initial useEffect calls updateState which reads hasFocus=false, hidden=false -> 'visible'
      expect(result.current).toBe(15_000);
    });
  });

  describe('when window is hidden (document.hidden=true)', () => {
    it('returns interval multiplied by 10', () => {
      hasFocusSpy.mockReturnValue(false);
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });

      const { result } = renderHook(() => useDynamicRefetchInterval(5_000));
      expect(result.current).toBe(50_000);
    });
  });

  describe('when interval is false', () => {
    it('returns false as-is (no multiplication)', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(false));
      expect(result.current).toBe(false);
    });
  });

  describe('when interval is undefined', () => {
    it('returns undefined as-is (no multiplication)', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(undefined));
      expect(result.current).toBeUndefined();
    });
  });

  describe('when interval is a function', () => {
    it('returns a wrapped function that multiplies numeric result by multiplier', () => {
      const intervalFn = jest.fn().mockReturnValue(2000);

      const { result } = renderHook(() =>
        useDynamicRefetchInterval(intervalFn),
      );

      expect(typeof result.current).toBe('function');
      const wrappedResult = (
        result.current as (...args: unknown[]) => number | false | undefined
      )({});
      expect(intervalFn).toHaveBeenCalledWith({});
      // focused state -> 1x multiplier
      expect(wrappedResult).toBe(2000);
    });

    it('returns false unchanged when the function returns false', () => {
      const intervalFn = jest.fn().mockReturnValue(false);

      const { result } = renderHook(() =>
        useDynamicRefetchInterval(intervalFn),
      );

      const wrappedResult = (
        result.current as (...args: unknown[]) => number | false | undefined
      )({});
      expect(wrappedResult).toBe(false);
    });

    it('returns undefined unchanged when the function returns undefined', () => {
      const intervalFn = jest.fn().mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useDynamicRefetchInterval(intervalFn),
      );

      const wrappedResult = (
        result.current as (...args: unknown[]) => number | false | undefined
      )({});
      expect(wrappedResult).toBeUndefined();
    });

    it('multiplies function result by visibility multiplier (3x when visible)', () => {
      hasFocusSpy.mockReturnValue(false);
      const intervalFn = jest.fn().mockReturnValue(1000);

      const { result } = renderHook(() =>
        useDynamicRefetchInterval(intervalFn),
      );

      const wrappedResult = (
        result.current as (...args: unknown[]) => number | false | undefined
      )({});
      expect(wrappedResult).toBe(3000);
    });
  });

  describe('transitions between states via events', () => {
    it('transitions from focused to visible on blur event', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(1000));
      expect(result.current).toBe(1000); // focused -> 1x

      act(() => {
        hasFocusSpy.mockReturnValue(false);
        window.dispatchEvent(new Event('blur'));
      });

      expect(result.current).toBe(3000); // visible -> 3x
    });

    it('transitions from visible to focused on focus event', () => {
      hasFocusSpy.mockReturnValue(false);
      const { result } = renderHook(() => useDynamicRefetchInterval(1000));
      expect(result.current).toBe(3000); // visible -> 3x

      act(() => {
        hasFocusSpy.mockReturnValue(true);
        window.dispatchEvent(new Event('focus'));
      });

      expect(result.current).toBe(1000); // focused -> 1x
    });

    it('transitions to hidden on visibilitychange when document.hidden=true', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(1000));
      expect(result.current).toBe(1_000); // focused -> 1x

      act(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: () => true,
        });
        hasFocusSpy.mockReturnValue(false);
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current).toBe(10_000); // hidden -> 10x
    });

    it('transitions from hidden back to focused on visibilitychange + hasFocus', () => {
      // Start hidden
      hasFocusSpy.mockReturnValue(false);
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => true,
      });
      const { result } = renderHook(() => useDynamicRefetchInterval(1000));
      expect(result.current).toBe(10000); // hidden -> 10x

      act(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: () => false,
        });
        hasFocusSpy.mockReturnValue(true);
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current).toBe(1000); // focused -> 1x
    });

    it('transitions to hidden on blur when document.hidden=true', () => {
      const { result } = renderHook(() => useDynamicRefetchInterval(1000));
      expect(result.current).toBe(1000);

      act(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          get: () => true,
        });
        hasFocusSpy.mockReturnValue(false);
        window.dispatchEvent(new Event('blur'));
      });

      expect(result.current).toBe(10000); // hidden -> 10x
    });
  });
});
