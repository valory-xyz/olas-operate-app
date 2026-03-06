import { BACKOFF_STEPS, getExponentialInterval } from '../../utils/backoff';

describe('BACKOFF_STEPS', () => {
  it('is 5', () => {
    expect(BACKOFF_STEPS).toBe(5);
  });
});

describe('getExponentialInterval', () => {
  const customIntervals = { minMs: 1000, maxMs: 32000, steps: 6 };

  it('returns minMs at count 0', () => {
    expect(getExponentialInterval(0, customIntervals)).toBe(1000);
  });

  it('returns maxMs at the last step', () => {
    expect(getExponentialInterval(5, customIntervals)).toBe(32000);
  });

  it('returns values between min and max for intermediate counts', () => {
    const mid = getExponentialInterval(3, customIntervals);
    expect(mid).toBeGreaterThan(1000);
    expect(mid).toBeLessThan(32000);
  });

  it('grows exponentially', () => {
    const v0 = getExponentialInterval(0, customIntervals);
    const v1 = getExponentialInterval(1, customIntervals);
    const v2 = getExponentialInterval(2, customIntervals);
    expect(v1).toBeGreaterThan(v0);
    expect(v2).toBeGreaterThan(v1);
  });

  it('clamps at maxMs for counts beyond steps', () => {
    expect(getExponentialInterval(100, customIntervals)).toBe(32000);
  });

  it('uses default intervals when none provided', () => {
    // Default: minMs=30000, maxMs=300000, steps=5
    const v0 = getExponentialInterval(0);
    expect(v0).toBe(30000);

    const vMax = getExponentialInterval(4);
    expect(vMax).toBe(300000);
  });
});
