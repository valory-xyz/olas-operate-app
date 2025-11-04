import { FIVE_MINUTE_INTERVAL, THIRTY_SECONDS_INTERVAL } from '@/constants';

export const BACKOFF_STEPS = 5;

/**
 * Returns an exponentially increasing interval in milliseconds, clamped by max.
 *
 * @example
 * // Custom configuration: 1s → 32s over 6 steps (~×2 growth)
 * const intervals = { minMs: 1000, maxMs: 32000, steps: 6 };
 * getExponentialInterval(0, intervals); // 1000
 * getExponentialInterval(3, intervals); // ~8000
 * getExponentialInterval(5, intervals); // 32000
 */
export const getExponentialInterval = (
  count: number,
  intervals: { minMs: number; maxMs: number; steps: number } = {
    minMs: THIRTY_SECONDS_INTERVAL,
    maxMs: FIVE_MINUTE_INTERVAL,
    steps: BACKOFF_STEPS,
  },
): number => {
  const { minMs, maxMs, steps = BACKOFF_STEPS } = intervals;

  // compute exponentially growing interval
  const factor = Math.pow(maxMs / minMs, 1 / (steps - 1));
  const interval = minMs * Math.pow(factor, count);

  return Math.min(Math.round(interval), maxMs);
};
