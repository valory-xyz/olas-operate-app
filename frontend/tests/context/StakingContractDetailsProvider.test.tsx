import { renderHook, waitFor } from '@testing-library/react';
import { act, createElement, PropsWithChildren, useContext } from 'react';

import { EvmChainIdMap } from '../../constants/chains';
import { THIRTY_SECONDS_INTERVAL } from '../../constants/intervals';
import { StakingProgramId } from '../../constants/stakingProgram';
import {
  StakingContractDetailsContext,
  StakingContractDetailsProvider,
} from '../../context/StakingContractDetailsProvider';
import { StakingProgramContext } from '../../context/StakingProgramProvider';
import { AgentConfig } from '../../types/Agent';
import { Service } from '../../types/Service';
import { createStakingProgramContextValue } from '../helpers/contextDefaults';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_SERVICE_NFT_TOKEN_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeService,
  makeServiceStakingDetails,
  makeStakingContractDetails,
  SECOND_STAKING_PROGRAM_ID,
} from '../helpers/factories';

// ── Module mocks ──────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock(
  'ethers-multicall',
  () => require('../mocks/ethersMulticall').ethersMulticallMock,
);
/* eslint-enable @typescript-eslint/no-var-requires */
jest.mock('../../constants/providers', () => ({}));
jest.mock('../../config/providers', () => ({}));

// ── Hook mocks ────────────────────────────────────────────────────────

const mockGetStakingContractDetails = jest.fn();
const mockGetServiceStakingDetails = jest.fn();

const mockServiceApi = {
  getStakingContractDetails: mockGetStakingContractDetails,
  getServiceStakingDetails: mockGetServiceStakingDetails,
};

const mockUseServices = jest.fn<
  {
    selectedService?: Service;
    selectedAgentConfig: Partial<AgentConfig>;
  },
  []
>();

const mockUseService = jest.fn<{ serviceNftTokenId?: number }, [string?]>();

const mockUseStakingProgram = jest.fn<{ allStakingProgramIds: string[] }, []>();

const mockUseDynamicRefetchInterval = jest.fn((interval: number) => interval);

jest.mock('../../hooks', () => ({
  useServices: () => mockUseServices(),
  useService: (...args: [string?]) => mockUseService(...args),
  useStakingProgram: () => mockUseStakingProgram(),
  useDynamicRefetchInterval: (...args: [number]) =>
    mockUseDynamicRefetchInterval(...args),
}));

// ── react-query mock ──────────────────────────────────────────────────

const mockRefetch = jest.fn().mockResolvedValue({});

type UseQueryConfig = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  enabled?: boolean;
  refetchInterval?: number | false | ((query: unknown) => number | false);
  refetchIntervalInBackground?: boolean;
};

type UseQueriesConfig = {
  queries: Array<{
    queryKey: readonly unknown[];
    queryFn: () => Promise<unknown>;
    refetchInterval?: (query: unknown) => number | false;
    refetchIntervalInBackground?: boolean;
    onError?: (error: Error) => void;
  }>;
};

let capturedUseQueryConfig: UseQueryConfig | undefined;
let capturedUseQueriesConfig: UseQueriesConfig | undefined;

const mockUseQuery = jest.fn();
const mockUseQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useQueries: (...args: unknown[]) => mockUseQueries(...args),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const EVM_CHAIN_ID = EvmChainIdMap.Gnosis;
const ALL_PROGRAM_IDS = [DEFAULT_STAKING_PROGRAM_ID, SECOND_STAKING_PROGRAM_ID];
const STAKING_CONTRACT_DETAILS = makeStakingContractDetails();
const SERVICE_STAKING_DETAILS = makeServiceStakingDetails();

const makeDefaultQueriesReturn = (programIds: string[]) =>
  programIds.map(() => ({
    status: 'loading' as string,
    data: undefined as unknown,
    isSuccess: false,
    error: undefined as unknown,
  }));

