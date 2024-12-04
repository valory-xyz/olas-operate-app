import { useContext } from 'react';

import { RewardContext } from '@/context/RewardProvider';

export const useReward = () => {
  const {
    availableRewardsForEpoch,
    availableRewardsForEpochEth,
    isEligibleForRewards,
    accruedServiceStakingRewards,
    isStakingRewardsDetailsFetched,
  } = useContext(RewardContext);

  return {
    availableRewardsForEpoch,
    availableRewardsForEpochEth,
    isEligibleForRewards,
    accruedServiceStakingRewards,
    isStakingRewardsDetailsFetched,
  };
};
