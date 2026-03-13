import { isNilOrEmpty, isNonEmpty } from '../../utils/lodashExtensions';

describe('isNilOrEmpty', () => {
  it('returns true for null', () => {
    expect(isNilOrEmpty(null)).toBe(true);
  });

  it('returns true for undefined', () => {
    expect(isNilOrEmpty(undefined)).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isNilOrEmpty('')).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isNilOrEmpty([])).toBe(true);
  });

  it('returns true for empty object', () => {
    expect(isNilOrEmpty({})).toBe(true);
  });

  it('returns false for non-empty string', () => {
    expect(isNilOrEmpty('hello')).toBe(false);
  });

  it('returns false for non-empty array', () => {
    expect(isNilOrEmpty([1, 2, 3])).toBe(false);
  });

  it('returns false for non-empty object', () => {
    expect(isNilOrEmpty({ key: 'value' })).toBe(false);
  });

  it('returns true for numbers (lodash isEmpty treats numbers as empty)', () => {
    expect(isNilOrEmpty(0)).toBe(true);
    expect(isNilOrEmpty(42)).toBe(true);
  });
});

describe('isNonEmpty', () => {
  it('returns false for null', () => {
    expect(isNonEmpty(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNonEmpty(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isNonEmpty('')).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isNonEmpty([])).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isNonEmpty({})).toBe(false);
  });

  it('returns true for non-empty string', () => {
    expect(isNonEmpty('hello')).toBe(true);
  });

  it('returns true for non-empty array', () => {
    expect(isNonEmpty([1, 2, 3])).toBe(true);
  });

  it('returns true for non-empty object', () => {
    expect(isNonEmpty({ key: 'value' })).toBe(true);
  });
});