const setupMocks = ({
  selectedService = makeService() as Service,
  serviceNftTokenId = DEFAULT_SERVICE_NFT_TOKEN_ID as number | undefined,
  allStakingProgramIds = ALL_PROGRAM_IDS as string[],
  selectedStakingProgramId = DEFAULT_STAKING_PROGRAM_ID as StakingProgramId | null,
  useQueryReturn = {
    data: undefined as unknown,
    isLoading: false,
    refetch: mockRefetch,
  },
  useQueriesReturn,
}: {
  selectedService?: Service;
  serviceNftTokenId?: number;
  allStakingProgramIds?: string[];
  selectedStakingProgramId?: StakingProgramId | null;
  useQueryReturn?: {
    data: unknown;
    isLoading: boolean;
    refetch: jest.Mock;
  };
  useQueriesReturn?: Array<{
    status: string;
    data?: unknown;
    isSuccess: boolean;
    error?: unknown;
  }>;
} = {}) => {
  const resolvedQueriesReturn =
    useQueriesReturn ?? makeDefaultQueriesReturn(allStakingProgramIds);
  mockUseServices.mockReturnValue({
    selectedService,
    selectedAgentConfig: {
      serviceApi: mockServiceApi as unknown as AgentConfig['serviceApi'],
      evmHomeChainId: EVM_CHAIN_ID,
    },
  });

  mockUseService.mockReturnValue({ serviceNftTokenId });

  mockUseStakingProgram.mockReturnValue({ allStakingProgramIds });

  capturedUseQueryConfig = undefined;
  capturedUseQueriesConfig = undefined;

  mockUseQuery.mockImplementation((config: UseQueryConfig) => {
    capturedUseQueryConfig = config;
    return useQueryReturn;
  });

  mockUseQueries.mockImplementation((config: UseQueriesConfig) => {
    capturedUseQueriesConfig = config;
    return resolvedQueriesReturn;
  });

  return { selectedStakingProgramId };
};

const wrapper = (
  selectedStakingProgramId: StakingProgramId | null = DEFAULT_STAKING_PROGRAM_ID,
) => {
  const Wrapper = ({ children }: PropsWithChildren) =>
    createElement(
      StakingProgramContext.Provider,
      {
        value: createStakingProgramContextValue({
          activeStakingProgramId: selectedStakingProgramId ?? undefined,
          defaultStakingProgramId: selectedStakingProgramId ?? undefined,
          selectedStakingProgramId,
        }),
      },
      createElement(StakingContractDetailsProvider, null, children),
    );
  return Wrapper;
};

const renderProvider = (
  selectedStakingProgramId: StakingProgramId | null = DEFAULT_STAKING_PROGRAM_ID,
) =>
  renderHook(() => useContext(StakingContractDetailsContext), {
    wrapper: wrapper(selectedStakingProgramId),
  });

// ── Tests ─────────────────────────────────────────────────────────────

