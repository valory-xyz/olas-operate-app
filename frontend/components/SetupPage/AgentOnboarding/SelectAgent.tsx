import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import { LuConstruction } from 'react-icons/lu';
import styled from 'styled-components';

import { ACTIVE_AGENTS } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { useArchivedAgents, useServices } from '@/hooks';
import { AgentConfig } from '@/types';

import { ArchivedAgentsList } from './ArchivedAgentsList';

const { Text } = Typography;

export const AGENT_TAB = {
  New: 'new',
  Archived: 'archived',
} as const;

type AgentTab = (typeof AGENT_TAB)[keyof typeof AGENT_TAB];

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

const UnderConstructionIcon = styled(LuConstruction)`
  padding: 6px;
  border-radius: 8px;
  color: ${COLOR.TEXT_COLOR.WARNING.DEFAULT};
  background-color: ${COLOR.BG.WARNING.DEFAULT};
`;

type SelectYourAgentListProps = {
  onSelectYourAgent: (agentType: AgentType) => void;
  selectedAgent?: AgentType;
};

const SelectYourAgentList = ({
  onSelectYourAgent,
  selectedAgent,
}: SelectYourAgentListProps) => {
  const { services } = useServices();
  const { archivedAgents } = useArchivedAgents();

  const agents = useMemo(() => {
    const isNotInServices = ([, agentConfig]: [string, AgentConfig]) =>
      !services?.some(
        ({ service_public_id, home_chain }) =>
          service_public_id === agentConfig.servicePublicId &&
          home_chain === agentConfig.middlewareHomeChainId,
      );

    const isNotArchived = ([agentType]: [string, AgentConfig]) =>
      !archivedAgents.includes(agentType as AgentType);

    return (
      ACTIVE_AGENTS.filter(isNotInServices)
        .filter(isNotArchived)
        // put all under construction in the end
        .sort(([, agentConfig]) => (agentConfig.isUnderConstruction ? 1 : -1))
    );
  }, [services, archivedAgents]);

  return (
    <>
      {agents.map(([agentType, agentConfig]) => (
        <AgentSelectionContainer
          key={agentType}
          active={selectedAgent === agentType}
          onClick={() => onSelectYourAgent(agentType as AgentType)}
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
          {agentConfig.isUnderConstruction && <UnderConstructionIcon />}
        </AgentSelectionContainer>
      ))}
    </>
  );
};

type SelectAgentProps = {
  selectedAgent?: AgentType;
  activeTab: AgentTab;
  onSelectYourAgent: (agentType: AgentType) => void;
  onSelectArchivedAgent: (agentType: AgentType) => void;
};

/**
 * Display the onboarding of the selected agent.
 */
export const SelectAgent = ({
  selectedAgent,
  activeTab,
  onSelectYourAgent,
  onSelectArchivedAgent,
}: SelectAgentProps) => {
  return (
    <>
      {activeTab === AGENT_TAB.New ? (
        <SelectYourAgentList
          onSelectYourAgent={onSelectYourAgent}
          selectedAgent={selectedAgent}
        />
      ) : (
        <ArchivedAgentsList
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectArchivedAgent}
        />
      )}
    </>
  );
};
