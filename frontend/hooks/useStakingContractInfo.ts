import { useContext } from 'react';

import { StakingContractInfoProviderContext } from '@/context/StakingContractInfoProvider';

export const useStakingContractInfo = () => {
  const {
    canStartAgent,
    hasEnoughServiceSlots,
    isAgentEvicted,
    isRewardsAvailable,
    isStakingContractInfoLoading,
  } = useContext(StakingContractInfoProviderContext);

  return {
    canStartAgent,
    hasEnoughServiceSlots,
    isAgentEvicted,
    isRewardsAvailable,
    isStakingContractInfoLoading,
  };
};
