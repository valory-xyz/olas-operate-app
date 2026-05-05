/**
 * Tests for polling interval constants.
 *
 * Interval values drive all polling behaviour in the app (balance refresh,
 * staking data, etc.). Wrong values cause either excessive API load (too
 * small) or stale UIs (too large).
 */

import {
  FIFTEEN_SECONDS_INTERVAL,
  FIVE_MINUTE_INTERVAL,
  FIVE_SECONDS_INTERVAL,
  ONE_MINUTE_INTERVAL,
  ONE_SECOND_INTERVAL,
  SIXTY_MINUTE_INTERVAL,
  TEN_SECONDS_INTERVAL,
  THIRTY_SECONDS_INTERVAL,
} from '../../constants/intervals';

describe('interval constants', () => {
  it('ONE_SECOND_INTERVAL is exactly 1000 ms', () => {
    expect(ONE_SECOND_INTERVAL).toBe(1_000);
  });

  it('FIVE_SECONDS_INTERVAL is exactly 5000 ms', () => {
    expect(FIVE_SECONDS_INTERVAL).toBe(5_000);
  });

  it('TEN_SECONDS_INTERVAL is exactly 10000 ms', () => {
    expect(TEN_SECONDS_INTERVAL).toBe(10_000);
  });

  it('FIFTEEN_SECONDS_INTERVAL is exactly 15000 ms', () => {
    expect(FIFTEEN_SECONDS_INTERVAL).toBe(15_000);
  });

  it('THIRTY_SECONDS_INTERVAL is exactly 30000 ms', () => {
    expect(THIRTY_SECONDS_INTERVAL).toBe(30_000);
  });

  it('ONE_MINUTE_INTERVAL is exactly 60000 ms', () => {
    expect(ONE_MINUTE_INTERVAL).toBe(60_000);
  });

  it('FIVE_MINUTE_INTERVAL is exactly 300000 ms', () => {
    expect(FIVE_MINUTE_INTERVAL).toBe(300_000);
  });

  it('SIXTY_MINUTE_INTERVAL is exactly 3600000 ms', () => {
    expect(SIXTY_MINUTE_INTERVAL).toBe(3_600_000);
  });

  it('each interval is a whole-number multiple of ONE_SECOND_INTERVAL', () => {
    const allIntervals = [
      FIVE_SECONDS_INTERVAL,
      TEN_SECONDS_INTERVAL,
      FIFTEEN_SECONDS_INTERVAL,
      THIRTY_SECONDS_INTERVAL,
      ONE_MINUTE_INTERVAL,
      FIVE_MINUTE_INTERVAL,
      SIXTY_MINUTE_INTERVAL,
    ];
    for (const interval of allIntervals) {
      expect(interval % ONE_SECOND_INTERVAL).toBe(0);
    }
  });

  it('intervals are in ascending order', () => {
    const ordered = [
      ONE_SECOND_INTERVAL,
      FIVE_SECONDS_INTERVAL,
      TEN_SECONDS_INTERVAL,
      FIFTEEN_SECONDS_INTERVAL,
      THIRTY_SECONDS_INTERVAL,
      ONE_MINUTE_INTERVAL,
      FIVE_MINUTE_INTERVAL,
      SIXTY_MINUTE_INTERVAL,
    ];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });
});
