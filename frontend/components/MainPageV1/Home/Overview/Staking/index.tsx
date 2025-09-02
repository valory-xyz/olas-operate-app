import { Alert, Button, Card, Flex, Typography } from 'antd';

import { Clock } from '@/components/custom-icons/Clock';
import { Title3 } from '@/components/ui/Typography';
import { Pages } from '@/enums/Pages';
import { useAgentActivity } from '@/hooks/useAgentActivity';
import { usePageState } from '@/hooks/usePageState';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';

import { Streak } from './Streak';

const { Text } = Typography;

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

// TODO: Title4
export const Staking = () => {
  const { goto } = usePageState();
  const { isAgentEvicted } = useActiveStakingContractDetails();
  const { isServiceRunning } = useAgentActivity();

  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title3>Staking Component</Title3>
        <Button size="small" onClick={() => goto(Pages.ManageStaking)}>
          Manage Staking
        </Button>
      </Flex>
      <Card variant="borderless">
        <Flex vertical gap={24}>
          {isAgentEvicted && <EvictionAlert />}
          {!isServiceRunning && <RunAgentAlert />}
          <Flex flex={1}>
            <Flex flex={1} vertical gap={4}>
              <Text>Current Epoch lifetime</Text>
              <Flex align="center" gap={8}>
                <Clock />
                <Text>23:12:59</Text>
              </Flex>
            </Flex>
            <Flex flex={1} vertical gap={4}>
              <Text className="text-lg">Streak</Text>
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
