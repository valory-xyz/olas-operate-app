import { NA } from '../../constants/symbols';
import { truncateAddress } from '../../utils/truncate';

describe('truncateAddress', () => {
  const fullAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD63';

  it('truncates with default length of 4', () => {
    expect(truncateAddress(fullAddress)).toBe('0x742d...bD63');
  });

  it('truncates with custom length', () => {
    expect(truncateAddress(fullAddress, 6)).toBe('0x742d35...f2bD63');
  });

  it('truncates with length of 1', () => {
    expect(truncateAddress(fullAddress, 1)).toBe('0x7...3');
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
