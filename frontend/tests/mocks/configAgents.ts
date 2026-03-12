/**
 * Mock ACTIVE_AGENTS for tests that mock `config/agents`.
 *
 * Usage inside jest.mock factory:
 * ```
 * jest.mock('../../config/agents', () =>
 *   require('../mocks/configAgents').configAgentsMock,
 * );
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { EvmChainIdMap, MiddlewareChainMap } = require('../../constants');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SERVICE_PUBLIC_ID_MAP } = require('../helpers/factories');

export const activeAgentsMock = [
  [
    'trader',
    {
      isAgentEnabled: true,
      servicePublicId: SERVICE_PUBLIC_ID_MAP.TRADER,
      evmHomeChainId: EvmChainIdMap.Gnosis,
      middlewareHomeChainId: MiddlewareChainMap.GNOSIS,
      displayName: 'Omenstrat',
    },
  ],
  [
    'optimus',
    {
      isAgentEnabled: true,
      servicePublicId: SERVICE_PUBLIC_ID_MAP.OPTIMUS,
      evmHomeChainId: EvmChainIdMap.Optimism,
      middlewareHomeChainId: MiddlewareChainMap.OPTIMISM,
      displayName: 'Optimus',
    },
  ],
  [
    'memeooorr',
    {
      isAgentEnabled: true,
      servicePublicId: SERVICE_PUBLIC_ID_MAP.MEMOOORR,
      evmHomeChainId: EvmChainIdMap.Base,
      middlewareHomeChainId: MiddlewareChainMap.BASE,
      displayName: 'Agents.fun',
    },
  ],
  [
    'pett_ai',
    {
      isAgentEnabled: true,
      servicePublicId: SERVICE_PUBLIC_ID_MAP.PETT_AI,
      evmHomeChainId: EvmChainIdMap.Base,
      middlewareHomeChainId: MiddlewareChainMap.BASE,
      displayName: 'PettBro by Pett.ai',
    },
  ],
];

export const configAgentsMock = {
  ACTIVE_AGENTS: activeAgentsMock,
};
