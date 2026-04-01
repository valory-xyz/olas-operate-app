import React from 'react';
import { renderHook } from '@testing-library/react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap } from '../../constants/agent';
import { MiddlewareChainMap } from '../../constants/chains';
import { StakingProgramContext } from '../../context/StakingProgramProvider';
import { createStakingRewardsQuery } from '../../hooks/useAgentStakingRewardsDetails';
import { useAllInstancesRewardStatus } from '../../hooks/useAllInstancesRewardStatus';
import { useServices } from '../../hooks/useServices';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeChainConfig,
  makeMiddlewareService,
  makeStakingRewardsInfo,
  MOCK_MULTISIG_ADDRESS,
  MOCK_SERVICE_CONFIG_ID_2,
} from '../helpers/factories';

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
jest.mock(
  '../../context/OnlineStatusProvider',
  () => require('../mocks/onlineStatus').onlineStatusProviderMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

jest.mock('../../hooks/useServices', () => ({
  useServices: jest.fn(),
}));

jest.mock('../../hooks/useAgentStakingRewardsDetails', () => ({
  createStakingRewardsQuery: jest.fn(() => ({
    queryKey: ['mock-staking-rewards-query'],
    queryFn: jest.fn(),
    enabled: true,
  })),
}));

const mockUseQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueries: (...args: unknown[]) => mockUseQueries(...args),
}));

const mockUseServices = useServices as jest.Mock;
const mockCreateStakingRewardsQuery = createStakingRewardsQuery as jest.Mock;

const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];

