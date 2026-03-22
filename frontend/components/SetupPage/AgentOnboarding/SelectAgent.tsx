import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { useMemo } from 'react';
import { LuConstruction } from 'react-icons/lu';
import styled from 'styled-components';

import { ACTIVE_AGENTS } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { useServices } from '@/hooks';
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

const InstanceTag = styled(Flex)`
  padding: 2px 6px;
  border: 1px solid ${COLOR.GRAY_3};
  border-radius: 6px;
`;

type InstanceCountProps = {
  count: number;
};

const InstanceCount = ({ count }: InstanceCountProps) => {
  if (!count) return null;

  return (
    <InstanceTag>
      <Text type="secondary" className="text-sm">
        You own {count}
      </Text>
    </InstanceTag>
  );
};

type SelectYourAgentListProps = {
  onSelectYourAgent: (agentType: AgentType) => void;
  selectedAgent?: AgentType;
};

const SelectYourAgentList = ({
  onSelectYourAgent,
  selectedAgent,
}: SelectYourAgentListProps) => {
  const { getInstancesOfAgentType } = useServices();

  const agents = useMemo(() => {
    return (
      [...ACTIVE_AGENTS]
        // Sorted with under-construction at the end
        .sort(
          (
            [, agentA]: [string, AgentConfig],
            [, agentB]: [string, AgentConfig],
          ) => {
            if (agentA.isUnderConstruction === agentB.isUnderConstruction)
              return 0;
            return agentA.isUnderConstruction ? 1 : -1;
          },
        )
    );
  }, []);

  return (
    <>
      {agents.map(([agentType, agentConfig]) => {
        const instanceCount = getInstancesOfAgentType(agentType).length;

        return (
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
            <Text style={{ flex: 1 }}>{agentConfig.displayName}</Text>
            <InstanceCount count={instanceCount} />
            {agentConfig.isUnderConstruction && <UnderConstructionIcon />}
          </AgentSelectionContainer>
        );
      })}
    </>
  );
};

type SelectAgentProps = {
  selectedAgent?: AgentType;
  selectedArchivedInstance?: string;
  activeTab: AgentTab;
  onSelectYourAgent: (agentType: AgentType) => void;
  onSelectArchivedInstance: (serviceConfigId: string) => void;
};

/**
 * Display the onboarding of the selected agent.
 */
export const SelectAgent = ({
  selectedAgent,
  selectedArchivedInstance,
  activeTab,
  onSelectYourAgent,
  onSelectArchivedInstance,
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
          selectedInstance={selectedArchivedInstance}
          onSelectInstance={onSelectArchivedInstance}
        />
      )}
    </>
  );
};
