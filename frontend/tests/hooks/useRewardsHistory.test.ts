import { renderHook } from '@testing-library/react';

import { EvmChainIdMap, MiddlewareChainMap } from '../../constants/chains';
import { useRewardsHistory } from '../../hooks/useRewardsHistory';
import {
  DEFAULT_LIVENESS_PERIOD_S,
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_CONTRACT_ADDRESS,
  DEFAULT_STAKING_PROGRAM_ID,
  DEFAULT_TS_CHECKPOINT,
  makeChainConfig,
  makeRewardsHistoryEntry,
  makeRewardsHistoryServiceResponse,
  makeService,
  MOCK_TX_HASH_1,
  MOCK_TX_HASH_2,
  MOCK_TX_HASH_3,
  SECOND_STAKING_CONTRACT_ADDRESS,
  SECOND_STAKING_PROGRAM_ID,
} from '../helpers/factories';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));

// Mock graphql-request
const mockGraphqlRequest = jest.fn();
jest.mock('graphql-request', () => ({
  request: (...args: unknown[]) => mockGraphqlRequest(...args),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    String.raw({ raw: strings }, ...values),
}));

// Mock useServices — called by useRewardsHistory AND useTransformCheckpoints
const mockGetStakingProgramIdByAddress = jest.fn();
const mockUseServices = jest.fn();
jest.mock('../../hooks/useServices', () => ({
  useServices: () => mockUseServices(),
}));

// Mock useService
const mockUseService = jest.fn();
jest.mock('../../hooks/useService', () => ({
  useService: (...args: unknown[]) => mockUseService(...args),
}));

// Mock @tanstack/react-query — capture config for queryFn / select testing
type QueryConfig = {
  queryKey: unknown[];
  queryFn: () => Promise<unknown>;
  select: (data: unknown) => unknown;
  enabled: boolean;
  refetchInterval: number;
};

let capturedQueryConfig: QueryConfig | null = null;
const mockRefetch = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (config: QueryConfig) => {
    capturedQueryConfig = config;

    // Call select on supplied data if we've set mock data
    const selectedData = mockQueryData
      ? config.select(mockQueryData)
      : undefined;

    return {
      isError: mockQueryState.isError,
      isLoading: mockQueryState.isLoading,
      isFetched: mockQueryState.isFetched,
      refetch: mockRefetch,
      data: selectedData,
    };
  },
}));

let mockQueryData: unknown = undefined;
let mockQueryState = { isError: false, isLoading: false, isFetched: true };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GNOSIS_CHAIN_ID = EvmChainIdMap.Gnosis;

const makeMockServiceApi = () => ({
  getStakingProgramIdByAddress: mockGetStakingProgramIdByAddress,
});

const setupUseServices = () => {
  mockUseServices.mockReturnValue({
    selectedService: makeService({
      service_config_id: DEFAULT_SERVICE_CONFIG_ID,
    }),
    selectedAgentConfig: {
      serviceApi: makeMockServiceApi(),
      evmHomeChainId: GNOSIS_CHAIN_ID,
    },
  });
};

const setupUseService = (token?: number) => {
  mockUseService.mockReturnValue({
    service: makeService({
      chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
        token: token ?? DEFAULT_SERVICE_NFT_TOKEN_ID,
      }),
    }),
  });
};

