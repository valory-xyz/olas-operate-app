import {
  Alert,
  Button,
  Card,
  Flex,
  Skeleton,
  Statistic,
  Typography,
} from 'antd';
import { isEmpty } from 'lodash';
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

import { useServiceDeployment } from './AgentInfo/AgentRunButton/hooks/useServiceDeployment';

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

const Streak = () => {
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
          <FireV1 fill={fireColor} />
          {optimisticStreak}
        </>
      )}
    </Flex>
  );
};

/**
 * To display current epoch lifetime, streak, and relevant alerts.
 */
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
      </Flex>

      <Card variant="borderless">
        <Flex vertical gap={24}>
          {alert}
          <Flex flex={1}>
            <Flex flex={1} vertical gap={4}>
              <Text type="secondary">Current Epoch lifetime</Text>
              <Flex align="center" gap={8}>
                <Clock />
                {currentEpochLifetime ? (
                  <Timer
                    type="countdown"
                    value={currentEpochLifetime}
                    valueStyle={{ fontSize: 16 }}
                  />
                ) : (
                  <Text>Soon</Text>
                )}
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
