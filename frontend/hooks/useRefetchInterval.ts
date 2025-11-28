import { Query } from '@tanstack/react-query';

import { useWindowVisibility } from './useWindowVisibility';

type RefetchInterval =
  | number
  | false
  | undefined
  | ((query: Query) => number | false | undefined);

export const useRefetchInterval = (interval: RefetchInterval) => {
  const windowState = useWindowVisibility();

  const adjustInterval = (currentInterval: number) => {
    switch (windowState) {
      case 'focused':
        return currentInterval;
      case 'visible':
        return Math.max(currentInterval, 30000); // 30s
      case 'hidden':
        return Math.max(currentInterval, 60000); // 1m
      default:
        return currentInterval;
    }
  };

  if (typeof interval === 'function') {
    return (query: Query) => {
      const result = interval(query);
      if (typeof result === 'number') {
        return adjustInterval(result);
      }
      return result;
    };
  }

  if (typeof interval === 'number') {
    return adjustInterval(interval);
  }

  return interval;
};