describe('StakingContractDetailsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('context default values (outside provider)', () => {
    it('provides defaults when used outside provider', async () => {
      const { result } = renderHook(() =>
        useContext(StakingContractDetailsContext),
      );

      expect(result.current.isSelectedStakingContractDetailsLoading).toBe(
        false,
      );
      expect(result.current.selectedStakingContractDetails).toBeNull();
      expect(result.current.isAllStakingContractDetailsRecordLoaded).toBe(
        false,
      );
      expect(result.current.isPaused).toBe(false);
      expect(result.current.allStakingContractDetailsRecord).toBeUndefined();
      // default setters/refetch are no-ops
      expect(() => result.current.setIsPaused(true)).not.toThrow();
      await expect(
        result.current.refetchSelectedStakingContractDetails(),
      ).resolves.toBeUndefined();
    });
  });

  describe('rendering and children', () => {
    it('renders children', () => {
      setupMocks();
      const { result } = renderProvider();
      // Context is provided — verify a value exists
      expect(result.current).toBeDefined();
      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('isPaused state', () => {
    it('initializes isPaused as false', () => {
      setupMocks();
      const { result } = renderProvider();
      expect(result.current.isPaused).toBe(false);
    });

    it('toggles isPaused via setIsPaused', async () => {
      setupMocks();
      const { result } = renderProvider();

      act(() => {
        result.current.setIsPaused(true);
      });

      await waitFor(() => {
        expect(result.current.isPaused).toBe(true);
      });

      act(() => {
        result.current.setIsPaused(false);
      });

      await waitFor(() => {
        expect(result.current.isPaused).toBe(false);
      });
    });
  });

  describe('selectedStakingContractDetails', () => {
    it('reflects useQuery data when available', () => {
      const details = {
        ...STAKING_CONTRACT_DETAILS,
        ...SERVICE_STAKING_DETAILS,
      };
      setupMocks({
        useQueryReturn: {
          data: details,
          isLoading: false,
          refetch: mockRefetch,
        },
      });
      const { result } = renderProvider();
      expect(result.current.selectedStakingContractDetails).toEqual(details);
    });

    it('is undefined when useQuery returns no data', () => {
      setupMocks({
        useQueryReturn: {
          data: undefined,
          isLoading: false,
          refetch: mockRefetch,
        },
      });
      const { result } = renderProvider();
      expect(result.current.selectedStakingContractDetails).toBeUndefined();
    });
  });

  describe('isSelectedStakingContractDetailsLoading', () => {
    it('returns true when useQuery isLoading is true', () => {
      setupMocks({
        useQueryReturn: {
          data: undefined,
          isLoading: true,
          refetch: mockRefetch,
        },
      });
      const { result } = renderProvider();
      expect(result.current.isSelectedStakingContractDetailsLoading).toBe(true);
    });

    it('returns false when useQuery isLoading is false', () => {
      setupMocks({
        useQueryReturn: {
          data: STAKING_CONTRACT_DETAILS,
          isLoading: false,
          refetch: mockRefetch,
        },
      });
      const { result } = renderProvider();
      expect(result.current.isSelectedStakingContractDetailsLoading).toBe(
        false,
      );
    });
  });

  describe('refetchSelectedStakingContractDetails', () => {
    it('calls useQuery refetch', async () => {
      setupMocks();
      const { result } = renderProvider();

      await act(async () => {
        await result.current.refetchSelectedStakingContractDetails();
      });

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('allStakingContractDetailsRecord', () => {
    it('aggregates successful useQueries results into a record', () => {
      const details1 = makeStakingContractDetails({ apy: 10 });
      const details2 = makeStakingContractDetails({ apy: 20 });

      setupMocks({
        useQueriesReturn: [
          { status: 'success', data: details1, isSuccess: true },
          { status: 'success', data: details2, isSuccess: true },
        ],
      });

      const { result } = renderProvider();
      expect(result.current.allStakingContractDetailsRecord).toEqual({
        [DEFAULT_STAKING_PROGRAM_ID]: details1,
        [SECOND_STAKING_PROGRAM_ID]: details2,
      });
    });

    it('skips entries where useQueries status is error', () => {
      const details1 = makeStakingContractDetails();
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      setupMocks({
        useQueriesReturn: [
          { status: 'success', data: details1, isSuccess: true },
          {
            status: 'error',
            isSuccess: false,
            error: new Error('fetch failed'),
          },
        ],
      });

      const { result } = renderProvider();
      expect(result.current.allStakingContractDetailsRecord).toEqual({
        [DEFAULT_STAKING_PROGRAM_ID]: details1,
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('skips entries where data is null/undefined', () => {
      setupMocks({
        useQueriesReturn: [
          { status: 'success', data: null, isSuccess: true },
          { status: 'success', data: undefined, isSuccess: true },
        ],
      });

      const { result } = renderProvider();
      expect(result.current.allStakingContractDetailsRecord).toEqual({});
    });

    it('returns empty record when no programs exist', () => {
      setupMocks({
        allStakingProgramIds: [],
        useQueriesReturn: [],
      });

      const { result } = renderProvider();
      expect(result.current.allStakingContractDetailsRecord).toEqual({});
    });
  });

  describe('isAllStakingContractDetailsRecordLoaded', () => {
    it('returns true when at least one query succeeds', () => {
      setupMocks({
        useQueriesReturn: [
          {
            status: 'success',
            data: STAKING_CONTRACT_DETAILS,
            isSuccess: true,
          },
          { status: 'loading', isSuccess: false },
        ],
      });

      const { result } = renderProvider();
      expect(result.current.isAllStakingContractDetailsRecordLoaded).toBe(true);
    });

    it('returns false when no queries have succeeded', () => {
      setupMocks({
        useQueriesReturn: [
          { status: 'loading', isSuccess: false },
          { status: 'loading', isSuccess: false },
        ],
      });

      const { result } = renderProvider();
      expect(result.current.isAllStakingContractDetailsRecordLoaded).toBe(
        false,
      );
    });
  });

  describe('useQuery configuration (useStakingContractDetailsByStakingProgram)', () => {
    it('passes correct query key', () => {
      setupMocks();
      renderProvider();

      expect(capturedUseQueryConfig).toBeDefined();
      expect(capturedUseQueryConfig!.queryKey).toEqual([
        'stakingContractDetailsByStakingProgramId',
        EVM_CHAIN_ID,
        DEFAULT_SERVICE_NFT_TOKEN_ID,
        DEFAULT_STAKING_PROGRAM_ID,
      ]);
    });

    it('is disabled when isPaused or stakingProgramId is null', () => {
      setupMocks();
      renderProvider(null);

      expect(capturedUseQueryConfig).toBeDefined();
      expect(capturedUseQueryConfig!.enabled).toBe(false);
    });

    it('is enabled when not paused and stakingProgramId is set', () => {
      setupMocks();
      renderProvider(DEFAULT_STAKING_PROGRAM_ID);

      expect(capturedUseQueryConfig).toBeDefined();
      expect(capturedUseQueryConfig!.enabled).toBe(true);
    });
  });

  describe('useQueries configuration (useAllStakingContractDetails)', () => {
    it('creates one query per staking program id', () => {
      setupMocks();
      renderProvider();

      expect(capturedUseQueriesConfig).toBeDefined();
      expect(capturedUseQueriesConfig!.queries).toHaveLength(
        ALL_PROGRAM_IDS.length,
      );
    });

    it('passes correct query keys for each program', () => {
      setupMocks();
      renderProvider();

      const queries = capturedUseQueriesConfig!.queries;
      expect(queries[0].queryKey).toEqual([
        'allStakingContractDetails',
        EVM_CHAIN_ID,
        DEFAULT_STAKING_PROGRAM_ID,
      ]);
      expect(queries[1].queryKey).toEqual([
        'allStakingContractDetails',
        EVM_CHAIN_ID,
        SECOND_STAKING_PROGRAM_ID,
      ]);
    });
  });

  describe('hook dependencies', () => {
    it('calls useService with the selectedService service_config_id', () => {
      const service = makeService({
        service_config_id: DEFAULT_SERVICE_CONFIG_ID,
      });
      setupMocks({ selectedService: service as Service });
      renderProvider();

      expect(mockUseService).toHaveBeenCalledWith(DEFAULT_SERVICE_CONFIG_ID);
    });

    it('calls useService with undefined when no selected service', () => {
      mockUseServices.mockReturnValue({
        selectedService: undefined,
        selectedAgentConfig: {
          serviceApi: mockServiceApi as unknown as AgentConfig['serviceApi'],
          evmHomeChainId: EVM_CHAIN_ID,
        },
      });
      mockUseService.mockReturnValue({ serviceNftTokenId: undefined });
      mockUseStakingProgram.mockReturnValue({
        allStakingProgramIds: ALL_PROGRAM_IDS,
      });
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseQueries.mockReturnValue(makeDefaultQueriesReturn(ALL_PROGRAM_IDS));

      renderProvider();

      expect(mockUseService).toHaveBeenCalledWith(undefined);
    });
  });

  describe('queryFn execution', () => {
    describe('useQuery (selected program) queryFn', () => {
      it('merges both results when both promises succeed', async () => {
        const contractDetails = makeStakingContractDetails();
        const serviceDetails = makeServiceStakingDetails();
        mockGetStakingContractDetails.mockResolvedValue(contractDetails);
        mockGetServiceStakingDetails.mockResolvedValue(serviceDetails);

        setupMocks({ serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID });
        renderProvider();

        const result = await capturedUseQueryConfig!.queryFn();
        expect(result).toEqual({
          ...contractDetails,
          ...serviceDetails,
        });
      });

      it('returns only service staking details when contract details fail', async () => {
        const serviceDetails = makeServiceStakingDetails();
        mockGetStakingContractDetails.mockRejectedValue(
          new Error('contract fetch failed'),
        );
        mockGetServiceStakingDetails.mockResolvedValue(serviceDetails);

        setupMocks({ serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID });
        renderProvider();

        const result = await capturedUseQueryConfig!.queryFn();
        expect(result).toEqual({ ...serviceDetails });
      });

      it('returns only contract details when service staking fails', async () => {
        const contractDetails = makeStakingContractDetails();
        mockGetStakingContractDetails.mockResolvedValue(contractDetails);
        mockGetServiceStakingDetails.mockRejectedValue(
          new Error('service staking fetch failed'),
        );

        setupMocks({ serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID });
        renderProvider();

        const result = await capturedUseQueryConfig!.queryFn();
        expect(result).toEqual({ ...contractDetails });
      });

      it('skips getServiceStakingDetails when serviceNftTokenId is invalid (-1)', async () => {
        const contractDetails = makeStakingContractDetails();
        mockGetStakingContractDetails.mockResolvedValue(contractDetails);

        setupMocks({ serviceNftTokenId: -1 });
        renderProvider();

        await capturedUseQueryConfig!.queryFn();

        expect(mockGetStakingContractDetails).toHaveBeenCalledTimes(1);
        expect(mockGetServiceStakingDetails).not.toHaveBeenCalled();
      });

      it('calls both API methods when serviceNftTokenId is valid', async () => {
        const contractDetails = makeStakingContractDetails();
        const serviceDetails = makeServiceStakingDetails();
        mockGetStakingContractDetails.mockResolvedValue(contractDetails);
        mockGetServiceStakingDetails.mockResolvedValue(serviceDetails);

        setupMocks({ serviceNftTokenId: DEFAULT_SERVICE_NFT_TOKEN_ID });
        renderProvider();

        await capturedUseQueryConfig!.queryFn();

        expect(mockGetStakingContractDetails).toHaveBeenCalledTimes(1);
        expect(mockGetServiceStakingDetails).toHaveBeenCalledTimes(1);
        expect(mockGetServiceStakingDetails).toHaveBeenCalledWith(
          DEFAULT_SERVICE_NFT_TOKEN_ID,
          DEFAULT_STAKING_PROGRAM_ID,
          EVM_CHAIN_ID,
        );
      });
    });

    describe('useQueries (all programs) queryFn', () => {
      it('calls getStakingContractDetails with correct program and chain', async () => {
        const contractDetails = makeStakingContractDetails();
        mockGetStakingContractDetails.mockResolvedValue(contractDetails);

        setupMocks();
        renderProvider();

        await capturedUseQueriesConfig!.queries[0].queryFn();

        expect(mockGetStakingContractDetails).toHaveBeenCalledWith(
          DEFAULT_STAKING_PROGRAM_ID,
          EVM_CHAIN_ID,
        );
      });

      it('logs error via onError callback', () => {
        const consoleSpy = jest
          .spyOn(console, 'error')
          .mockImplementation(() => {});

        setupMocks();
        renderProvider();

        const onError = capturedUseQueriesConfig!.queries[0].onError;
        expect(onError).toBeDefined();

        const testError = new Error('staking fetch failed');
        onError!(testError);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Error fetching staking details for ${DEFAULT_STAKING_PROGRAM_ID}:`,
          testError,
        );

        consoleSpy.mockRestore();
      });

      it('stops refetching on success', () => {
        setupMocks();
        renderProvider();

        const refetchIntervalFn = capturedUseQueriesConfig!.queries[0]
          .refetchInterval as (query: unknown) => number | false;

        const successResult = refetchIntervalFn({
          state: { status: 'success' },
        });
        expect(successResult).toBe(false);

        const loadingResult = refetchIntervalFn({
          state: { status: 'loading' },
        });
        expect(loadingResult).toBe(THIRTY_SECONDS_INTERVAL);
      });
    });
  });
});
