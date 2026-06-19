import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'ethers/lib/utils';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { FIVE_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { useElectronApi, useServices, useStore } from '@/hooks';
import { useAgentStakingRewardsDetails } from '@/hooks/useAgentStakingRewardsDetails';
import { useDynamicRefetchInterval } from '@/hooks/useDynamicRefetchInterval';
import { Nullable, StakingRewardsInfo } from '@/types';
import {
  deriveIsEpochTargetMet,
  getStakingProgramActivityTarget,
} from '@/utils/stakingRewards';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { StakingProgramContext } from './StakingProgramProvider';

export const RewardContext = createContext<{
  isAvailableRewardsForEpochLoading?: boolean;
  stakingRewardsDetails?: Nullable<StakingRewardsInfo>;
  /** current epoch rewards */
  accruedServiceStakingRewards?: number;
  availableRewardsForEpoch?: bigint | null;
  availableRewardsForEpochEth?: number;
  /** raw on-chain staking KPI (rewards unlocked) — ~1 request on new contracts */
  isEligibleForRewards?: boolean;
  /**
   * Regime-aware "agent has done its epoch work" signal — the cue the reward UI
   * (banner, streak flame, sidebar dot, notification) and auto-run rotation use.
   * Decoupled regime: on-chain activity >= off-chain target; legacy: == isEligibleForRewards.
   */
  isEpochTargetMet?: boolean;
  optimisticRewardsEarnedForEpoch?: number;
  minimumStakedAmountRequired?: number;
  updateRewards: () => Promise<void>;
  isStakingRewardsDetailsLoading?: boolean;
}>({
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

  const refetchInterval = useDynamicRefetchInterval(FIVE_SECONDS_INTERVAL);

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
    refetchInterval: isOnline ? refetchInterval : false,
    refetchIntervalInBackground: true,
  });
};

/**
 * Provider to manage rewards context
 */
export const RewardProvider = ({ children }: PropsWithChildren) => {
  const { storeState } = useStore();
  const electronApi = useElectronApi();
  const { selectedStakingProgramId } = useContext(StakingProgramContext);
  const { selectedAgentConfig } = useServices();

  const currentChainId = selectedAgentConfig.evmHomeChainId;

  const {
    data: stakingRewardsDetails,
    refetch: refetchStakingRewardsDetails,
    isLoading: isStakingRewardsDetailsLoading,
  } = useAgentStakingRewardsDetails(
    currentChainId,
    selectedStakingProgramId,
    selectedAgentConfig,
  );

  const {
    data: availableRewardsForEpoch,
    isLoading: isAvailableRewardsForEpochLoading,
    refetch: refetchAvailableRewardsForEpoch,
  } = useAvailableRewardsForEpoch();

  const isEligibleForRewards = stakingRewardsDetails?.isEligibleForRewards;
  const accruedServiceStakingRewards =
    stakingRewardsDetails?.accruedServiceStakingRewards;

  // "Epoch work done" — regime-aware. Decoupled programs compare the on-chain
  // activity count against the off-chain target; legacy programs fall back to
  // the on-chain staking KPI (so behaviour is unchanged for them).
  const isEpochTargetMet = useMemo<boolean | undefined>(() => {
    if (!stakingRewardsDetails) return undefined;
    const activityTarget = getStakingProgramActivityTarget(
      currentChainId,
      selectedStakingProgramId,
    );
    return deriveIsEpochTargetMet(stakingRewardsDetails, activityTarget);
  }, [stakingRewardsDetails, currentChainId, selectedStakingProgramId]);

  // available rewards for the current epoch in ETH
  const availableRewardsForEpochEth = useMemo<number | undefined>(() => {
    if (!availableRewardsForEpoch) return;
    return parseFloat(formatUnits(`${availableRewardsForEpoch}`));
  }, [availableRewardsForEpoch]);

  // optimistic rewards earned for the current epoch in ETH — shown once the
  // agent has done its epoch work (target met), not merely when staking unlocks.
  const optimisticRewardsEarnedForEpoch = useMemo<number | undefined>(() => {
    if (!isEpochTargetMet) return;
    if (!availableRewardsForEpochEth) return;
    return availableRewardsForEpochEth;
  }, [availableRewardsForEpochEth, isEpochTargetMet]);

  // store the first staking reward achieved in the store for notification
  useEffect(() => {
    if (!isEpochTargetMet) return;
    if (storeState?.firstStakingRewardAchieved) return;
    electronApi.store?.set?.('firstStakingRewardAchieved', true);
  }, [
    electronApi.store,
    isEpochTargetMet,
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
        isEpochTargetMet,
        optimisticRewardsEarnedForEpoch,

        // others
        updateRewards,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
};