const setupDefaultMocks = () => {
  setupUseServices();
  setupUseService();
  mockGetStakingProgramIdByAddress.mockReturnValue(DEFAULT_STAKING_PROGRAM_ID);
  mockQueryData = undefined;
  mockQueryState = { isError: false, isLoading: false, isFetched: true };
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRewardsHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueryConfig = null;
    mockQueryData = undefined;
    mockQueryState = { isError: false, isLoading: false, isFetched: true };
    setupDefaultMocks();
  });

  // -----------------------------------------------------------------------
  // useQuery config
  // -----------------------------------------------------------------------

  describe('useQuery configuration', () => {
    it('sets enabled to true when serviceNftTokenId exists', () => {
      renderHook(() => useRewardsHistory());
      expect(capturedQueryConfig?.enabled).toBe(true);
    });

    it('sets enabled to false when serviceNftTokenId is undefined', () => {
      mockUseService.mockReturnValue({
        service: makeService({ chain_configs: {} }),
      });
      renderHook(() => useRewardsHistory());
      expect(capturedQueryConfig?.enabled).toBe(false);
    });

    it('sets enabled to true when serviceNftTokenId is -1 (invalid but truthy)', () => {
      mockUseService.mockReturnValue({
        service: makeService({
          chain_configs: makeChainConfig(MiddlewareChainMap.GNOSIS, {
            token: -1,
          }),
        }),
      });
      renderHook(() => useRewardsHistory());
      // -1 is truthy, so !!serviceId is true — no validation on value
      expect(capturedQueryConfig?.enabled).toBe(true);
    });

    it('includes chainId and serviceId in the queryKey', () => {
      renderHook(() => useRewardsHistory());
      expect(capturedQueryConfig?.queryKey).toEqual([
        'rewardsHistory',
        GNOSIS_CHAIN_ID,
        DEFAULT_SERVICE_NFT_TOKEN_ID,
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // queryFn
  // -----------------------------------------------------------------------

  describe('queryFn', () => {
    it('calls graphql request with correct URL and variables', async () => {
      const serviceResponse = makeRewardsHistoryServiceResponse();
      mockGraphqlRequest.mockResolvedValue(serviceResponse);

      renderHook(() => useRewardsHistory());
      const result = await capturedQueryConfig!.queryFn();

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('subgraph'),
        expect.any(String),
        { serviceId: `${DEFAULT_SERVICE_NFT_TOKEN_ID}` },
      );
      expect(result).toEqual(serviceResponse.service);
    });

    it('returns null when Zod parse fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Return invalid shape — missing required fields
      mockGraphqlRequest.mockResolvedValue({ service: { bad: 'data' } });

      renderHook(() => useRewardsHistory());
      const result = await capturedQueryConfig!.queryFn();

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse service rewards:',
        expect.anything(),
      );

      consoleErrorSpy.mockRestore();
    });

    it('returns null when service is null in the response', async () => {
      mockGraphqlRequest.mockResolvedValue({ service: null });

      renderHook(() => useRewardsHistory());
      const result = await capturedQueryConfig!.queryFn();

      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // select (checkpoint transformation)
  // -----------------------------------------------------------------------

  describe('select — null/empty service', () => {
    it('returns empty contractCheckpoints and undefined latestStakingContract for null service', () => {
      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select(null);

      expect(result).toEqual({
        contractCheckpoints: {},
        latestStakingContract: undefined,
      });
    });

    it('returns empty contractCheckpoints when rewardsHistory is empty', () => {
      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [],
      });

      expect(result).toEqual({
        contractCheckpoints: {},
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
      });
    });
  });

  describe('select — checkpoint transformation', () => {
    it('transforms a single rewards history entry into a Checkpoint', () => {
      mockGetStakingProgramIdByAddress.mockReturnValue(
        DEFAULT_STAKING_PROGRAM_ID,
      );

      const entry = makeRewardsHistoryEntry({
        epoch: '1',
        rewardAmount: '2000000000000000000', // 2 OLAS
        blockTimestamp: `${DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S}`,
        transactionHash: MOCK_TX_HASH_1,
        checkpoint: {
          epochLength: `${DEFAULT_LIVENESS_PERIOD_S}`,
          availableRewards: '1000000000000000000',
        },
      });

      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [entry],
      }) as { contractCheckpoints: Record<string, unknown[]> };

      const checkpoints =
        result.contractCheckpoints[DEFAULT_STAKING_CONTRACT_ADDRESS];
      expect(checkpoints).toHaveLength(1);

      const cp = checkpoints[0] as Record<string, unknown>;
      expect(cp.epoch).toBe('1');
      expect(cp.reward).toBe(2);
      expect(cp.earned).toBe(true);
      expect(cp.contractName).toBe(DEFAULT_STAKING_PROGRAM_ID);
      expect(cp.transactionHash).toBe(MOCK_TX_HASH_1);
      expect(cp.epochEndTimeStamp).toBe(
        DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S,
      );
    });

    it('sets earned to false when rewardAmount is 0', () => {
      const entry = makeRewardsHistoryEntry({ rewardAmount: '0' });

      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [entry],
      }) as { contractCheckpoints: Record<string, Array<{ earned: boolean }>> };

      const cp =
        result.contractCheckpoints[DEFAULT_STAKING_CONTRACT_ADDRESS][0];
      expect(cp.earned).toBe(false);
    });

    it('derives epochStartTimeStamp from previous entry blockTimestamp for non-zero epoch', () => {
      const previousTimestamp = DEFAULT_TS_CHECKPOINT;
      const currentTimestamp =
        DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S;

      const entries = [
        makeRewardsHistoryEntry({
          epoch: '2',
          blockTimestamp: `${currentTimestamp}`,
          transactionHash: MOCK_TX_HASH_1,
        }),
        makeRewardsHistoryEntry({
          epoch: '1',
          blockTimestamp: `${previousTimestamp}`,
          transactionHash: MOCK_TX_HASH_2,
        }),
      ];

      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: entries,
      }) as {
        contractCheckpoints: Record<
          string,
          Array<{ epochStartTimeStamp: number }>
        >;
      };

      const cps = result.contractCheckpoints[DEFAULT_STAKING_CONTRACT_ADDRESS];
      // epoch 2's start should be epoch 1's blockTimestamp
      expect(cps[0].epochStartTimeStamp).toBe(previousTimestamp);
    });

    it('derives epochStartTimeStamp as blockTimestamp - epochLength for epoch 0', () => {
      const entry = makeRewardsHistoryEntry({
        epoch: '0',
        blockTimestamp: `${DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S}`,
        checkpoint: {
          epochLength: `${DEFAULT_LIVENESS_PERIOD_S}`,
          availableRewards: '1000000000000000000',
        },
      });

      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [entry],
      }) as {
        contractCheckpoints: Record<
          string,
          Array<{ epochStartTimeStamp: number }>
        >;
      };

      const cp =
        result.contractCheckpoints[DEFAULT_STAKING_CONTRACT_ADDRESS][0];
      expect(cp.epochStartTimeStamp).toBe(DEFAULT_TS_CHECKPOINT);
    });

    it('derives epochStartTimeStamp as blockTimestamp - epochLength when previous entry is missing (last in list)', () => {
      // Single non-zero epoch entry with no previous entry
      const entry = makeRewardsHistoryEntry({
        epoch: '5',
        blockTimestamp: `${DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S}`,
        checkpoint: {
          epochLength: `${DEFAULT_LIVENESS_PERIOD_S}`,
          availableRewards: '1000000000000000000',
        },
      });

      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [entry],
      }) as {
        contractCheckpoints: Record<
          string,
          Array<{ epochStartTimeStamp: number }>
        >;
      };

      const cp =
        result.contractCheckpoints[DEFAULT_STAKING_CONTRACT_ADDRESS][0];
      // No next entry, so falls back to blockTimestamp - epochLength
      expect(cp.epochStartTimeStamp).toBe(DEFAULT_TS_CHECKPOINT);
    });

    it('uses epochLength of 0 when checkpoint is null', () => {
      const entry = makeRewardsHistoryEntry({
        epoch: '0',
        blockTimestamp: `${DEFAULT_TS_CHECKPOINT}`,
        checkpoint: null,
      });

      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [entry],
      }) as {
        contractCheckpoints: Record<
          string,
          Array<{ epochStartTimeStamp: number; epochLength: string }>
        >;
      };

      const cp =
        result.contractCheckpoints[DEFAULT_STAKING_CONTRACT_ADDRESS][0];
      expect(cp.epochLength).toBe('0');
      // blockTimestamp - 0 = blockTimestamp
      expect(cp.epochStartTimeStamp).toBe(DEFAULT_TS_CHECKPOINT);
    });

    it('groups checkpoints by contract address', () => {
      mockGetStakingProgramIdByAddress
        .mockReturnValueOnce(DEFAULT_STAKING_PROGRAM_ID)
        .mockReturnValueOnce(SECOND_STAKING_PROGRAM_ID);

      const entry1 = makeRewardsHistoryEntry({
        contractAddress: DEFAULT_STAKING_CONTRACT_ADDRESS,
        transactionHash: MOCK_TX_HASH_1,
      });
      const entry2 = makeRewardsHistoryEntry({
        contractAddress: SECOND_STAKING_CONTRACT_ADDRESS,
        transactionHash: MOCK_TX_HASH_2,
      });

      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [entry1, entry2],
      }) as { contractCheckpoints: Record<string, unknown[]> };

      expect(Object.keys(result.contractCheckpoints)).toHaveLength(2);
      expect(
        result.contractCheckpoints[DEFAULT_STAKING_CONTRACT_ADDRESS],
      ).toHaveLength(1);
      expect(
        result.contractCheckpoints[SECOND_STAKING_CONTRACT_ADDRESS],
      ).toHaveLength(1);
    });

    it('converts latestStakingContract null to undefined', () => {
      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: null,
        rewardsHistory: [],
      }) as { latestStakingContract?: string };

      expect(result.latestStakingContract).toBeUndefined();
    });

    it('returns empty contractCheckpoints when rewardsHistory is undefined (|| [] fallback)', () => {
      renderHook(() => useRewardsHistory());
      const result = capturedQueryConfig!.select({
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: undefined,
      }) as { contractCheckpoints: Record<string, unknown[]> };

      expect(result.contractCheckpoints).toEqual({});
    });
  });

  // -----------------------------------------------------------------------
  // Aggregation: totalRewards, latestRewardStreak, epochSortedCheckpoints
  // -----------------------------------------------------------------------

  describe('aggregation — totalRewards', () => {
    it('returns 0 when contractCheckpoints is undefined (no data)', () => {
      mockQueryData = undefined;

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.totalRewards).toBe(0);
    });

    it('sums rewards across all contracts', () => {
      mockGetStakingProgramIdByAddress.mockReturnValue(
        DEFAULT_STAKING_PROGRAM_ID,
      );

      const entry1 = makeRewardsHistoryEntry({
        contractAddress: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardAmount: '1000000000000000000', // 1 OLAS
        transactionHash: MOCK_TX_HASH_1,
      });
      const entry2 = makeRewardsHistoryEntry({
        contractAddress: SECOND_STAKING_CONTRACT_ADDRESS,
        rewardAmount: '3000000000000000000', // 3 OLAS
        transactionHash: MOCK_TX_HASH_2,
      });

      // Provide service data that will be transformed by select
      mockQueryData = {
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [entry1, entry2],
      };

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.totalRewards).toBe(4);
    });
  });

  describe('aggregation — latestRewardStreak', () => {
    it('returns 0 when loading', () => {
      mockQueryState = { isError: false, isLoading: true, isFetched: false };

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.latestRewardStreak).toBe(0);
    });

    it('returns 0 when not yet fetched', () => {
      mockQueryState = { isError: false, isLoading: false, isFetched: false };

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.latestRewardStreak).toBe(0);
    });

    it('counts consecutive earned checkpoints from most recent', () => {
      mockGetStakingProgramIdByAddress.mockReturnValue(
        DEFAULT_STAKING_PROGRAM_ID,
      );

      // 3 entries: earned (newest), earned, not earned (oldest)
      // Sorted by epochEndTimeStamp descending => streak = 2
      const entries = [
        makeRewardsHistoryEntry({
          epoch: '3',
          rewardAmount: '1000000000000000000',
          blockTimestamp: `${DEFAULT_TS_CHECKPOINT + 3 * DEFAULT_LIVENESS_PERIOD_S}`,
          transactionHash: MOCK_TX_HASH_1,
        }),
        makeRewardsHistoryEntry({
          epoch: '2',
          rewardAmount: '1000000000000000000',
          blockTimestamp: `${DEFAULT_TS_CHECKPOINT + 2 * DEFAULT_LIVENESS_PERIOD_S}`,
          transactionHash: MOCK_TX_HASH_2,
        }),
        makeRewardsHistoryEntry({
          epoch: '1',
          rewardAmount: '0',
          blockTimestamp: `${DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S}`,
          transactionHash: MOCK_TX_HASH_3,
        }),
      ];

      mockQueryData = {
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: entries,
      };

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.latestRewardStreak).toBe(2);
    });

    it('returns 0 when the most recent checkpoint has no reward', () => {
      mockGetStakingProgramIdByAddress.mockReturnValue(
        DEFAULT_STAKING_PROGRAM_ID,
      );

      const entries = [
        makeRewardsHistoryEntry({
          epoch: '2',
          rewardAmount: '0',
          blockTimestamp: `${DEFAULT_TS_CHECKPOINT + 2 * DEFAULT_LIVENESS_PERIOD_S}`,
          transactionHash: MOCK_TX_HASH_1,
        }),
        makeRewardsHistoryEntry({
          epoch: '1',
          rewardAmount: '1000000000000000000',
          blockTimestamp: `${DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S}`,
          transactionHash: MOCK_TX_HASH_2,
        }),
      ];

      mockQueryData = {
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: entries,
      };

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.latestRewardStreak).toBe(0);
    });
  });

  describe('aggregation — epochSortedCheckpoints', () => {
    it('returns checkpoints sorted by epochEndTimeStamp descending', () => {
      mockGetStakingProgramIdByAddress.mockReturnValue(
        DEFAULT_STAKING_PROGRAM_ID,
      );

      const ts1 = DEFAULT_TS_CHECKPOINT + DEFAULT_LIVENESS_PERIOD_S;
      const ts2 = DEFAULT_TS_CHECKPOINT + 2 * DEFAULT_LIVENESS_PERIOD_S;
      const ts3 = DEFAULT_TS_CHECKPOINT + 3 * DEFAULT_LIVENESS_PERIOD_S;

      // Provide entries across two contracts — they should be merged and sorted
      const entries = [
        makeRewardsHistoryEntry({
          contractAddress: DEFAULT_STAKING_CONTRACT_ADDRESS,
          epoch: '1',
          blockTimestamp: `${ts1}`,
          transactionHash: MOCK_TX_HASH_1,
        }),
        makeRewardsHistoryEntry({
          contractAddress: SECOND_STAKING_CONTRACT_ADDRESS,
          epoch: '2',
          blockTimestamp: `${ts3}`,
          transactionHash: MOCK_TX_HASH_2,
        }),
        makeRewardsHistoryEntry({
          contractAddress: DEFAULT_STAKING_CONTRACT_ADDRESS,
          epoch: '2',
          blockTimestamp: `${ts2}`,
          transactionHash: MOCK_TX_HASH_3,
        }),
      ];

      mockQueryData = {
        id: '42',
        latestStakingContract: DEFAULT_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: entries,
      };

      const { result } = renderHook(() => useRewardsHistory());
      const timestamps = result.current.allCheckpoints.map(
        (cp) => cp.epochEndTimeStamp,
      );
      expect(timestamps).toEqual([ts3, ts2, ts1]);
    });
  });

  // -----------------------------------------------------------------------
  // Return shape
  // -----------------------------------------------------------------------

  describe('returned values', () => {
    it('returns recentStakingContractAddress from latestStakingContract', () => {
      mockGetStakingProgramIdByAddress.mockReturnValue(
        DEFAULT_STAKING_PROGRAM_ID,
      );

      mockQueryData = {
        id: '42',
        latestStakingContract: SECOND_STAKING_CONTRACT_ADDRESS,
        rewardsHistory: [makeRewardsHistoryEntry()],
      };

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.recentStakingContractAddress).toBe(
        SECOND_STAKING_CONTRACT_ADDRESS,
      );
    });

    it('exposes isError, isFetched, isLoading from the query', () => {
      mockQueryState = { isError: true, isLoading: false, isFetched: true };

      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.isError).toBe(true);
      expect(result.current.isFetched).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('exposes refetch function', () => {
      const { result } = renderHook(() => useRewardsHistory());
      expect(result.current.refetch).toBe(mockRefetch);
    });
  });
});
