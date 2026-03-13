import { setMulticallAddress } from 'ethers-multicall';

import { EvmChainIdMap } from '../../constants/chains';
import { setupMulticallAddresses } from '../../utils/setupMulticall';
import { DEFAULT_MULTICALL_ADDRESS } from '../helpers/factories';

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
    await setupMulticallAddresses();
    for (const call of mockSetMulticallAddress.mock.calls) {
      expect(call[1]).toBe(DEFAULT_MULTICALL_ADDRESS);
    }
  });

  it('passes numeric chain IDs for all supported chains', async () => {
    await setupMulticallAddresses();
    const chainIds = mockSetMulticallAddress.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(chainIds).toContain(EvmChainIdMap.Base);
    expect(chainIds).toContain(EvmChainIdMap.Gnosis);
    expect(chainIds).toContain(EvmChainIdMap.Mode);
    expect(chainIds).toContain(EvmChainIdMap.Optimism);
    expect(chainIds).toContain(EvmChainIdMap.Polygon);
  });

  it('calls setMulticallAddress once per supported chain', async () => {
    await setupMulticallAddresses();
    const supportedChainCount = Object.values(EvmChainIdMap).length;
    expect(mockSetMulticallAddress).toHaveBeenCalledTimes(supportedChainCount);
  });
});
