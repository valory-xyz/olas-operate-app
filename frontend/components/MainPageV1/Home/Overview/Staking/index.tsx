import { Alert, Button, Card, Flex, Typography } from 'antd';

import { FireStreak } from '@/components/custom-icons/FireStreak';
import { Title3 } from '@/components/ui/Typography';
import { Pages } from '@/enums/Pages';
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

// TODO: Title4
export const Staking = () => {
  const { goto } = usePageState();
  const { isAgentEvicted } = useActiveStakingContractDetails();

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
          <Flex flex={1}>
            <Flex flex={1} vertical gap={8}>
              <Text>Epoch lifetime</Text>
              <Flex align="center" gap={8}>
                <FireStreak />
                <Text>23:12:59</Text>
              </Flex>
            </Flex>
            <Flex flex={1} vertical gap={8}>
              <Text className="text-lg">Streak</Text>
              <Streak />
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
