/**
 * Tests for UI symbol constants.
 *
 * These are user-facing display characters. If the wrong Unicode code point
 * or the wrong `n/a` placeholder leaks into the UI, users will see broken
 * or unexpected characters in reward amounts and links.
 */

import { NA, UNICODE_SYMBOLS } from '../../constants/symbols';

describe('NA', () => {
  it('is the lowercase string "n/a"', () => {
    expect(NA).toBe('n/a');
  });
});

describe('UNICODE_SYMBOLS', () => {
  it('OLAS symbol is the trigram for wind ☴ (U+2634)', () => {
    expect(UNICODE_SYMBOLS.OLAS).toBe('☴');
    expect(UNICODE_SYMBOLS.OLAS.codePointAt(0)).toBe(0x2634);
  });

  it('EXTERNAL_LINK is the north-east arrow ↗ (U+2197)', () => {
    expect(UNICODE_SYMBOLS.EXTERNAL_LINK).toBe('↗');
    expect(UNICODE_SYMBOLS.EXTERNAL_LINK.codePointAt(0)).toBe(0x2197);
  });

  it('BULLET is the bullet • (U+2022)', () => {
    expect(UNICODE_SYMBOLS.BULLET).toBe('•');
    expect(UNICODE_SYMBOLS.BULLET.codePointAt(0)).toBe(0x2022);
  });

  it('SMALL_BULLET is the middle dot · (U+00B7)', () => {
    expect(UNICODE_SYMBOLS.SMALL_BULLET).toBe('·');
    expect(UNICODE_SYMBOLS.SMALL_BULLET.codePointAt(0)).toBe(0x00b7);
  });

  it('BULLET is distinct from SMALL_BULLET', () => {
    expect(UNICODE_SYMBOLS.BULLET).not.toBe(UNICODE_SYMBOLS.SMALL_BULLET);
  });

  it('covers exactly 4 symbols', () => {
    expect(Object.keys(UNICODE_SYMBOLS)).toHaveLength(4);
  });
});
