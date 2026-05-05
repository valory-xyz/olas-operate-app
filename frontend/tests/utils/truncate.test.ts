import { NA } from '../../constants/symbols';
import { truncateAddress } from '../../utils/truncate';
import { DEFAULT_EOA_ADDRESS } from '../helpers/factories';

describe('truncateAddress', () => {
  it('truncates with default length of 4', () => {
    expect(truncateAddress(DEFAULT_EOA_ADDRESS)).toBe('0x1234...5678');
  });

  it('truncates with custom length', () => {
    expect(truncateAddress(DEFAULT_EOA_ADDRESS, 6)).toBe('0x123456...345678');
  });

  it('truncates with length of 1', () => {
    expect(truncateAddress(DEFAULT_EOA_ADDRESS, 1)).toBe('0x1...8');
  });

  it('returns NA for non-string input', () => {
    // @ts-expect-error Testing non-string input
    expect(truncateAddress(123)).toBe(NA);
    // @ts-expect-error Testing non-string input
    expect(truncateAddress(null)).toBe(NA);
    // @ts-expect-error Testing non-string input
    expect(truncateAddress(undefined)).toBe(NA);
  });

  it('handles short addresses', () => {
    expect(truncateAddress('0xABCD', 2)).toBe('0xAB...CD');
  });
});
