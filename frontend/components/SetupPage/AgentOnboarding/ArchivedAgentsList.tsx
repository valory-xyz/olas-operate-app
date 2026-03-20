import { Flex, Typography } from 'antd';
import Image from 'next/image';
import styled from 'styled-components';

import { AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { useArchivedAgents } from '@/hooks';

const { Text } = Typography;

const AgentSelectionContainer = styled(Flex)<{ active?: boolean }>`
  padding: 12px 24px;
  cursor: pointer;
  background-color: ${({ active }) => (active ? COLOR.GRAY_1 : COLOR.WHITE)};
  border-bottom: 1px solid ${COLOR.GRAY_4};
  border-left: 1px solid ${COLOR.WHITE};
  &:hover {
    background-color: ${COLOR.GRAY_1};
  }
`;

type ArchivedAgentsListProps = {
  selectedAgent?: AgentType;
  onSelectAgent: (agentType: AgentType) => void;
};

export const ArchivedAgentsList = ({
  selectedAgent,
  onSelectAgent,
}: ArchivedAgentsListProps) => {
  const { archivedAgents } = useArchivedAgents();

  if (archivedAgents.length === 0) {
    return (
      <Flex
        align="center"
        justify="center"
        className="p-24"
        style={{ color: COLOR.TEXT_NEUTRAL_TERTIARY }}
      >
        <Text type="secondary">No archived agents.</Text>
      </Flex>
    );
  }

  return (
    <>
      {archivedAgents.map((agentType) => {
        const agentConfig = AGENT_CONFIG[agentType];
        if (!agentConfig) return null;

        return (
          <AgentSelectionContainer
            key={agentType}
            active={selectedAgent === agentType}
            onClick={() => onSelectAgent(agentType)}
            gap={12}
            align="center"
          >
            <Image
              src={`/agent-${agentType}-icon.png`}
              alt={`${agentConfig.displayName} icon`}
              width={36}
              height={36}
              style={{ borderRadius: 8, border: `1px solid ${COLOR.GRAY_3}` }}
            />
            <Text>{agentConfig.displayName}</Text>
          </AgentSelectionContainer>
        );
      })}
    </>
  );
};
