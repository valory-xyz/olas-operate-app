import { setMulticallAddress } from 'ethers-multicall';

import { setupMulticallAddresses } from '../../utils/setupMulticall';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

const mockSetMulticallAddress = setMulticallAddress as jest.Mock;

describe('setupMulticallAddresses', () => {
  beforeEach(() => {
    mockSetMulticallAddress.mockClear();
  });

  it('uses the default multicall address for all chains', async () => {
    const defaultAddress = '0xcA11bde05977b3631167028862bE2a173976CA11';
    await setupMulticallAddresses();
    for (const call of mockSetMulticallAddress.mock.calls) {
      expect(call[1]).toBe(defaultAddress);
    }
  });

  it('passes numeric chain IDs', async () => {
    await setupMulticallAddresses();
    const chainIds = mockSetMulticallAddress.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(chainIds).toContain(8453);
    expect(chainIds).toContain(100);
    expect(chainIds).toContain(34443);
    expect(chainIds).toContain(10);
    expect(chainIds).toContain(137);
  });
});
