import { formatAmountNormalized } from '../../utils/numberFormatters';

describe('formatAmountNormalized', () => {
  it('returns integers without decimals', () => {
    expect(formatAmountNormalized(1234)).toBe('1234');
    expect(formatAmountNormalized(0)).toBe('0');
  });

  it('trims trailing zeros from fractional numbers', () => {
    expect(formatAmountNormalized(1234.5)).toBe('1234.5');
    expect(formatAmountNormalized(1234.25)).toBe('1234.25');
    expect(formatAmountNormalized(1234.0)).toBe('1234');
    expect(formatAmountNormalized(1234.56789, 2)).toBe('1234.57');
  });

  it('rounds to the provided decimals before trimming', () => {
    expect(formatAmountNormalized(1.23456)).toBe('1.2346');
    expect(formatAmountNormalized(1.20009, 3)).toBe('1.2');
  });

  it('returns 0 for non-finite values', () => {
    expect(formatAmountNormalized(Number.NaN)).toBe('0');
    expect(formatAmountNormalized(Number.POSITIVE_INFINITY)).toBe('0');
    expect(formatAmountNormalized(Number.NEGATIVE_INFINITY)).toBe('0');
  });

  it('returns 0 for nullish values', () => {
    // @ts-expect-error Testing nullish values
    expect(formatAmountNormalized(null)).toBe('0');
    // @ts-expect-error Testing nullish values
    expect(formatAmountNormalized(undefined)).toBe('0');
  });
});
