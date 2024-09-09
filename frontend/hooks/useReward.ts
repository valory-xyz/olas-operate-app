import { useContext } from 'react';

import { RewardContext } from '@/context/RewardProvider';

export const useReward = () => {
  const {
    accruedServiceStakingRewards,
    availableRewardsForEpoch,
    availableRewardsForEpochEth,
    isEligibleForRewards,
    isRewardsLoaded,
  } = useContext(RewardContext);

  return {
    accruedServiceStakingRewards,
    availableRewardsForEpoch,
    availableRewardsForEpochEth,
    isEligibleForRewards,
    isRewardsLoaded,
  };
};
