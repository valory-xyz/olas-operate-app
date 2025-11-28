import { Query } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { FIVE_MINUTE_INTERVAL, THIRTY_SECONDS_INTERVAL } from '@/constants';

/**
 * focused: user is actively interacting with the app
 * visible: app is visible but not focused (e.g. user has another window in front)
 * hidden: app is minimized or not visible
 */
type WindowState = 'focused' | 'visible' | 'hidden';

const useWindowVisibility = (): WindowState => {
  const [state, setState] = useState<WindowState>('focused');

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setState('hidden');
      } else {
        setState(document.hasFocus() ? 'focused' : 'visible');
      }
    };

    const handleFocus = () => {
      setState('focused');
    };

    // When blurred, it might still be visible (e.g. clicking on another window on same screen)
    // or it might be hidden. document.hidden is the source of truth for hidden.
    const handleBlur = () => {
      if (!document.hidden) {
        setState('visible');
      }
    };

    // Initial check
    handleVisibilityChange();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return state;
};

type Interval = number | false | undefined;

type RefetchInterval = Interval | ((query: Query) => Interval);

/**
 * Hook to adjust refetch interval based on window visibility state.
 *
 * - When window is focused, use the provided interval.
 * - When window is visible but not focused, use at least 30s interval.
 * - When window is hidden, use at least 5 minute interval.
 *
 * This helps to reduce unnecessary network requests when the user is not actively
 * interacting with the app.
 */
export const useRefetchInterval = (interval: RefetchInterval) => {
  const windowState = useWindowVisibility();
  console.log('Window state:', windowState);

  const adjustInterval = (originalInterval: number) => {
    switch (windowState) {
      case 'focused':
        return originalInterval;
      case 'visible':
        return Math.max(originalInterval, THIRTY_SECONDS_INTERVAL);
      case 'hidden':
        return Math.max(originalInterval, FIVE_MINUTE_INTERVAL);
      default:
        return originalInterval;
    }
  };

  if (typeof interval === 'function') {
    return (query: Query) => {
      const result = interval(query);
      return typeof result === 'number' ? adjustInterval(result) : result;
    };
  }

  if (typeof interval === 'number') {
    return adjustInterval(interval);
  }

  return interval;
};
