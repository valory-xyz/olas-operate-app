import { AGENT_CONFIG } from '../../config/agents';
import { providers } from '../../config/providers';
import { PROVIDERS } from '../../constants/providers';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */

describe('providers', () => {
  it('includes exactly chains that have an enabled agent', () => {
    const enabledEvmChainIds = new Set(
      Object.values(AGENT_CONFIG)
        .filter(({ isAgentEnabled }) => !!isAgentEnabled)
        .map(({ evmHomeChainId }) => String(evmHomeChainId)),
    );

    const expectedProviders = Object.entries(PROVIDERS).filter(([chainId]) =>
      enabledEvmChainIds.has(chainId),
    );

    expect(providers).toEqual(expectedProviders);
  });

  it('keeps provider/multicallProvider objects for each chain', () => {
    for (const [, providerConfig] of providers) {
      expect(providerConfig.provider).toBeDefined();
      expect(providerConfig.multicallProvider).toBeDefined();
    }
  });
});
