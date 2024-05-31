import { useContext } from 'react';

import { RewardContext } from '@/context/RewardProvider';

export const useReward = () => {
  const {
    availableRewardsForEpoch,
    availableRewardsForEpochEth,
    isEligibleForRewards,
    minimumStakedAmountRequired,
    accruedServiceStakingRewards,
  } = useContext(RewardContext);

  return {
    availableRewardsForEpoch,
    availableRewardsForEpochEth,
    isEligibleForRewards,
    minimumStakedAmountRequired,
    accruedServiceStakingRewards,
  };
};
