import { renderHook, waitFor } from '@testing-library/react';
import { formatUnits } from 'ethers/lib/utils';
import { act, PropsWithChildren, useContext } from 'react';

import { EvmChainIdMap } from '../../constants/chains';
import {
  STAKING_PROGRAM_IDS,
  StakingProgramId,
} from '../../constants/stakingProgram';
import { OnlineStatusContext } from '../../context/OnlineStatusProvider';
import { RewardContext, RewardProvider } from '../../context/RewardProvider';
import { StakingProgramContext } from '../../context/StakingProgramProvider';
import { AgentConfig } from '../../types/Agent';
import { StakingRewardsInfo } from '../../types/Autonolas';
import { createStakingProgramContextValue } from '../helpers/contextDefaults';
import {
  DEFAULT_SERVICE_CONFIG_ID,
  DEFAULT_STAKING_PROGRAM_ID,
  makeStakingRewardsInfo,
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
jest.mock('../../hooks/useDynamicRefetchInterval', () => ({
  useDynamicRefetchInterval: jest.fn((interval: number) => interval),
}));

// ── Hook & query mocks ───────────────────────────────────────────────

const mockRefetchStakingRewardsDetails = jest.fn().mockResolvedValue({});
const mockRefetchAvailableRewardsForEpoch = jest.fn().mockResolvedValue({});

const mockUseAgentStakingRewardsDetails = jest.fn<
  {
    data: StakingRewardsInfo | undefined;
    refetch: jest.Mock;
    isLoading: boolean;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any[]
>();

jest.mock('../../hooks/useAgentStakingRewardsDetails', () => ({
  useAgentStakingRewardsDetails: (
    ...args: Parameters<typeof mockUseAgentStakingRewardsDetails>
  ) => mockUseAgentStakingRewardsDetails(...args),
}));

const mockUseQueryReturn = jest.fn<
  {
    data: bigint | null | undefined;
    isLoading: boolean;
    refetch: jest.Mock;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any[]
>();

let capturedAvailableRewardsQueryConfig:
  | {
      queryKey: readonly unknown[];
      queryFn: () => Promise<unknown>;
      enabled?: boolean;
      refetchInterval?: number | false;
      refetchIntervalInBackground?: boolean;
    }
  | undefined;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (config: Record<string, unknown>) => {
    capturedAvailableRewardsQueryConfig =
      config as typeof capturedAvailableRewardsQueryConfig;
    return mockUseQueryReturn(config);
  },
}));

const mockStoreSet = jest.fn();

const mockUseElectronApi = jest.fn(() => ({
  store: { set: mockStoreSet },
}));

const mockUseServices = jest.fn<
  {
    selectedService: { service_config_id: string } | undefined;
    isFetched: boolean;
    selectedAgentConfig: Partial<AgentConfig>;
  },
  []
>();

const mockUseStore = jest.fn<
  { storeState: { firstStakingRewardAchieved?: boolean } | undefined },
  []
>();

jest.mock('../../hooks', () => ({
  useElectronApi: () => mockUseElectronApi(),
  useServices: () => mockUseServices(),
  useStore: () => mockUseStore(),
}));

