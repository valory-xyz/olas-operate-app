import { Card, Flex, Typography } from 'antd';

import { SetupScreen } from '@/enums/SetupScreen';

import { CardFlex } from '../styled/CardFlex';
import { SetupCreateHeader } from './Create/SetupCreateHeader';

const { Title, Text } = Typography;

export const SelectYourAgent = () => {
  return (
    <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }}>
      <SetupCreateHeader prev={SetupScreen.SetupBackupSigner} />
      <Title level={3}>Select your agent</Title>
      <Text>Come up with a strong password.</Text>

      <Card style={{ padding: 0 }}>
        <Flex vertical>
          <Flex align="center" justify="space-between">
            <Title level={4} className="m-0">
              Agent 1
            </Title>
            <Text>Selected Agent</Text>
          </Flex>
        </Flex>

        <Title level={5} className="m-0">
          Agent name
        </Title>

        <Text type="secondary">
          Autonomously post to Twitter, create and trade memecoins, and interact
          with other agents.
        </Text>
      </Card>
    </CardFlex>
  );
};
