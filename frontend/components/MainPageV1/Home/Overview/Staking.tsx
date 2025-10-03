import { Button, Flex, Skeleton, Statistic, Typography } from 'antd';
import { useMemo } from 'react';

import { CustomAlert } from '@/components/Alert';
import { Clock } from '@/components/custom-icons/Clock';
import { FireNoStreak } from '@/components/custom-icons/FireNoStreak';
import { FireV1 } from '@/components/custom-icons/FireV1';
import { CardFlex } from '@/components/ui/CardFlex';
import { NA } from '@/constants/symbols';
import { Pages } from '@/enums/Pages';
import { useServices } from '@/hooks';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { usePageState } from '@/hooks/usePageState';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useStakingDetails } from '@/hooks/useStakingDetails';

const { Text, Title } = Typography;
const { Countdown } = Statistic;

const EvictionAlert = () => (
  <CustomAlert
    message="The agent is evicted and cannot participate in staking until the eviction period ends."
    type="warning"
    centered
    showIcon
  />
);

const RunAgentAlert = () => (
  <CustomAlert
    message="Start the agent to join staking and unlock protocol rewards."
    type="info"
    centered
    showIcon
  />
);

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
  const { selectedAgentConfig } = useServices();

  const alert = useMemo(() => {
    if (isAgentEvicted) return <EvictionAlert />;
    if (!isServiceRunning) return <RunAgentAlert />;
    return null;
  }, [isAgentEvicted, isServiceRunning]);

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
              <Text className="text-neutral-secondary">
                Current Epoch lifetime
              </Text>
              <Flex align="center" gap={8}>
                <Clock />
                {currentEpochLifetime ? (
                  <Countdown
                    value={currentEpochLifetime}
                    valueStyle={{ fontSize: 16 }}
                  />
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
