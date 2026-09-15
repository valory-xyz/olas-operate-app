import { EvmChainId, PROVIDERS } from '@/constants';

import { AGENT_CONFIG } from './agents';

const allAgentConfig = Object.values(AGENT_CONFIG);

/**
 * Provider entries for the chains enabled agents run on: each agent's home
 * chain plus, for multi-chain agents (e.g. Connect), every chain in
 * `supportedChains`. Balances are only polled on chains listed here.
 * @example
 * [{
 *    key: '1',
 *    value: { provider: JsonRpcProvider, multicallProvider: MulticallProvider }
 * }]
 */
export const providers = Object.entries(PROVIDERS).filter(([key]) => {
  const evmChainId = +key as EvmChainId;

  return allAgentConfig.some(
    (agentConfig) =>
      agentConfig.isAgentEnabled &&
      (agentConfig.evmHomeChainId === evmChainId ||
        agentConfig.supportedChains?.includes(evmChainId)),
  );
});
