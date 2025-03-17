import { useQuery } from '@tanstack/react-query';
import { isNil } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useOnlineStatusContext } from '@/hooks/useOnlineStatus';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { useStore } from '@/hooks/useStore';
import { StakingRewardsInfoSchema } from '@/types/Autonolas';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';
import { formatEther, formatUnits } from '@/utils/numberFormatters';
import { isValidServiceId } from '@/utils/service';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { StakingProgramContext } from './StakingProgramProvider';

export const RewardContext = createContext<{
  isEligibleRewardsThisEpochLoading?: boolean;
  accruedServiceStakingRewards?: number;
  eligibleRewardsThisEpoch?: number;
  eligibleRewardsThisEpochInEth?: number;
  isEligibleForRewards?: boolean;
  optimisticRewardsEarnedForEpoch?: number;
  minimumStakedAmountRequired?: number;
  updateRewards: () => Promise<void>;
  isStakingRewardsDetailsLoading?: boolean;
}>({
  isEligibleRewardsThisEpochLoading: false,
  updateRewards: async () => {},
});

/**
 * hook to fetch staking rewards details
 */
const useStakingRewardsDetails = () => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const { selectedService, selectedAgentConfig } = useServices();
  const serviceConfigId = selectedService?.service_config_id;
  const currentChainId = selectedAgentConfig.evmHomeChainId;

  // fetch chain data from the selected service
  const chainData = !isNil(selectedService?.chain_configs)
    ? selectedService?.chain_configs?.[asMiddlewareChain(currentChainId)]
        ?.chain_data
    : null;
  const multisig = chainData?.multisig;
  const token = chainData?.token;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.REWARDS_KEY(
      currentChainId,
      serviceConfigId!,
      selectedStakingProgramId!,
      multisig!,
      token!,
    ),
    queryFn: async () => {
      try {
        const response =
          await selectedAgentConfig.serviceApi.getAgentStakingRewardsInfo({
            agentMultisigAddress: multisig!,
            serviceId: token!,
            stakingProgramId: selectedStakingProgramId!,
            chainId: currentChainId,
          });

        if (!response) return null;

        try {
          const parsed = StakingRewardsInfoSchema.parse(response);
          return parsed;
        } catch (e) {
          console.error('Error parsing staking rewards info', e);
        }
      } catch (e) {
        console.error('Error getting staking rewards info', e);
      }

      return null;
    },
    enabled:
      !!isOnline &&
      !!serviceConfigId &&
      !!selectedStakingProgramId &&
      !!multisig &&
      isValidServiceId(token),
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};

/**
 * hook to fetch available rewards for the current epoch
 */
const useEligibleRewardsThisEpoch = () => {
  const { isOnline } = useOnlineStatusContext();
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const {
    selectedService,
    isFetched: isLoaded,
    selectedAgentConfig,
  } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : null;
  const currentChainId = selectedAgentConfig.evmHomeChainId;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.AVAILABLE_REWARDS_FOR_EPOCH_KEY(
      currentChainId,
      serviceConfigId!,
      selectedStakingProgramId!,
    ),
    queryFn: async () => {
      return await selectedAgentConfig.serviceApi.getAvailableRewardsForEpoch(
        selectedStakingProgramId!,
        currentChainId,
      );
    },
    enabled: !!isOnline && !!selectedStakingProgramId && !!serviceConfigId,
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};

/**
 * Provider to manage rewards context
 */
export const RewardProvider = ({ children }: PropsWithChildren) => {
  const { storeState } = useStore();
  const electronApi = useElectronApi();

  const {
    isSelectedStakingContractDetailsLoading,
    selectedStakingContractDetails,
  } = useStakingContractContext();

  const {
    data: stakingRewardsDetails,
    refetch: refetchStakingRewardsDetails,
    isLoading: isStakingRewardsDetailsLoading,
  } = useStakingRewardsDetails();

  const {
    data: eligibleRewardsThisEpoch,
    isLoading: isEligibleRewardsThisEpochLoading,
    refetch: refetchEligibleRewardsThisEpoch,
  } = useEligibleRewardsThisEpoch();

  const isEligibleForRewards = stakingRewardsDetails?.isEligibleForRewards;
  const accruedServiceStakingRewards =
    stakingRewardsDetails?.accruedServiceStakingRewards;

  const rewardsPerSecond = stakingRewardsDetails?.rewardsPerSecond;
  const serviceStakingStartTime =
    selectedStakingContractDetails?.serviceStakingStartTime;

  // available rewards for the epoch
  const eligibleRewardsThisEpochInEth = useMemo<number | undefined>(() => {
    if (!rewardsPerSecond) return;

    // wait for the staking details to load
    if (isStakingRewardsDetailsLoading) return;
    if (isSelectedStakingContractDetailsLoading) return;
    if (isEligibleRewardsThisEpochLoading) return;

    // if agent is not staked, return the available rewards for the epoch
    // i.e, agent has not yet started staking
    if (isNil(serviceStakingStartTime) || serviceStakingStartTime === 0) {
      return parseFloat(formatUnits(`${eligibleRewardsThisEpoch}`));
    }

    // calculate the next checkpoint timestamp
    // i.e, next = last + checkpoint period
    const nextCheckpointTimestamp =
      stakingRewardsDetails.lastCheckpointTimestamp +
      stakingRewardsDetails.livenessPeriod;

    // default to the last checkpoint timestamp
    // ie, if agent has not staked yet, use the last checkpoint timestamp
    const rewardCountingStartTime = Math.max(
      stakingRewardsDetails.lastCheckpointTimestamp,
      serviceStakingStartTime || 0,
    );

    // calculate the time service staked in the current epoch
    const stakingDurationInCurrentEpoch =
      nextCheckpointTimestamp - rewardCountingStartTime;

    const rewardsInCurrentEpoch =
      parseFloat(formatEther(`${rewardsPerSecond}`)) *
      stakingDurationInCurrentEpoch;

    return parseFloat(`${rewardsInCurrentEpoch}`);
  }, [
    isSelectedStakingContractDetailsLoading,
    isStakingRewardsDetailsLoading,
    isEligibleRewardsThisEpochLoading,
    stakingRewardsDetails,
    rewardsPerSecond,
    serviceStakingStartTime,
    eligibleRewardsThisEpoch,
  ]);

  // optimistic rewards earned for the current epoch in ETH
  const optimisticRewardsEarnedForEpoch = useMemo<number | undefined>(() => {
    if (!isEligibleForRewards) return;
    if (!eligibleRewardsThisEpochInEth) return;
    return eligibleRewardsThisEpochInEth;
  }, [eligibleRewardsThisEpochInEth, isEligibleForRewards]);

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
    await refetchEligibleRewardsThisEpoch();
  }, [refetchStakingRewardsDetails, refetchEligibleRewardsThisEpoch]);

  return (
    <RewardContext.Provider
      value={{
        // staking rewards details
        isStakingRewardsDetailsLoading,
        accruedServiceStakingRewards,

        // available rewards for the current epoch
        isEligibleRewardsThisEpochLoading,
        eligibleRewardsThisEpoch,
        eligibleRewardsThisEpochInEth,
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
