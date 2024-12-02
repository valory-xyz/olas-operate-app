import { Button, Card, Flex, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';

import { AGENT_CONFIG } from '@/config/agents';
import { COLOR } from '@/constants/colors';
import { AgentType } from '@/enums/Agent';
import { SetupScreen } from '@/enums/SetupScreen';
import { useServices } from '@/hooks/useServices';

import { CardFlex } from '../styled/CardFlex';
import { SetupCreateHeader } from './Create/SetupCreateHeader';

const { Title, Text } = Typography;

export const SelectYourAgent = () => {
  const { selectedAgentType, updateAgentType } = useServices();

  return (
    <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }}>
      <SetupCreateHeader prev={SetupScreen.SetupBackupSigner} />
      <Title level={3}>Select your agent</Title>

      {entries(AGENT_CONFIG).map(([agentType, agentConfig]) => {
        const isCurrentAgent = selectedAgentType === agentType;

        return (
          <Card
            key={agentType}
            style={{ padding: 0, marginBottom: 6 }}
            styles={{
              body: {
                padding: 16,
                gap: 6,
                borderRadius: 'inherit',
                background: isCurrentAgent ? COLOR.GRAY_1 : 'transparent',
              },
            }}
          >
            <Flex vertical>
              <Flex align="center" justify="space-between">
                <Image
                  src={`/agent-${agentType}-icon.png`}
                  width={50}
                  height={50}
                  alt="Agent 1"
                />
                {isCurrentAgent ? (
                  <Text>Selected Agent</Text>
                ) : (
                  <Button
                    type="primary"
                    onClick={() => updateAgentType(agentType as AgentType)}
                  >
                    Select
                  </Button>
                )}
              </Flex>
            </Flex>

            <Title level={5} className="m-0">
              {agentConfig.displayName}
            </Title>

            <Text type="secondary">{agentConfig.description}</Text>
          </Card>
        );
      })}
    </CardFlex>
  );
};
