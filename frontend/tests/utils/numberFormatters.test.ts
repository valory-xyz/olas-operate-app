import {
  balanceFormat,
  formatAmount,
  formatAmountNormalized,
  formatEther,
  formatNumber,
  formatUnits,
  formatUnitsToNumber,
  numberToPlainString,
  parseEther,
  parseUnits,
} from '../../utils/numberFormatters';

describe('balanceFormat', () => {
  it('formats large numbers with compact notation', () => {
    expect(balanceFormat(1000000000)).toBe('1.00B');
    expect(balanceFormat(1500000)).toBe('1.50M');
    expect(balanceFormat(1234567)).toBe('1.23M');
  });

  it('returns "--" for undefined', () => {
    expect(balanceFormat(undefined)).toBe('--');
  });

  it('respects custom decimals', () => {
    expect(balanceFormat(1234, 0)).toBe('1K');
  });

  it('formats small numbers normally', () => {
    expect(balanceFormat(0)).toBe('0.00');
    expect(balanceFormat(5.5)).toBe('5.50');
    expect(balanceFormat(5.499)).toBe('5.50');
  });
});

describe('formatNumber', () => {
  it('formats number with commas and 2 decimal places by default', () => {
    expect(formatNumber(1234.578)).toBe('1,234.58');
  });

  it('returns "--" for undefined', () => {
    expect(formatNumber(undefined)).toBe('--');
  });

  it('accepts string input', () => {
    expect(formatNumber('1234.578')).toBe('1,234.58');
  });

  it('uses ceil rounding by default', () => {
    expect(formatNumber(1.001)).toBe('1.01');
  });

  it('supports floor rounding', () => {
    expect(formatNumber(1.009, 2, 'floor')).toBe('1.00');
  });

  it('respects custom decimals', () => {
    expect(formatNumber(1234.5, 0)).toBe('1,235');
    expect(formatNumber(1234.5678, 3)).toBe('1,234.568');
  });
});

describe('formatAmount', () => {
  it('delegates to formatNumber', () => {
    expect(formatAmount('1234.578', 2)).toBe(formatNumber('1234.578', 2));
  });
});

describe('formatUnits', () => {
  it('formats wei to ether with 18 decimals by default', () => {
    expect(formatUnits('1000000000000000000')).toBe('1.0');
  });

  it('formats with custom decimals', () => {
    expect(formatUnits('1000000', 6)).toBe('1.0');
  });
});

describe('formatUnitsToNumber', () => {
  it('returns a number instead of string', () => {
    const result = formatUnitsToNumber('1000000000000000000');
    expect(typeof result).toBe('number');
    expect(result).toBe(1);
  });

  it('rounds to 4 decimal places by default', () => {
    const result = formatUnitsToNumber('1234567890000000000');
    expect(result).toBe(1.2346);
  });

  it('respects custom precision', () => {
    const result = formatUnitsToNumber('1234567890000000000', 18, 2);
    expect(result).toBe(1.24);
  });
});

describe('formatEther', () => {
  it('converts wei to ether string', () => {
    expect(formatEther('1000000000000000000')).toBe('1.0');
    expect(formatEther('500000000000000000')).toBe('0.5');
  });
});

describe('parseUnits', () => {
  it('converts ether to wei string with 18 decimals by default', () => {
    expect(parseUnits('1.0')).toBe('1000000000000000000');
  });

  it('converts with custom decimals', () => {
    expect(parseUnits('1.0', 6)).toBe('1000000');
  });
});

describe('parseEther', () => {
  it('converts ether to wei string', () => {
    expect(parseEther('1')).toBe('1000000000000000000');
    expect(parseEther('0.5')).toBe('500000000000000000');
  });
});

describe('numberToPlainString', () => {
  it('converts number to plain string without scientific notation', () => {
    const result = numberToPlainString(1e21);
    expect(result).not.toBe('1e+21');
    expect(result).not.toBe('1e21');
  });

  it('returns string input as-is', () => {
    expect(numberToPlainString('12345')).toBe('12345');
  });
});

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
