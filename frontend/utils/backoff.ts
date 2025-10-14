import { ONE_MINUTE_INTERVAL, THIRTY_SECONDS_INTERVAL } from '@/constants';

export const getExponentialInterval = (
  count: number,
  intervals: { minMs: number; maxMs: number; steps: number } = {
    minMs: THIRTY_SECONDS_INTERVAL,
    maxMs: ONE_MINUTE_INTERVAL,
    steps: 5,
  },
): number => {
  const { minMs, maxMs, steps = 5 } = intervals;

  // compute exponentially growing interval
  const factor = Math.pow(maxMs / minMs, 1 / (steps - 1));
  const interval = minMs * Math.pow(factor, count);

  return Math.min(Math.round(interval), maxMs);
};
