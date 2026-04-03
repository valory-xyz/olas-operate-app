import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'ethers/lib/utils';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { FIVE_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { useElectronApi, useServices, useStore } from '@/hooks';
import { useAgentStakingRewardsDetails } from '@/hooks/useAgentStakingRewardsDetails';
import { Nullable, StakingRewardsInfo } from '@/types';
import { normalizeStakingRewardsInfo } from '@/utils/stakingRewards';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { StakingProgramContext } from './StakingProgramProvider';

type RewardContextValue = {
  isAvailableRewardsForEpochLoading?: boolean;
  stakingRewardsDetails?: Nullable<StakingRewardsInfo>;
  /** current epoch rewards */
  accruedServiceStakingRewards?: number;
  availableRewardsForEpoch?: bigint | null;
  availableRewardsForEpochEth?: number;
  isEligibleForRewards?: boolean;
  optimisticRewardsEarnedForEpoch?: number;
  minimumStakedAmountRequired?: number;
  updateRewards: () => Promise<void>;
  isStakingRewardsDetailsLoading?: boolean;
};

export const RewardContext = createContext<RewardContextValue>({
  isAvailableRewardsForEpochLoading: false,
  stakingRewardsDetails: null,
  updateRewards: async () => {},
});

/**
 * hook to fetch available rewards for the current epoch
 */
const useAvailableRewardsForEpoch = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const {
    selectedService,
    isFetched: isLoaded,
    selectedAgentConfig,
  } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : null;
  const currentChainId = selectedAgentConfig.evmHomeChainId;
  const hasStakingProgram =
    !!selectedStakingProgramId &&
    !!STAKING_PROGRAMS[currentChainId]?.[selectedStakingProgramId];

  return useQuery({
    queryKey: REACT_QUERY_KEYS.AVAILABLE_REWARDS_FOR_EPOCH_KEY(
      currentChainId,
      serviceConfigId!,
      selectedStakingProgramId!,
    ),
    queryFn: async () => {
      if (!hasStakingProgram) return null;
      return await selectedAgentConfig.serviceApi.getAvailableRewardsForEpoch(
        selectedStakingProgramId!,
        currentChainId,
      );
    },
    enabled: !!isOnline && !!serviceConfigId && hasStakingProgram,
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
  });
};

/**
 * Provider to manage rewards context
 */
export const RewardProvider = ({ children }: PropsWithChildren) => {
  const { storeState } = useStore();
  const electronApi = useElectronApi();
  const { selectedStakingProgramId } = useContext(StakingProgramContext);
  const { selectedAgentConfig, selectedService } = useServices();

  const currentChainId = selectedAgentConfig.evmHomeChainId;

  const {
    data: rawStakingRewardsDetails,
    refetch: refetchStakingRewardsDetails,
    isLoading: isStakingRewardsDetailsLoading,
  } = useAgentStakingRewardsDetails(
    currentChainId,
    selectedStakingProgramId,
    selectedAgentConfig,
  );

  const stakingRewardsDetails: RewardContextValue['stakingRewardsDetails'] =
    useMemo(
      () => normalizeStakingRewardsInfo(rawStakingRewardsDetails),
      [rawStakingRewardsDetails],
    );

  const {
    data: availableRewardsForEpoch,
    isLoading: isAvailableRewardsForEpochLoading,
    refetch: refetchAvailableRewardsForEpoch,
  } = useAvailableRewardsForEpoch();

  const lastLoggedExpiredEligibilityRef = useRef<string | null>(null);

  const isEligibleForRewards = stakingRewardsDetails?.isEligibleForRewards;
  const accruedServiceStakingRewards =
    stakingRewardsDetails?.accruedServiceStakingRewards;

  // available rewards for the current epoch in ETH
  const availableRewardsForEpochEth = useMemo<number | undefined>(() => {
    if (!availableRewardsForEpoch) return;
    return parseFloat(formatUnits(`${availableRewardsForEpoch}`));
  }, [availableRewardsForEpoch]);

  // optimism rewards earned for the current epoch in ETH
  const optimisticRewardsEarnedForEpoch = useMemo<number | undefined>(() => {
    if (!isEligibleForRewards) return;
    if (!availableRewardsForEpochEth) return;
    return availableRewardsForEpochEth;
  }, [availableRewardsForEpochEth, isEligibleForRewards]);

  useEffect(() => {
    if (!rawStakingRewardsDetails?.isEligibleForRewards) {
      lastLoggedExpiredEligibilityRef.current = null;
      return;
    }

    if (stakingRewardsDetails?.isEligibleForRewards !== false) return;

    const serviceConfigId = selectedService?.service_config_id ?? 'unknown';
    const livenessPeriod = rawStakingRewardsDetails.livenessPeriod?._hex;
    const logKey = [
      serviceConfigId,
      rawStakingRewardsDetails.tsCheckpoint,
      livenessPeriod,
      selectedStakingProgramId,
    ].join(':');

    if (lastLoggedExpiredEligibilityRef.current === logKey) return;
    lastLoggedExpiredEligibilityRef.current = logKey;

    electronApi.logEvent?.(
      [
        'rewards:: normalized stale eligibility after epoch expiry',
        `service=${serviceConfigId}`,
        `chainId=${currentChainId}`,
        `stakingProgram=${selectedStakingProgramId ?? 'unknown'}`,
        `tsCheckpoint=${rawStakingRewardsDetails.tsCheckpoint}`,
        `livenessPeriod=${livenessPeriod ?? 'unknown'}`,
        `now=${Math.floor(Date.now() / 1000)}`,
      ].join(' '),
    );
  }, [
    currentChainId,
    electronApi,
    rawStakingRewardsDetails,
    selectedService?.service_config_id,
    selectedStakingProgramId,
    stakingRewardsDetails?.isEligibleForRewards,
  ]);

  // store the first staking reward achieved in the store for notification
  useEffect(() => {
    if (!isEligibleForRewards) return;
    if (storeState?.firstStakingRewardAchieved) return;
    electronApi.store?.set?.('firstStakingRewardAchieved', true);
  }, [
    electronApi.store,
    isEligibleForRewards,
    storeState?.firstStakingRewardAchieved,
  ]);

  // refresh rewards data
  const updateRewards = useCallback(async () => {
    await refetchStakingRewardsDetails();
    await refetchAvailableRewardsForEpoch();
  }, [refetchStakingRewardsDetails, refetchAvailableRewardsForEpoch]);

  return (
    <RewardContext.Provider
      value={{
        // staking rewards details
        isStakingRewardsDetailsLoading,
        accruedServiceStakingRewards,
        stakingRewardsDetails,

        // available rewards for the current epoch
        isAvailableRewardsForEpochLoading,
        availableRewardsForEpoch,
        availableRewardsForEpochEth,
        isEligibleForRewards,
        optimisticRewardsEarnedForEpoch,

        // others
        updateRewards,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
};
