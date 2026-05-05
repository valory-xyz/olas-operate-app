import { renderHook } from '@testing-library/react';

import { AGENT_CONFIG } from '../../../../config/agents';
import { AgentMap } from '../../../../constants/agent';
import { MiddlewareChainMap } from '../../../../constants/chains';
import { useConfiguredAgents } from '../../../../context/AutoRunProvider/hooks/useConfiguredAgents';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeChainConfig,
  makeService,
  MOCK_MULTISIG_ADDRESS,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../../../helpers/factories';

describe('useConfiguredAgents', () => {
  it('returns empty array when services is undefined', () => {
    const { result } = renderHook(() => useConfiguredAgents(undefined));
    expect(result.current).toEqual([]);
  });

  it('returns empty array when services is empty', () => {
    const { result } = renderHook(() => useConfiguredAgents([]));
    expect(result.current).toEqual([]);
  });

  it('maps a trader service to AgentMeta correctly', () => {
    const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];
    const service = makeService({
      service_public_id: traderConfig.servicePublicId,
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
        multisig: MOCK_MULTISIG_ADDRESS,
        token: DEFAULT_SERVICE_NFT_TOKEN_ID,
        staking_program_id: DEFAULT_STAKING_PROGRAM_ID,
      }),
    });

    const { result } = renderHook(() => useConfiguredAgents([service]));
    expect(result.current).toHaveLength(1);

    const meta = result.current[0];
    expect(meta.agentType).toBe(AgentMap.PredictTrader);
    expect(meta.serviceConfigId).toBe(DEFAULT_SERVICE_CONFIG_ID);
    expect(meta.chainId).toBe(traderConfig.evmHomeChainId);
    expect(meta.stakingProgramId).toBe(DEFAULT_STAKING_PROGRAM_ID);
    expect(meta.multisig).toBe(MOCK_MULTISIG_ADDRESS);
    expect(meta.serviceNftTokenId).toBe(DEFAULT_SERVICE_NFT_TOKEN_ID);
  });

  it('falls back to defaultStakingProgramId when user_params has no staking_program_id', () => {
    const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];
    const chainConfig = makeChainConfig(traderConfig.middlewareHomeChainId);
    // Remove the staking_program_id to test fallback
    const chain = traderConfig.middlewareHomeChainId;
    chainConfig[chain].chain_data.user_params.staking_program_id =
      '' as typeof DEFAULT_STAKING_PROGRAM_ID;

    const service = makeService({
      service_public_id: traderConfig.servicePublicId,
      home_chain: chain,
      chain_configs: chainConfig,
    });

    const { result } = renderHook(() => useConfiguredAgents([service]));
    expect(result.current[0].stakingProgramId).toBe(
      traderConfig.defaultStakingProgramId,
    );
  });

  it('skips services with no matching ACTIVE_AGENTS entry', () => {
    const service = makeService({
      service_public_id: 'unknown/service:0.1.0',
      home_chain: MiddlewareChainMap.GNOSIS,
    });

    const { result } = renderHook(() => useConfiguredAgents([service]));
    expect(result.current).toEqual([]);
  });

  it('skips services where chain_configs has no entry for home_chain', () => {
    const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];
    const service = makeService({
      service_public_id: traderConfig.servicePublicId,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: {}, // Empty chain configs
    });

    const { result } = renderHook(() => useConfiguredAgents([service]));
    expect(result.current).toEqual([]);
  });

  it('handles multiple services mapping to different agents', () => {
    const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];
    const polystratConfig = AGENT_CONFIG[AgentMap.Polystrat];

    const traderService = makeService({
      service_public_id: traderConfig.servicePublicId,
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId),
    });
    const polystratService = makeService({
      service_public_id: polystratConfig.servicePublicId,
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      home_chain: polystratConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(polystratConfig.middlewareHomeChainId),
    });

    const { result } = renderHook(() =>
      useConfiguredAgents([traderService, polystratService]),
    );
    expect(result.current).toHaveLength(2);
    expect(result.current[0].agentType).toBe(AgentMap.PredictTrader);
    expect(result.current[1].agentType).toBe(AgentMap.Polystrat);
  });

  it('is memoized — returns same reference when services unchanged', () => {
    const service = makeService({
      service_public_id: AGENT_CONFIG[AgentMap.PredictTrader].servicePublicId,
      home_chain: AGENT_CONFIG[AgentMap.PredictTrader].middlewareHomeChainId,
      chain_configs: makeChainConfig(
        AGENT_CONFIG[AgentMap.PredictTrader].middlewareHomeChainId,
      ),
    });
    const services = [service];

    const { result, rerender } = renderHook(() =>
      useConfiguredAgents(services),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
