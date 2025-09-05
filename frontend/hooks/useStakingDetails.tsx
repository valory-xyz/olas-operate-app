import { isEmpty } from 'lodash';
import { useMemo } from 'react';

import { useServiceDeployment } from '@/components/MainPageV1/Home/Overview/AgentInfo/AgentRunButton/hooks/useServiceDeployment';
import { COLOR } from '@/constants/colors';
import { ONE_DAY_IN_S } from '@/utils/time';

import { useBalanceContext } from './useBalanceContext';
import { useRewardContext } from './useRewardContext';
import { useRewardsHistory } from './useRewardsHistory';
import { useActiveStakingContractDetails } from './useStakingContractDetails';

export const useStakingDetails = () => {
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const { isAgentEvicted } = useActiveStakingContractDetails();
  const { isDeployable } = useServiceDeployment();
  const { isEligibleForRewards } = useRewardContext();
  const {
    latestRewardStreak: streak,
    isLoading: isRewardsHistoryLoading,
    isError,
    contractCheckpoints,
    recentStakingContractAddress,
  } = useRewardsHistory();

  // Graph does not account for the current day,
  // so we need to add 1 to the streak, if the user is eligible for rewards
  const optimisticStreak = isEligibleForRewards ? streak + 1 : streak;

  // Calculate the time remaining in the current epoch
  const currentEpochLifetime = useMemo(() => {
    if (!contractCheckpoints || isEmpty(contractCheckpoints)) return;
    if (!recentStakingContractAddress) return;

    const checkpoints = contractCheckpoints[recentStakingContractAddress];
    if (checkpoints.length === 0) return;

    const currentEpoch = checkpoints[0];
    return (currentEpoch.epochEndTimeStamp + ONE_DAY_IN_S) * 1000;
  }, [contractCheckpoints, recentStakingContractAddress]);

  // Determine fire color based on hours left in the epoch
  const fireColor = useMemo(() => {
    if (!currentEpochLifetime || isAgentEvicted || !isDeployable) return;
    if (isEligibleForRewards) return COLOR.PURPLE;

    const hoursLeft = (currentEpochLifetime - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft > 12) return COLOR.TEXT_NEUTRAL_TERTIARY;
    if (hoursLeft > 3) return COLOR.WARNING;
    return COLOR.RED;
  }, [
    isEligibleForRewards,
    isDeployable,
    isAgentEvicted,
    currentEpochLifetime,
  ]);

  // If rewards history is loading for the first time
  // or balances are not fetched yet - show loading state
  const isStreakLoading = isBalanceLoading || isRewardsHistoryLoading;

  return {
    isStreakLoading,
    isStreakError: isError,
    optimisticStreak,
    fireColor,
    currentEpochLifetime,
  };
};
