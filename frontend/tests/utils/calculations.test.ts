import { bigintMax, bigintMin, sumBigNumbers } from '../../utils/calculations';

describe('bigintMax', () => {
  it('returns the maximum of two values', () => {
    expect(bigintMax(1n, 2n)).toBe(2n);
  });

  it('returns the maximum of multiple values', () => {
    expect(bigintMax(1n, 5n, 3n, 2n, 4n)).toBe(5n);
  });

  it('handles negative values', () => {
    expect(bigintMax(-3n, -1n, -2n)).toBe(-1n);
  });

  it('handles mix of positive and negative', () => {
    expect(bigintMax(-10n, 0n, 10n)).toBe(10n);
  });

  it('returns the value when given a single argument', () => {
    expect(bigintMax(42n)).toBe(42n);
  });

  it('handles equal values', () => {
    expect(bigintMax(5n, 5n, 5n)).toBe(5n);
  });

  it('handles very large values', () => {
    const large = 10n ** 18n;
    expect(bigintMax(large, large + 1n)).toBe(large + 1n);
  });

  it('handles zero', () => {
    expect(bigintMax(0n, 1n)).toBe(1n);
  });
});

describe('bigintMin', () => {
  it('returns the minimum of two values', () => {
    expect(bigintMin(1n, 2n)).toBe(1n);
  });

  it('returns the minimum of multiple values', () => {
    expect(bigintMin(5n, 1n, 3n, 2n, 4n)).toBe(1n);
  });

  it('handles negative values', () => {
    expect(bigintMin(-3n, -1n, -2n)).toBe(-3n);
  });

  it('handles mix of positive and negative', () => {
    expect(bigintMin(-10n, 0n, 10n)).toBe(-10n);
  });

  it('returns the value when given a single argument', () => {
    expect(bigintMin(42n)).toBe(42n);
  });

  it('handles zero', () => {
    expect(bigintMin(0n, 1n)).toBe(0n);
  });

  it('handles equal values', () => {
    expect(bigintMin(5n, 5n, 5n)).toBe(5n);
  });

  it('handles very small values', () => {
    const small = -(10n ** 18n);
    expect(bigintMin(small, small - 1n)).toBe(small - 1n);
  });
});

describe('sumBigNumbers', () => {
  it('sums string numbers with default 18 decimals', () => {
    const result = sumBigNumbers(['1.0', '2.0', '3.0']);
    expect(result).toBe('6.0');
  });

  it('sums with custom decimals', () => {
    const result = sumBigNumbers(['1.12345', '2.12345', '3.2'], 5);
    expect(result).toBe('6.4469');
  });

  it('returns zero for empty array', () => {
    const result = sumBigNumbers([]);
    expect(result).toBe('0.0');
  });

  it('handles single value', () => {
    const result = sumBigNumbers(['5.5'], 1);
    expect(result).toBe('5.5');
  });

  it('handles whole numbers', () => {
    const result = sumBigNumbers(['10', '20', '30'], 0);
    expect(result).toBe('60');
  });
});