jest.mock('../../config/stakingPrograms', () => ({
  STAKING_PROGRAMS: {
    [EvmChainIdMap.Gnosis]: {
      [STAKING_PROGRAM_IDS.PearlBetaMechMarketplace3]: { name: 'test' },
    },
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const CHAIN_ID = EvmChainIdMap.Gnosis;

const defaultAgentConfig: Partial<AgentConfig> = {
  evmHomeChainId: CHAIN_ID,
  serviceApi: {
    getAvailableRewardsForEpoch: jest.fn().mockResolvedValue(BigInt(1e18)),
  } as unknown as AgentConfig['serviceApi'],
};

type SetupMocksOptions = {
  stakingRewardsDetails?: StakingRewardsInfo | undefined;
  isStakingRewardsDetailsLoading?: boolean;
  availableRewardsForEpoch?: bigint | null | undefined;
  isAvailableRewardsForEpochLoading?: boolean;
  storeState?: { firstStakingRewardAchieved?: boolean } | undefined;
  selectedService?: { service_config_id: string } | undefined;
  isFetched?: boolean;
};

const setupMocks = (opts: SetupMocksOptions = {}) => {
  capturedAvailableRewardsQueryConfig = undefined;
  const stakingRewardsDetails =
    'stakingRewardsDetails' in opts
      ? opts.stakingRewardsDetails
      : (makeStakingRewardsInfo() as StakingRewardsInfo);
  const availableRewardsForEpoch =
    'availableRewardsForEpoch' in opts
      ? opts.availableRewardsForEpoch
      : BigInt(1e18);

  mockUseAgentStakingRewardsDetails.mockReturnValue({
    data: stakingRewardsDetails,
    refetch: mockRefetchStakingRewardsDetails,
    isLoading: opts.isStakingRewardsDetailsLoading ?? false,
  });
  mockUseQueryReturn.mockReturnValue({
    data: availableRewardsForEpoch,
    isLoading: opts.isAvailableRewardsForEpochLoading ?? false,
    refetch: mockRefetchAvailableRewardsForEpoch,
  });
  mockUseStore.mockReturnValue({
    storeState: opts.storeState,
  });
  mockUseServices.mockReturnValue({
    selectedService:
      'selectedService' in opts
        ? opts.selectedService
        : { service_config_id: DEFAULT_SERVICE_CONFIG_ID },
    isFetched: opts.isFetched ?? true,
    selectedAgentConfig: defaultAgentConfig,
  });
};

const Wrapper = ({ children }: PropsWithChildren) => (
  <OnlineStatusContext.Provider value={{ isOnline: true }}>
    <StakingProgramContext.Provider
      value={createStakingProgramContextValue({
        selectedStakingProgramId:
          DEFAULT_STAKING_PROGRAM_ID as StakingProgramId,
      })}
    >
      <RewardProvider>{children}</RewardProvider>
    </StakingProgramContext.Provider>
  </OnlineStatusContext.Provider>
);

const renderRewardContext = () =>
  renderHook(() => useContext(RewardContext), { wrapper: Wrapper });

// ── Tests ─────────────────────────────────────────────────────────────

describe('RewardProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stakingRewardsDetails passthrough', () => {
    it('exposes stakingRewardsDetails from useAgentStakingRewardsDetails', () => {
      const details = makeStakingRewardsInfo({
        accruedServiceStakingRewards: 7,
      });
      setupMocks({ stakingRewardsDetails: details as StakingRewardsInfo });
      const { result } = renderRewardContext();
      expect(result.current.stakingRewardsDetails).toBe(details);
    });

    it('exposes undefined when no staking rewards details', () => {
      setupMocks({
        stakingRewardsDetails: undefined,
        availableRewardsForEpoch: null,
      });
      const { result } = renderRewardContext();
      expect(result.current.stakingRewardsDetails).toBeUndefined();
    });
  });

  describe('isEligibleForRewards', () => {
    it('is true when stakingRewardsDetails.isEligibleForRewards is true', () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: true,
        }) as StakingRewardsInfo,
      });
      const { result } = renderRewardContext();
      expect(result.current.isEligibleForRewards).toBe(true);
    });

    it('is false when stakingRewardsDetails.isEligibleForRewards is false', () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: false,
        }) as StakingRewardsInfo,
      });
      const { result } = renderRewardContext();
      expect(result.current.isEligibleForRewards).toBe(false);
    });

    it('is undefined when stakingRewardsDetails is undefined', () => {
      setupMocks({
        stakingRewardsDetails: undefined,
        availableRewardsForEpoch: null,
      });
      const { result } = renderRewardContext();
      expect(result.current.isEligibleForRewards).toBeUndefined();
    });
  });

  describe('accruedServiceStakingRewards', () => {
    it('extracts accruedServiceStakingRewards from stakingRewardsDetails', () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          accruedServiceStakingRewards: 3.14,
        }) as StakingRewardsInfo,
      });
      const { result } = renderRewardContext();
      expect(result.current.accruedServiceStakingRewards).toBe(3.14);
    });
  });

  describe('availableRewardsForEpochEth', () => {
    it('converts availableRewardsForEpoch to ETH via formatUnits', () => {
      const bigValue = BigInt('2000000000000000000'); // 2 ether
      setupMocks({ availableRewardsForEpoch: bigValue });
      const { result } = renderRewardContext();
      const expected = parseFloat(formatUnits(`${bigValue}`));
      expect(result.current.availableRewardsForEpochEth).toBe(expected);
      expect(result.current.availableRewardsForEpochEth).toBe(2.0);
    });

    it('is undefined when availableRewardsForEpoch is BigInt(0) (falsy)', () => {
      setupMocks({ availableRewardsForEpoch: BigInt(0) });
      const { result } = renderRewardContext();
      // BigInt(0) is falsy, so the guard `if (!availableRewardsForEpoch)` returns early
      expect(result.current.availableRewardsForEpochEth).toBeUndefined();
    });

    it('is undefined when availableRewardsForEpoch is null', () => {
      setupMocks({ availableRewardsForEpoch: null });
      const { result } = renderRewardContext();
      expect(result.current.availableRewardsForEpochEth).toBeUndefined();
    });

    it('is undefined when availableRewardsForEpoch is undefined', () => {
      setupMocks({ availableRewardsForEpoch: undefined });
      const { result } = renderRewardContext();
      expect(result.current.availableRewardsForEpochEth).toBeUndefined();
    });
  });

  describe('optimisticRewardsEarnedForEpoch', () => {
    it('equals availableRewardsForEpochEth when eligible and has rewards', () => {
      const bigValue = BigInt('3000000000000000000'); // 3 ether
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: true,
        }) as StakingRewardsInfo,
        availableRewardsForEpoch: bigValue,
      });
      const { result } = renderRewardContext();
      expect(result.current.optimisticRewardsEarnedForEpoch).toBe(3.0);
    });

    it('is undefined when not eligible for rewards', () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: false,
        }) as StakingRewardsInfo,
        availableRewardsForEpoch: BigInt('1000000000000000000'),
      });
      const { result } = renderRewardContext();
      expect(result.current.optimisticRewardsEarnedForEpoch).toBeUndefined();
    });

    it('is undefined when availableRewardsForEpoch is null', () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: true,
        }) as StakingRewardsInfo,
        availableRewardsForEpoch: null,
      });
      const { result } = renderRewardContext();
      expect(result.current.optimisticRewardsEarnedForEpoch).toBeUndefined();
    });
  });

  // Note: firstStakingRewardAchieved is still written to store in the source
  // (previously used for confetti UI). Tests cover the store persistence logic.
  describe('firstStakingRewardAchieved store persistence', () => {
    it('writes firstStakingRewardAchieved to store on first eligibility', async () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: true,
        }) as StakingRewardsInfo,
        storeState: { firstStakingRewardAchieved: undefined },
      });
      renderRewardContext();
      await waitFor(() => {
        expect(mockStoreSet).toHaveBeenCalledWith(
          'firstStakingRewardAchieved',
          true,
        );
      });
    });

    it('does not write to store when already achieved', () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: true,
        }) as StakingRewardsInfo,
        storeState: { firstStakingRewardAchieved: true },
      });
      renderRewardContext();
      expect(mockStoreSet).not.toHaveBeenCalled();
    });

    it('does not write to store when not eligible', () => {
      setupMocks({
        stakingRewardsDetails: makeStakingRewardsInfo({
          isEligibleForRewards: false,
        }) as StakingRewardsInfo,
        storeState: { firstStakingRewardAchieved: undefined },
      });
      renderRewardContext();
      expect(mockStoreSet).not.toHaveBeenCalled();
    });
  });

  describe('updateRewards', () => {
    it('calls both refetch functions', async () => {
      setupMocks();
      const { result } = renderRewardContext();
      await act(async () => {
        await result.current.updateRewards();
      });
      expect(mockRefetchStakingRewardsDetails).toHaveBeenCalledTimes(1);
      expect(mockRefetchAvailableRewardsForEpoch).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state passthroughs', () => {
    it('exposes isStakingRewardsDetailsLoading', () => {
      setupMocks({ isStakingRewardsDetailsLoading: true });
      const { result } = renderRewardContext();
      expect(result.current.isStakingRewardsDetailsLoading).toBe(true);
    });

    it('exposes isAvailableRewardsForEpochLoading', () => {
      setupMocks({ isAvailableRewardsForEpochLoading: true });
      const { result } = renderRewardContext();
      expect(result.current.isAvailableRewardsForEpochLoading).toBe(true);
    });

    it('both loading flags are false when not loading', () => {
      setupMocks({
        isStakingRewardsDetailsLoading: false,
        isAvailableRewardsForEpochLoading: false,
      });
      const { result } = renderRewardContext();
      expect(result.current.isStakingRewardsDetailsLoading).toBe(false);
      expect(result.current.isAvailableRewardsForEpochLoading).toBe(false);
    });
  });

  describe('context default values', () => {
    it('provides defaults when used outside provider', () => {
      const { result } = renderHook(() => useContext(RewardContext));
      expect(result.current.isAvailableRewardsForEpochLoading).toBe(false);
      expect(result.current.stakingRewardsDetails).toBeNull();
      expect(result.current.updateRewards).toBeInstanceOf(Function);
    });
  });

  describe('useAvailableRewardsForEpoch — polling config', () => {
    it('refetchIntervalInBackground is true', () => {
      setupMocks();
      renderRewardContext();
      expect(
        capturedAvailableRewardsQueryConfig!.refetchIntervalInBackground,
      ).toBe(true);
    });

    it('uses dynamic refetch interval — sentinel 9999', () => {
      const { useDynamicRefetchInterval } = jest.requireMock(
        '../../hooks/useDynamicRefetchInterval',
      ) as { useDynamicRefetchInterval: jest.Mock };
      useDynamicRefetchInterval.mockReturnValue(9999);

      setupMocks();
      renderRewardContext();

      expect(capturedAvailableRewardsQueryConfig!.refetchInterval).toBe(9999);

      useDynamicRefetchInterval.mockImplementation((interval: number) => interval);
    });
  });

  describe('useAvailableRewardsForEpoch queryFn', () => {
    it('returns null when hasStakingProgram is false', async () => {
      setupMocks();
      const WrapperWithNonexistentProgram = ({
        children,
      }: PropsWithChildren) => (
        <OnlineStatusContext.Provider value={{ isOnline: true }}>
          <StakingProgramContext.Provider
            value={createStakingProgramContextValue({
              selectedStakingProgramId:
                'nonexistent_program' as StakingProgramId,
            })}
          >
            <RewardProvider>{children}</RewardProvider>
          </StakingProgramContext.Provider>
        </OnlineStatusContext.Provider>
      );
      renderHook(() => useContext(RewardContext), {
        wrapper: WrapperWithNonexistentProgram,
      });
      const result = await capturedAvailableRewardsQueryConfig!.queryFn();
      expect(result).toBeNull();
    });

    it('calls serviceApi.getAvailableRewardsForEpoch when hasStakingProgram is true', async () => {
      setupMocks();
      renderRewardContext();
      await capturedAvailableRewardsQueryConfig!.queryFn();
      expect(
        defaultAgentConfig.serviceApi!.getAvailableRewardsForEpoch,
      ).toHaveBeenCalledWith(DEFAULT_STAKING_PROGRAM_ID, CHAIN_ID);
    });

    it('enabled is false when offline', () => {
      setupMocks();
      const OfflineWrapper = ({ children }: PropsWithChildren) => (
        <OnlineStatusContext.Provider value={{ isOnline: false }}>
          <StakingProgramContext.Provider
            value={createStakingProgramContextValue({
              selectedStakingProgramId:
                DEFAULT_STAKING_PROGRAM_ID as StakingProgramId,
            })}
          >
            <RewardProvider>{children}</RewardProvider>
          </StakingProgramContext.Provider>
        </OnlineStatusContext.Provider>
      );
      renderHook(() => useContext(RewardContext), {
        wrapper: OfflineWrapper,
      });
      expect(capturedAvailableRewardsQueryConfig!.enabled).toBe(false);
    });

    it('enabled is false when no serviceConfigId', () => {
      setupMocks({ selectedService: undefined, isFetched: true });
      renderRewardContext();
      expect(capturedAvailableRewardsQueryConfig!.enabled).toBe(false);
    });

    it('enabled is true when online, has serviceConfigId, and has staking program', () => {
      setupMocks();
      renderRewardContext();
      expect(capturedAvailableRewardsQueryConfig!.enabled).toBe(true);
    });
  });
});
