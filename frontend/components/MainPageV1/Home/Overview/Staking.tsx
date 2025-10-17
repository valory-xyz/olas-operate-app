import { Button, Flex, Skeleton, Statistic, Typography } from 'antd';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { Clock } from '@/components/custom-icons';
import { FireV1 } from '@/components/custom-icons/FireV1';
import { CardFlex } from '@/components/ui/CardFlex';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { useRewardContext, useServices } from '@/hooks';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { usePageState } from '@/hooks/usePageState';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useStakingDetails } from '@/hooks/useStakingDetails';

const { Text, Title } = Typography;
const { Countdown } = Statistic;

const UnderConstructionAlert = () => (
  <CustomAlert
    message="The agent is under construction and cannot participate in staking until further notice."
    type="warning"
    centered
    showIcon
    className="text-sm"
  />
);

const EvictionAlert = () => (
  <CustomAlert
    message="The agent is evicted and cannot participate in staking until the eviction period ends."
    type="warning"
    centered
    showIcon
    className="text-sm"
  />
);

const RunAgentAlert = () => (
  <CustomAlert
    message="Start the agent to join staking and unlock protocol rewards."
    type="info"
    centered
    showIcon
    className="text-sm"
  />
);

const Streak = () => {
  const { isStreakLoading, isStreakError, optimisticStreak } =
    useStakingDetails();
  const { isEligibleForRewards } = useRewardContext();

  if (isStreakLoading) return <Skeleton.Input active size="small" />;
  if (isStreakError) return NA;

  const isFlameActive = optimisticStreak > 0 && isEligibleForRewards;

  return (
    <Flex gap={6} align="center">
      {optimisticStreak === 0 ? (
        <>
          <FireV1 /> No streak
        </>
      ) : (
        <>
          <FireV1 isActive={isFlameActive} />
          {optimisticStreak}
        </>
      )}
    </Flex>
  );
};

/**
 * To display current epoch lifetime, streak, and relevant alerts.
 */

const DANGER_HOURS = 3;
const SUCCESS_HOURS = 12;

export const Staking = () => {
  const { goto } = usePageState();
  const { isAgentEvicted, isEligibleForStaking } =
    useActiveStakingContractDetails();
  const { isServiceRunning } = useAgentActivity();
  const { currentEpochLifetime } = useStakingDetails();
  const { selectedAgentConfig } = useServices();

  const { isUnderConstruction } = selectedAgentConfig;

  const getClockColor = (): 'danger' | 'success' | undefined => {
    if (!currentEpochLifetime) return;

    const hoursLeft = (currentEpochLifetime - Date.now()) / (1000 * 60 * 60);

    if (hoursLeft < DANGER_HOURS) return 'danger';
    if (hoursLeft < SUCCESS_HOURS) return 'success';
    return;
  };

  const alert = useMemo(() => {
    if (isUnderConstruction) return <UnderConstructionAlert />;
    if (isAgentEvicted && !isEligibleForStaking) return <EvictionAlert />;
    if (!isServiceRunning) return <RunAgentAlert />;
    return null;
  }, [
    isAgentEvicted,
    isEligibleForStaking,
    isServiceRunning,
    isUnderConstruction,
  ]);

  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title level={5} className="mt-0 mb-12">
          Staking
        </Title>
        {!selectedAgentConfig?.isUnderConstruction && (
          <Button size="small" onClick={() => goto(Pages.AgentStaking)}>
            Manage Staking
          </Button>
        )}
      </Flex>

      <CardFlex $noBorder>
        <Flex vertical gap={24}>
          {alert}
          <Flex flex={1}>
            <Flex flex={1} vertical gap={8}>
              <Text className="text-neutral-secondary">Epoch lifetime</Text>
              <Flex align="center" gap={8}>
                {currentEpochLifetime ? (
                  <>
                    <Clock color={getClockColor()} />
                    <Countdown
                      value={currentEpochLifetime}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </>
                ) : (
                  <Text>Soon</Text>
                )}
              </Flex>
            </Flex>
            <Flex flex={1} vertical gap={8}>
              <Text className="text-neutral-secondary">Streak</Text>
              <Streak />
            </Flex>
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
