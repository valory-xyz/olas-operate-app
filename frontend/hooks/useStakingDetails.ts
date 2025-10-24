import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { ONE_DAY_IN_S } from '@/utils/time';

import { useBalanceContext } from './useBalanceContext';
import { useRewardContext } from './useRewardContext';
import {
  useCurrentContractCheckpoints,
  useRewardsHistory,
} from './useRewardsHistory';
import { useServices } from './useServices';
import { useStakingContracts } from './useStakingContracts';

export const useStakingDetails = () => {
  const { selectedAgentConfig } = useServices();
  const { currentStakingProgramAddress } = useStakingContracts();
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const { isEligibleForRewards } = useRewardContext();
  const {
    latestRewardStreak: streak,
    isLoading: isRewardsHistoryLoading,
    isError,
  } = useRewardsHistory();
  const { data: currentContractCheckpoints } = useCurrentContractCheckpoints(
    selectedAgentConfig.evmHomeChainId,
    currentStakingProgramAddress?.toLowerCase() ?? '',
  );

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = isEligibleForRewards ? streak + 1 : streak;

  // Calculate the time remaining in the current epoch
  const currentEpochLifetime = useMemo(() => {
    if (!currentContractCheckpoints || isEmpty(currentContractCheckpoints))
      return;

    const currentEpoch = currentContractCheckpoints[0];
    return (Number(currentEpoch.blockTimestamp) + ONE_DAY_IN_S) * 1000;
  }, [currentContractCheckpoints]);

  // If rewards history is loading for the first time
  // or balances are not fetched yet - show loading state
  const isStreakLoading = isBalanceLoading || isRewardsHistoryLoading;

  return {
    isStreakLoading,
    isStreakError: isError,
    optimisticStreak,
    currentEpochLifetime,
  };
};
