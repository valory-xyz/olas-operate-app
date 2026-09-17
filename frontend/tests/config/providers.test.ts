import { AGENT_CONFIG } from '../../config/agents';
import { providers } from '../../config/providers';
import { EvmChainIdMap } from '../../constants/chains';
import { PROVIDERS } from '../../constants/providers';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

describe('providers', () => {
  it('includes exactly the home and supported chains of enabled agents', () => {
    const enabledEvmChainIds = new Set(
      Object.values(AGENT_CONFIG)
        .filter(({ isAgentEnabled }) => !!isAgentEnabled)
        .flatMap(({ evmHomeChainId, supportedChains }) =>
          [evmHomeChainId, ...(supportedChains ?? [])].map(String),
        ),
    );

    const expectedProviders = Object.entries(PROVIDERS).filter(([chainId]) =>
      enabledEvmChainIds.has(chainId),
    );

    expect(providers).toEqual(expectedProviders);
  });

  it('includes Robinhood, which is only reachable through Connect supportedChains', () => {
    expect(
      Object.values(AGENT_CONFIG).some(
        ({ evmHomeChainId }) => evmHomeChainId === EvmChainIdMap.Robinhood,
      ),
    ).toBe(false);
    expect(
      providers.some(([chainId]) => +chainId === EvmChainIdMap.Robinhood),
    ).toBe(true);
  });

  it('keeps provider/multicallProvider objects for each chain', () => {
    for (const [, providerConfig] of providers) {
      expect(providerConfig.provider).toBeDefined();
      expect(providerConfig.multicallProvider).toBeDefined();
    }
  });
});
