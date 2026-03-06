import { areAddressesEqual } from '../../utils/address';
import { BACKUP_SIGNER_ADDRESS, DEFAULT_EOA_ADDRESS } from '../mocks/factories';

describe('areAddressesEqual', () => {
  it('returns true for identical addresses', () => {
    expect(areAddressesEqual(DEFAULT_EOA_ADDRESS, DEFAULT_EOA_ADDRESS)).toBe(
      true,
    );
  });

  it('returns true for addresses differing only in case', () => {
    expect(
      areAddressesEqual(DEFAULT_EOA_ADDRESS, DEFAULT_EOA_ADDRESS.toLowerCase()),
    ).toBe(true);
  });

  it('returns false for different addresses', () => {
    expect(areAddressesEqual(DEFAULT_EOA_ADDRESS, BACKUP_SIGNER_ADDRESS)).toBe(
      false,
    );
  });

  it('returns false when first address is undefined', () => {
    expect(areAddressesEqual(undefined, DEFAULT_EOA_ADDRESS)).toBe(false);
  });

  it('returns false when second address is undefined', () => {
    expect(areAddressesEqual(DEFAULT_EOA_ADDRESS, undefined)).toBe(false);
  });

  it('returns false when both addresses are undefined', () => {
    expect(areAddressesEqual(undefined, undefined)).toBe(false);
  });

  it('returns false when first address is empty string', () => {
    expect(areAddressesEqual('', DEFAULT_EOA_ADDRESS)).toBe(false);
  });

  it('returns false when second address is empty string', () => {
    expect(areAddressesEqual(DEFAULT_EOA_ADDRESS, '')).toBe(false);
  });
});
