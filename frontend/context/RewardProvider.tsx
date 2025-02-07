import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
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
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { useStore } from '@/hooks/useStore';
import { StakingRewardsInfoSchema } from '@/types/Autonolas';
import { asMiddlewareChain } from '@/utils/middlewareHelpers';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { StakingProgramContext } from './StakingProgramProvider';

export const RewardContext = createContext<{
  isAvailableRewardsForEpochLoading?: boolean;
  accruedServiceStakingRewards?: number;
  availableRewardsForEpoch?: number;
  availableRewardsForEpochEth?: number;
  isEligibleForRewards?: boolean;
  optimisticRewardsEarnedForEpoch?: number;
  minimumStakedAmountRequired?: number;
  updateRewards: () => Promise<void>;
  isStakingRewardsDetailsLoading?: boolean;
}>({
  isAvailableRewardsForEpochLoading: false,
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
      !!token,
    refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    refetchOnWindowFocus: false,
  });
};

/**
 * hook to fetch available rewards for the current epoch
 */
const useAvailableRewardsForEpoch = () => {
  const { isOnline } = useOnlineStatusContext();
  const { selectedStakingProgramId } = useContext(StakingProgramContext);

  const {
    selectedService,
    isFetched: isLoaded,
    selectedAgentConfig,
  } = useServices();
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : '';
  const currentChainId = selectedAgentConfig.evmHomeChainId;

  return useQuery({
    queryKey: REACT_QUERY_KEYS.AVAILABLE_REWARDS_FOR_EPOCH_KEY(
      currentChainId,
      serviceConfigId,
      selectedStakingProgramId!,
      currentChainId,
    ),
    queryFn: async () => {
      return await selectedAgentConfig.serviceApi.getAvailableRewardsForEpoch(
        selectedStakingProgramId!,
        currentChainId,
      );
    },
    enabled: !!isOnline && !!selectedStakingProgramId,
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
    data: stakingRewardsDetails,
    refetch: refetchStakingRewardsDetails,
    isLoading: isStakingRewardsDetailsLoading,
  } = useStakingRewardsDetails();

  const { selectedService } = useServices();
  const { isLoaded: isServiceLoaded, isServiceRunning } = useService(
    selectedService?.service_config_id,
  );

  const {
    isSelectedStakingContractDetailsLoading,
    selectedStakingContractDetails,
  } = useStakingContractContext();

  const {
    data: availableRewardsForEpoch,
    isLoading: isAvailableRewardsForEpochLoading,
    refetch: refetchAvailableRewardsForEpoch,
  } = useAvailableRewardsForEpoch();

  const isEligibleForRewards = stakingRewardsDetails?.isEligibleForRewards;
  const accruedServiceStakingRewards =
    stakingRewardsDetails?.accruedServiceStakingRewards;

  const rewardsPerSecond = stakingRewardsDetails?.rewardsPerSecondInNumber;
  // const rewardsPerSecondInBg = (
  //   BigNumber.isBigNumber(rewardsPerSecond) ? rewardsPerSecond.toNumber() : 0
  // ) as number;
  console.log(rewardsPerSecond);

  // console.log('stakingRewardsDetails', stakingRewardsDetails);
  // console.log('selectedStakingContractDetails', selectedStakingContractDetails);
  // available rewards for the current epoch in ETH

  const availableRewardsForEpochEth = useMemo<number | undefined>(() => {
    if (!isEligibleForRewards) return;
    if (!availableRewardsForEpochEth) return;
    if (!isSelectedStakingContractDetailsLoading) return;

    // wait for service to load
    if (!isServiceLoaded) return;

    // if agent is not running, return available rewards for the current epoch
    if (!isServiceRunning)
      return parseFloat(formatUnits(`${availableRewardsForEpoch}`));

    // calculate the time agent staked in the current epoch
    const timeWhenAgentStakedInCurrentEpoch = 1;

    // const rewardsPerSecondInBg = BigNumber.isBigNumber(rewardsPerSecond)
    //   ? rewardsPerSecond
    //   : ethers.BigNumber.from(0);
    // console.log(rewardsPerSecondInBg);
    // // rewardsPerSecondInBg.mul(timeWhenAgentStakedInCurrentEpoch).toS;
    // // multiply rewards per second with the time agent staked in the current epoch
    // const currentEpochRewards = 0;

    // if agent is running, calculate rewards earned for the current epoch
    const currentEpochRewards = ethers.BigNumber.from(
      stakingRewardsDetails.rewardsPerSecondInNumber,
    ).mul(timeWhenAgentStakedInCurrentEpoch);

    return ethers.utils.formatEther(currentEpochRewards);
  }, [
    isEligibleForRewards,
    isSelectedStakingContractDetailsLoading,
    isServiceLoaded,
    isServiceRunning,
    stakingRewardsDetails,
  ]);

  const optimisticRewardsEarnedForEpoch = useMemo<number | undefined>(() => {
    if (!isEligibleForRewards) return;
    if (!availableRewardsForEpochEth) return;
    return availableRewardsForEpochEth;
  }, [availableRewardsForEpochEth, isEligibleForRewards]);

  // console.log({ stakingRewardsDetails });

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
