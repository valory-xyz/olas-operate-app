import {
  ERROR_CODE,
  InsufficientGasErrorBody,
  isInsufficientGasError,
} from '../../constants/errors';

describe('ERROR_CODE', () => {
  it('exposes the INSUFFICIENT_SIGNER_GAS literal expected by the backend', () => {
    expect(ERROR_CODE.INSUFFICIENT_SIGNER_GAS).toBe('INSUFFICIENT_SIGNER_GAS');
  });
});

describe('isInsufficientGasError', () => {
  const makeValid = (
    overrides: Partial<InsufficientGasErrorBody> = {},
  ): unknown => ({
    error_code: ERROR_CODE.INSUFFICIENT_SIGNER_GAS,
    chain: 'gnosis',
    // String is the realistic wire format (see factories.ts); number is also
    // accepted by the guard for backward-compatibility.
    prefill_amount_wei: '750000000000000000',
    ...overrides,
  });

  it('returns true for a valid structured error body', () => {
    expect(isInsufficientGasError(makeValid())).toBe(true);
  });

  it('returns false when prefill_amount_wei is a number (precision was already lost at JSON.parse)', () => {
    expect(
      isInsufficientGasError(
        makeValid({ prefill_amount_wei: 1_000_000 as unknown as string }),
      ),
    ).toBe(false);
  });

  it('returns false when error_code is missing', () => {
    expect(
      isInsufficientGasError({
        chain: 'gnosis',
        prefill_amount_wei: '750000000000000000',
      }),
    ).toBe(false);
  });

  it('returns false when error_code does not match the expected literal', () => {
    expect(
      isInsufficientGasError(makeValid({ error_code: 'OTHER' as never })),
    ).toBe(false);
  });

  it('returns false when chain is not a string', () => {
    expect(isInsufficientGasError(makeValid({ chain: 42 as never }))).toBe(
      false,
    );
  });

  it('returns false when prefill_amount_wei is not a number or string', () => {
    expect(
      isInsufficientGasError(makeValid({ prefill_amount_wei: null as never })),
    ).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isInsufficientGasError(null)).toBe(false);
    expect(isInsufficientGasError(undefined)).toBe(false);
    expect(isInsufficientGasError('Failed to withdraw')).toBe(false);
    expect(isInsufficientGasError(123)).toBe(false);
  });

  it('returns false for an empty object (e.g. non-JSON error body fallback)', () => {
    expect(isInsufficientGasError({})).toBe(false);
  });
});
