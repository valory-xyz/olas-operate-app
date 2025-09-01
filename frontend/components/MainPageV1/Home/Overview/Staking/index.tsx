import { Button, Card, Flex, Typography } from 'antd';

import { FireStreak } from '@/components/custom-icons/FireStreak';
import { Title3 } from '@/components/ui/Typography';

const { Text } = Typography;

// TODO: Title4
export const Staking = () => {
  return (
    <Flex vertical>
      <Flex justify="space-between" align="center">
        <Title3>Staking Component</Title3>
        <Button size="small">Manage Staking</Button>
      </Flex>
      <Card variant="borderless">
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
            <Flex align="center" gap={8}>
              <FireStreak />
              <Text>3</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
