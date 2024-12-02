import { Button, Card, Flex, Typography } from 'antd';
import { entries } from 'lodash';
import Image from 'next/image';
import { useCallback } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { COLOR } from '@/constants/colors';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { AgentConfig } from '@/types/Agent';

import { CardFlex } from '../styled/CardFlex';
import { SetupCreateHeader } from './Create/SetupCreateHeader';

const { Title, Text } = Typography;

type EachAgentProps = { agentType: AgentType; agentConfig: AgentConfig };
const EachAgent = ({ agentType, agentConfig }: EachAgentProps) => {
  const { selectedAgentType, updateAgentType } = useServices();
  const { goto } = usePageState();

  const isCurrentAgent = selectedAgentType === agentType;

  const handleSelectAgent = useCallback(() => {
    updateAgentType(agentType);
    goto(Pages.SetupYourAgent); // TODO: page to be added
  }, [agentType, updateAgentType, goto]);

  return (
    <Card
      key={agentType}
      style={{ padding: 0, marginBottom: 6 }}
      styles={{
        body: {
          padding: '12px 16px',
          gap: 6,
          borderRadius: 'inherit',
          background: isCurrentAgent ? COLOR.GRAY_1 : 'transparent',
          opacity: isCurrentAgent ? 0.75 : 1,
        },
      }}
    >
      <Flex vertical>
        <Flex align="center" justify="space-between" className="mb-8">
          <Image
            src={`/agent-${agentType}-icon.png`}
            width={36}
            height={36}
            alt={agentConfig.displayName}
          />
          {isCurrentAgent ? (
            <Text>Selected Agent</Text>
          ) : (
            <Button type="primary" onClick={handleSelectAgent}>
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
};

export const SelectYourAgent = () => (
  <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }}>
    <SetupCreateHeader prev={SetupScreen.SetupBackupSigner} />
    <Title level={3}>Select your agent</Title>

    {entries(AGENT_CONFIG).map(([agentType, agentConfig]) => {
      return (
        <EachAgent
          key={agentType}
          agentType={agentType as AgentType}
          agentConfig={agentConfig}
        />
      );
    })}
  </CardFlex>
);
