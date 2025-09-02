import {
  Alert,
  Button,
  Card,
  Flex,
  Skeleton,
  Statistic,
  Typography,
} from 'antd';
import { useMemo } from 'react';

import { Clock } from '@/components/custom-icons/Clock';
import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireV1 } from '@/components/custom-icons/FireV1';
import { Title4 } from '@/components/ui/Typography/Title4';
import { COLOR } from '@/constants/colors';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { usePageState } from '@/hooks/usePageState';
import { useRewardContext } from '@/hooks/useRewardContext';
import { useRewardsHistory } from '@/hooks/useRewardsHistory';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { ONE_DAY_IN_S } from '@/utils/time';

const { Text } = Typography;
const { Timer } = Statistic;

const EvictionAlert = () => (
  <Alert
    message="The agent is evicted and cannot participate in staking until the eviction period ends."
    type="warning"
    showIcon
  />
);

const RunAgentAlert = () => (
  <Alert
    message="Start the agent to join staking and unlock protocol rewards."
    type="info"
    showIcon
  />
);

const useStakingDetails = () => {
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
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

  const currentEpochLifetime = useMemo(() => {
    const checkpoints =
      contractCheckpoints && recentStakingContractAddress
        ? contractCheckpoints[recentStakingContractAddress]
        : [];

    if (checkpoints.length === 0) return;

    const currentEpoch = checkpoints[0];
    const timeRemaining =
      (currentEpoch.epochEndTimeStamp + ONE_DAY_IN_S) * 1000;

    return timeRemaining;
  }, [contractCheckpoints, recentStakingContractAddress]);

  // Determine fire color based on hours left in the epoch
  const fireColor = useMemo(() => {
    if (!currentEpochLifetime) return;

    const hoursLeft = (currentEpochLifetime - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft > 12) return COLOR.TEXT_NEUTRAL_TERTIARY;
    if (hoursLeft > 3) return COLOR.WARNING;
    return COLOR.RED;
  }, [currentEpochLifetime]);

  // If rewards history is loading for the first time
  // or balances are not fetched yet - show loading state
  const isStreakLoading = isRewardsHistoryLoading || !isBalanceLoaded;

  return {
    isStreakLoading,
    isStreakError: isError,
    optimisticStreak,
    fireColor,
    currentEpochLifetime,
  };
};

export const Streak = () => {
  const { isStreakLoading, isStreakError, optimisticStreak, fireColor } =
    useStakingDetails();

  if (isStreakLoading) return <Skeleton.Input active size="small" />;
  if (isStreakError) return NA;
  return (
    <Flex gap={6} align="center">
      {optimisticStreak === 0 ? (
        <>
          <FireNoStreak /> No streak
        </>
      ) : (
        <>
          <FireV1 color={fireColor} />
          {optimisticStreak}
        </>
      )}
    </Flex>
  );
};

export const Staking = () => {
  const { goto } = usePageState();
  const { isAgentEvicted } = useActiveStakingContractDetails();
  const { isServiceRunning } = useAgentActivity();
  const { currentEpochLifetime } = useStakingDetails();

  const alert = useMemo(() => {
    if (isAgentEvicted) return <EvictionAlert />;
    if (!isServiceRunning) return <RunAgentAlert />;
    return null;
  }, [isAgentEvicted, isServiceRunning]);

  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title4>Staking</Title4>
        <Button size="small" onClick={() => goto(Pages.ManageStaking)}>
          Manage Staking
        </Button>
        <Button size="small" onClick={() => goto(Pages.RewardsHistory)}>
          History
        </Button>
      </Flex>

      <Card variant="borderless">
        <Flex vertical gap={24}>
          {alert}
          <Flex flex={1}>
            <Flex flex={1} vertical gap={4}>
              <Text type="secondary">Current Epoch lifetime</Text>
              <Flex align="center" gap={8}>
                <Clock />
                <Timer
                  type="countdown"
                  value={currentEpochLifetime}
                  valueStyle={{ fontSize: 16 }}
                />
              </Flex>
            </Flex>
            <Flex flex={1} vertical gap={4}>
              <Text type="secondary">Streak</Text>
              <Streak />
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};

/**
 * TODO
 * - Countdown timer for epoch lifetime
 * - On ZERO, show "Soon"
 * - 3 different states for Streak:
 */
