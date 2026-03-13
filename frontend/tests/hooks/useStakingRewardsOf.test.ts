import { renderHook } from '@testing-library/react';

import { AGENT_CONFIG } from '../../config/agents';
import { AgentMap } from '../../constants/agent';
import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { createActiveStakingProgramIdQuery } from '../../hooks/useActiveStakingProgramId';
import { createStakingRewardsQuery } from '../../hooks/useAgentStakingRewardsDetails';
import { useServices } from '../../hooks/useServices';
import { useStakingRewardsOf } from '../../hooks/useStakingRewardsOf';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeChainConfig,
  makeMiddlewareService,
  MOCK_MULTISIG_ADDRESS,
  MOCK_SERVICE_CONFIG_ID_2,
  SERVICE_PUBLIC_ID_MAP,
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

jest.mock('../../hooks/useDynamicRefetchInterval', () => ({
  useDynamicRefetchInterval: jest.fn((interval: number) => interval),
}));

jest.mock('../../hooks/useActiveStakingProgramId', () => ({
  createActiveStakingProgramIdQuery: jest.fn(() => ({
    queryKey: ['mock-staking-program-query'],
    queryFn: jest.fn(),
    enabled: true,
  })),
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
const mockCreateActiveStakingProgramIdQuery =
  createActiveStakingProgramIdQuery as jest.Mock;
const mockCreateStakingRewardsQuery = createStakingRewardsQuery as jest.Mock;

const GNOSIS = EvmChainIdMap.Gnosis;
const traderConfig = AGENT_CONFIG[AgentMap.PredictTrader];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setupServices = ({
  services = [],
  isFetched = true,
  getServiceConfigIdsOf,
}: {
  services?: ReturnType<typeof makeMiddlewareService>[];
  isFetched?: boolean;
  getServiceConfigIdsOf?: (chainId: number) => string[];
} = {}) => {
  mockUseServices.mockReturnValue({
    services,
    isFetched,
    getServiceConfigIdsOf:
      getServiceConfigIdsOf ?? (() => services.map((s) => s.service_config_id)),
  });
};

/**
 * Sets up mockUseQueries to handle two sequential calls:
 *  1st call -> staking program ID queries
 *  2nd call -> rewards queries
 */
const setupUseQueries = ({
  stakingProgramResults = [],
  rewardsResults = [],
}: {
  stakingProgramResults?: {
    data?: string | null;
    isLoading?: boolean;
    isSuccess?: boolean;
  }[];
  rewardsResults?: {
    data?: { accruedServiceStakingRewards?: number } | null;
    isLoading?: boolean;
    isSuccess?: boolean;
  }[];
} = {}) => {
  let callCount = 0;
  mockUseQueries.mockImplementation(() => {
    callCount++;
    // Odd calls are staking program queries, even calls are rewards queries
    if (callCount % 2 === 1) return stakingProgramResults;
    return rewardsResults;
  });
};

const makeGnosisTraderService = (
  overrides: Partial<ReturnType<typeof makeMiddlewareService>> = {},
) =>
  makeMiddlewareService(MiddlewareChainMap.GNOSIS, {
    service_public_id: SERVICE_PUBLIC_ID_MAP.TRADER,
    service_config_id: DEFAULT_SERVICE_CONFIG_ID,
    chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS),
    ...overrides,
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStakingRewardsOf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -- No services on chain -------------------------------------------------
  describe('when no services exist on the chain', () => {
    it('returns totalStakingRewards="0" and isLoading=false with empty services array', () => {
      setupServices({ services: [] });
      setupUseQueries();

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('0');
      expect(result.current.isLoading).toBe(false);
    });

    it('returns totalStakingRewards="0" when services is undefined', () => {
      mockUseServices.mockReturnValue({
        services: undefined,
        isFetched: false,
        getServiceConfigIdsOf: () => [],
      });
      setupUseQueries();

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('0');
      expect(result.current.isLoading).toBe(false);
    });
  });

  // -- Service filtering by chain -------------------------------------------
  describe('service filtering', () => {
    it('filters out services on a different chain', () => {
      const baseService = makeMiddlewareService(MiddlewareChainMap.BASE, {
        service_public_id: SERVICE_PUBLIC_ID_MAP.MEMOOORR,
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
        chain_configs: makeChainConfig(MiddlewareChainMap.BASE),
      });
      setupServices({
        services: [baseService],
        getServiceConfigIdsOf: () => [],
      });
      setupUseQueries();

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('0');
      expect(mockCreateActiveStakingProgramIdQuery).not.toHaveBeenCalled();
    });

    it('filters out services whose config ID is not in getServiceConfigIdsOf', () => {
      const service = makeGnosisTraderService();
      setupServices({
        services: [service],
        getServiceConfigIdsOf: () => [],
      });
      setupUseQueries();

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('0');
      expect(mockCreateActiveStakingProgramIdQuery).not.toHaveBeenCalled();
    });
  });

  // -- Single service with rewards ------------------------------------------
  describe('single service with rewards', () => {
    it('returns aggregated total from a single successful rewards query', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 1.5 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('1.5');
      expect(result.current.isLoading).toBe(false);
    });
  });

  // -- Multiple services sum rewards ----------------------------------------
  describe('multiple services', () => {
    it('sums rewards across multiple services', () => {
      const service1 = makeGnosisTraderService();
      const service2 = makeGnosisTraderService({
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      setupServices({ services: [service1, service2] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 2 },
            isLoading: false,
            isSuccess: true,
          },
          {
            data: { accruedServiceStakingRewards: 3 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('5.0');
      expect(result.current.isLoading).toBe(false);
    });
  });

  // -- Loading state --------------------------------------------------------
  describe('loading state', () => {
    it('returns isLoading=true when any rewards query is loading', () => {
      const service1 = makeGnosisTraderService();
      const service2 = makeGnosisTraderService({
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      setupServices({ services: [service1, service2] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 1 },
            isLoading: false,
            isSuccess: true,
          },
          { data: null, isLoading: true, isSuccess: false },
        ],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading=false when all rewards queries are done', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 0.5 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.isLoading).toBe(false);
    });
  });

  // -- Failed queries filtered out ------------------------------------------
  describe('failed queries', () => {
    it('only includes isSuccess queries in totalStakingRewards', () => {
      const service1 = makeGnosisTraderService();
      const service2 = makeGnosisTraderService({
        service_config_id: MOCK_SERVICE_CONFIG_ID_2,
      });
      setupServices({ services: [service1, service2] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 5 },
            isLoading: false,
            isSuccess: true,
          },
          { data: null, isLoading: false, isSuccess: false },
        ],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      // Only the first service's rewards should be counted
      expect(result.current.totalStakingRewards).toBe('5.0');
    });

    it('returns "0" when all queries fail', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [{ data: null, isLoading: false, isSuccess: false }],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('0');
    });
  });

  // -- Fallback to default staking program ID --------------------------------
  describe('staking program fallback', () => {
    it('uses defaultStakingProgramId when active staking program query is loading', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [{ data: undefined, isLoading: true }],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 1 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      renderHook(() => useStakingRewardsOf(GNOSIS));

      // When staking program is loading, selectedStakingProgramId should be null
      expect(mockCreateStakingRewardsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          stakingProgramId: null,
        }),
      );
    });

    it('uses defaultStakingProgramId when active program data is falsy', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [{ data: null, isLoading: false }],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 1 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(mockCreateStakingRewardsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          stakingProgramId: traderConfig.defaultStakingProgramId,
        }),
      );
    });

    it('uses activeStakingProgramId when available', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 1 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(mockCreateStakingRewardsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          stakingProgramId: DEFAULT_STAKING_PROGRAM_ID,
        }),
      );
    });
  });

  // -- createActiveStakingProgramIdQuery call args ---------------------------
  describe('createActiveStakingProgramIdQuery arguments', () => {
    it('passes correct params for each service', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 0 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(mockCreateActiveStakingProgramIdQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          evmHomeChainId: GNOSIS,
          serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
          serviceApi: traderConfig.serviceApi,
          isServicesLoaded: true,
        }),
      );
    });
  });

  // -- createStakingRewardsQuery call args -----------------------------------
  describe('createStakingRewardsQuery arguments', () => {
    it('passes service details including multisig and serviceConfigId', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: 0 },
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(mockCreateStakingRewardsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: GNOSIS,
          serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID,
          serviceConfigId: DEFAULT_SERVICE_CONFIG_ID,
          multisig: MOCK_MULTISIG_ADDRESS,
          agentConfig: traderConfig,
        }),
      );
    });
  });

  // -- Null accruedServiceStakingRewards falls back to 0 --------------------
  describe('accruedServiceStakingRewards edge cases', () => {
    it('treats undefined accruedServiceStakingRewards as 0', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [
          {
            data: { accruedServiceStakingRewards: undefined } as never,
            isLoading: false,
            isSuccess: true,
          },
        ],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('0.0');
    });

    it('handles null rewards data gracefully', () => {
      const service = makeGnosisTraderService();
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [
          { data: DEFAULT_STAKING_PROGRAM_ID, isLoading: false },
        ],
        rewardsResults: [{ data: null, isLoading: false, isSuccess: true }],
      });

      const { result } = renderHook(() => useStakingRewardsOf(GNOSIS));

      expect(result.current.totalStakingRewards).toBe('0.0');
    });
  });

  // -- Service with nil chain_configs -----------------------------------------
  describe('service with nil chain_configs', () => {
    it('returns null chain_data when chain_configs is nil', () => {
      const service = makeGnosisTraderService({
        chain_configs: undefined as never,
      });
      setupServices({ services: [service] });
      setupUseQueries({
        stakingProgramResults: [{ data: null, isLoading: false }],
        rewardsResults: [{ data: null, isLoading: false, isSuccess: false }],
      });

      renderHook(() => useStakingRewardsOf(GNOSIS));

      // The createStakingRewardsQuery should be called with
      // serviceNftTokenId and multisig from null chain_data
      expect(mockCreateStakingRewardsQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceNftTokenId: undefined,
          multisig: undefined,
        }),
      );
    });
  });
});
