/**
 * Tests for runtime utility functions in types/Util.ts.
 *
 * `assertRequired`, `ensureRequired`, and `typedKeys` are used throughout
 * the codebase to narrow nullable/optional values at runtime. Incorrect
 * behaviour here causes either silent data corruption (null values treated
 * as present) or unnecessary crashes.
 */

import { assertRequired, ensureRequired, typedKeys } from '../../types/Util';

describe('assertRequired', () => {
  it('does not throw when the value is a non-null, non-undefined string', () => {
    expect(() => assertRequired('hello', 'test reason')).not.toThrow();
  });

  it('does not throw when the value is 0 (falsy but defined)', () => {
    expect(() => assertRequired(0, 'zero is valid')).not.toThrow();
  });

  it('does not throw when the value is false', () => {
    expect(() => assertRequired(false, 'false is valid')).not.toThrow();
  });

  it('does not throw when the value is an empty string', () => {
    expect(() => assertRequired('', 'empty string is defined')).not.toThrow();
  });

  it('does not throw when the value is an empty object', () => {
    expect(() => assertRequired({}, 'empty object is defined')).not.toThrow();
  });

  it('throws when the value is null', () => {
    expect(() => assertRequired(null, 'expected non-null')).toThrow(
      'Failed, value is either null or undefined. Incorrect assumption: expected non-null',
    );
  });

  it('throws when the value is undefined', () => {
    expect(() => assertRequired(undefined, 'expected defined')).toThrow(
      'Failed, value is either null or undefined. Incorrect assumption: expected defined',
    );
  });

  it('error message includes the reason string verbatim', () => {
    const reason = 'master safe must exist before funding';
    expect(() => assertRequired(null, reason)).toThrow(reason);
  });
});

describe('ensureRequired', () => {
  it('returns the value unchanged when it is a string', () => {
    const value = 'hello';
    expect(ensureRequired(value, 'test')).toBe(value);
  });

  it('returns the value unchanged when it is a number', () => {
    expect(ensureRequired(42, 'test')).toBe(42);
  });

  it('returns the value unchanged when it is 0', () => {
    expect(ensureRequired(0, 'zero is valid')).toBe(0);
  });

  it('returns the value unchanged when it is false', () => {
    expect(ensureRequired(false, 'false is valid')).toBe(false);
  });

  it('returns the value unchanged when it is an object', () => {
    const obj = { a: 1 };
    expect(ensureRequired(obj, 'test')).toBe(obj);
  });

  it('throws when the value is null', () => {
    expect(() => ensureRequired(null, 'cannot be null')).toThrow(
      'Incorrect assumption: cannot be null',
    );
  });

  it('throws when the value is undefined', () => {
    expect(() => ensureRequired(undefined, 'cannot be undefined')).toThrow(
      'Incorrect assumption: cannot be undefined',
    );
  });

  it('error message includes the reason string', () => {
    const reason = 'service config id must be present';
    expect(() => ensureRequired(null, reason)).toThrow(reason);
  });
});

describe('typedKeys', () => {
  it('returns the keys of a plain object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const keys = typedKeys(obj);
    expect(keys).toEqual(expect.arrayContaining(['a', 'b', 'c']));
    expect(keys).toHaveLength(3);
  });

  it('returns an empty array for an empty object', () => {
    expect(typedKeys({})).toEqual([]);
  });

  it('handles objects with numeric string keys', () => {
    // Object.keys always returns strings, even for numeric keys
    const obj = { 100: 'gnosis', 8453: 'base' } as Record<number, string>;
    const keys = typedKeys(obj);
    expect(keys).toHaveLength(2);
  });

  it('throws TypeError when passed null', () => {
    // typedKeys expects an object; null should throw, not silently produce []
    expect(() => typedKeys(null as unknown as object)).toThrow(TypeError);
  });

  it('throws TypeError when passed a non-object primitive', () => {
    expect(() => typedKeys('string' as unknown as object)).toThrow(TypeError);
    expect(() => typedKeys(42 as unknown as object)).toThrow(TypeError);
  });

  it('does not include prototype keys (own keys only via Object.keys)', () => {
    const obj = Object.create({ inherited: true });
    obj.own = true;
    const keys = typedKeys(obj as { own: boolean });
    expect(keys).toEqual(['own']);
    expect(keys).not.toContain('inherited');
  });
});
