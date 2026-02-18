import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Window visibility bucket:
 *
 * - "focused": user is actively interacting with the UI
 * - "visible": window is visible but not focused (e.g., behind another window)
 * - "hidden": minimized or completely not visible to the user
 *
 * Used to scale refetch intervals smartly.
 */
type WindowState = 'focused' | 'visible' | 'hidden';

/**
 * Detects the current window visibility/focus state.
 * Works in Electron, Browser, and hybrid environments.
 */
const useWindowVisibility = (): WindowState => {
  const [state, setState] = useState<WindowState>('focused');

  useEffect(() => {
    const updateState = () => {
      if (document.hidden) {
        setState('hidden');
      } else {
        setState(document.hasFocus() ? 'focused' : 'visible');
      }
    };

    const handleFocus = () => setState('focused');
    const handleBlur = () => {
      if (document.hidden) {
        setState('hidden');
      } else {
        setState('visible');
      }
    };

    // Initial state
    updateState();

    document.addEventListener('visibilitychange', updateState);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', updateState);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return state;
};

/**
 * Multipliers for scaling refetch frequency based on visibility state.
 */
const INTERVAL_MULTIPLIERS = {
  focused: 1, // normal rate
  visible: 3, // slower when window is visible but not focused
  hidden: 10, // very slow when fully hidden (minimized)
} as const;

type AdaptiveInterval =
  | number
  | false
  | undefined
  | ((...args: unknown[]) => number | false | undefined);

/**
 * Smart refetch-interval hook used with React Query.
 * Prevents unnecessary API calls when the user isn't actively interacting.
 */
export function useDynamicRefetchInterval<T extends AdaptiveInterval>(
  interval: T,
): T {
  const windowState = useWindowVisibility();

  const adjustInterval = useCallback(
    (value: number) => {
      const multiplier = INTERVAL_MULTIPLIERS[windowState];
      return value * multiplier;
    },
    [windowState],
  );

  return useMemo(() => {
    // Case 1 — function-style refetch interval
    if (typeof interval === 'function') {
      return ((query: unknown) => {
        const result = interval(query);
        return typeof result === 'number' ? adjustInterval(result) : result;
      }) as T;
    }

    // Case 2 — numeric static interval
    if (typeof interval === 'number') {
      return adjustInterval(interval) as T;
    }

    // Case 3 — false / undefined
    return interval;
  }, [interval, adjustInterval]);
}