const baseContextValue: React.ContextType<typeof StakingProgramContext> = {
  isActiveStakingProgramLoaded: true,
  selectedStakingProgramId: null,
  setDefaultStakingProgramId: () => {},
  stakingProgramIdToMigrateTo: null,
  setStakingProgramIdToMigrateTo: () => {},
  stakingProgramIdByServiceConfigId: new Map(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAllInstancesRewardStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty map when services is undefined', () => {
    mockUseServices.mockReturnValue({ services: undefined });
    mockUseQueries.mockReturnValue([]);

    const { result } = renderHook(() => useAllInstancesRewardStatus(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          StakingProgramContext.Provider,
          { value: baseContextValue },
          children,
        ),
    });

    expect(result.current.size).toBe(0);
  });

  it('returns map with true when query returns isEligibleForRewards=true', () => {
    const service = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      service_public_id: traderConfig.servicePublicId,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
        multisig: MOCK_MULTISIG_ADDRESS,
        token: DEFAULT_SERVICE_NFT_TOKEN_ID,
        staking_program_id: DEFAULT_STAKING_PROGRAM_ID,
      }),
    });

    mockUseServices.mockReturnValue({ services: [service] });
    mockCreateStakingRewardsQuery.mockReturnValue({
      queryKey: ['mock'],
      queryFn: jest.fn(),
      enabled: true,
    });
    mockUseQueries.mockReturnValue([
      {
        isSuccess: true,
        data: makeStakingRewardsInfo({ isEligibleForRewards: true }),
      },
    ]);

    const stakingMap = new Map([
      [DEFAULT_SERVICE_CONFIG_ID, DEFAULT_STAKING_PROGRAM_ID],
    ]);

    const { result } = renderHook(() => useAllInstancesRewardStatus(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          StakingProgramContext.Provider,
          {
            value: {
              ...baseContextValue,
              stakingProgramIdByServiceConfigId: stakingMap,
            },
          },
          children,
        ),
    });

    expect(result.current.get(DEFAULT_SERVICE_CONFIG_ID)).toBe(true);
  });

  it('returns map with false when query returns isEligibleForRewards=false', () => {
    const service = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      service_public_id: traderConfig.servicePublicId,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
        multisig: MOCK_MULTISIG_ADDRESS,
        token: DEFAULT_SERVICE_NFT_TOKEN_ID,
        staking_program_id: DEFAULT_STAKING_PROGRAM_ID,
      }),
    });

    mockUseServices.mockReturnValue({ services: [service] });
    mockCreateStakingRewardsQuery.mockReturnValue({
      queryKey: ['mock'],
      queryFn: jest.fn(),
      enabled: true,
    });
    mockUseQueries.mockReturnValue([
      {
        isSuccess: true,
        data: makeStakingRewardsInfo({ isEligibleForRewards: false }),
      },
    ]);

    const stakingMap = new Map([
      [DEFAULT_SERVICE_CONFIG_ID, DEFAULT_STAKING_PROGRAM_ID],
    ]);

    const { result } = renderHook(() => useAllInstancesRewardStatus(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          StakingProgramContext.Provider,
          {
            value: {
              ...baseContextValue,
              stakingProgramIdByServiceConfigId: stakingMap,
            },
          },
          children,
        ),
    });

    expect(result.current.get(DEFAULT_SERVICE_CONFIG_ID)).toBe(false);
  });

  it('returns undefined for loading queries', () => {
    const service = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      service_public_id: traderConfig.servicePublicId,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
        staking_program_id: DEFAULT_STAKING_PROGRAM_ID,
      }),
    });

    mockUseServices.mockReturnValue({ services: [service] });
    mockUseQueries.mockReturnValue([{ isSuccess: false, data: undefined }]);

    const stakingMap = new Map([
      [DEFAULT_SERVICE_CONFIG_ID, DEFAULT_STAKING_PROGRAM_ID],
    ]);

    const { result } = renderHook(() => useAllInstancesRewardStatus(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          StakingProgramContext.Provider,
          {
            value: {
              ...baseContextValue,
              stakingProgramIdByServiceConfigId: stakingMap,
            },
          },
          children,
        ),
    });

    expect(result.current.get(DEFAULT_SERVICE_CONFIG_ID)).toBeUndefined();
  });

  it('skips services without a matching ACTIVE_AGENTS entry', () => {
    const unknownService = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      service_public_id: 'unknown/service:0.1.0',
    });

    mockUseServices.mockReturnValue({ services: [unknownService] });
    mockUseQueries.mockReturnValue([]);

    const { result } = renderHook(() => useAllInstancesRewardStatus(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          StakingProgramContext.Provider,
          { value: baseContextValue },
          children,
        ),
    });

    expect(result.current.size).toBe(0);
  });

  it('handles multiple services independently', () => {
    const service1 = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      service_public_id: traderConfig.servicePublicId,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
        staking_program_id: DEFAULT_STAKING_PROGRAM_ID,
      }),
    });
    const service2 = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      service_public_id: traderConfig.servicePublicId,
      home_chain: traderConfig.middlewareHomeChainId,
      chain_configs: makeChainConfig(traderConfig.middlewareHomeChainId, {
        staking_program_id: DEFAULT_STAKING_PROGRAM_ID,
      }),
    });

    mockUseServices.mockReturnValue({ services: [service1, service2] });
    mockUseQueries.mockReturnValue([
      {
        isSuccess: true,
        data: makeStakingRewardsInfo({ isEligibleForRewards: true }),
      },
      {
        isSuccess: true,
        data: makeStakingRewardsInfo({ isEligibleForRewards: false }),
      },
    ]);

    const stakingMap = new Map([
      [DEFAULT_SERVICE_CONFIG_ID, DEFAULT_STAKING_PROGRAM_ID],
      [MOCK_SERVICE_CONFIG_ID_2, DEFAULT_STAKING_PROGRAM_ID],
    ]);

    const { result } = renderHook(() => useAllInstancesRewardStatus(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          StakingProgramContext.Provider,
          {
            value: {
              ...baseContextValue,
              stakingProgramIdByServiceConfigId: stakingMap,
            },
          },
          children,
        ),
    });

    expect(result.current.get(DEFAULT_SERVICE_CONFIG_ID)).toBe(true);
    expect(result.current.get(MOCK_SERVICE_CONFIG_ID_2)).toBe(false);
  });

  it('skips service and does not crash when asEvmChainId throws for unknown chain', () => {
    const badService = makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      service_public_id: traderConfig.servicePublicId,
      home_chain: 'unknown_chain' as typeof MiddlewareChainMap.GNOSIS,
      chain_configs: {},
    });

    mockUseServices.mockReturnValue({ services: [badService] });
    mockUseQueries.mockReturnValue([]);

    const { result } = renderHook(() => useAllInstancesRewardStatus(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          StakingProgramContext.Provider,
          { value: baseContextValue },
          children,
        ),
    });

    expect(result.current.size).toBe(0);
  });
});
