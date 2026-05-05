/**
 * Mock CHAIN_CONFIG for tests that mock `config/chains`.
 *
 * Usage inside jest.mock factory:
 * ```
 * jest.mock('../../config/chains', () =>
 *   require('../mocks/configChains').configChainsMock,
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EvmChainIdMap } = require('../../constants');

export const chainConfigMock = {
  [EvmChainIdMap.Gnosis]: {
    name: 'Gnosis',
    rpc: '',
    evmChainId: EvmChainIdMap.Gnosis,
  },
  [EvmChainIdMap.Optimism]: {
    name: 'Optimism',
    rpc: '',
    evmChainId: EvmChainIdMap.Optimism,
  },
  [EvmChainIdMap.Polygon]: {
    name: 'Polygon',
    rpc: '',
    evmChainId: EvmChainIdMap.Polygon,
  },
  [EvmChainIdMap.Base]: {
    name: 'Base',
    rpc: '',
    evmChainId: EvmChainIdMap.Base,
  },
  [EvmChainIdMap.Mode]: {
    name: 'Mode',
    rpc: '',
    evmChainId: EvmChainIdMap.Mode,
  },
};

export const configChainsMock = {
  CHAIN_CONFIG: chainConfigMock,
};
