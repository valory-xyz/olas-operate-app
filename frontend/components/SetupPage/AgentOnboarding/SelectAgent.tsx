import { Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';
import { LuConstruction } from 'react-icons/lu';
import styled from 'styled-components';

import { BackButton } from '@/components/ui';
import { ACTIVE_AGENTS } from '@/config/agents';
import { AgentType, COLOR, PAGES } from '@/constants';
import { usePageState, useServices } from '@/hooks';
import { AgentConfig } from '@/types';

const { Text, Title } = Typography;

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

const SelectYourAgent = ({ canGoBack }: { canGoBack: boolean }) => {
  const { goto } = usePageState();
  return (
    <Flex
      vertical
      gap={16}
      className="p-24"
      style={{ borderBottom: `1px solid ${COLOR.GRAY_4}` }}
    >
      {canGoBack && <BackButton onPrev={() => goto(PAGES.Main)} />}
      <Title level={3} className="m-0">
        Select your agent
      </Title>
      <Text type="secondary">Review and select the AI agent you like.</Text>
    </Flex>
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
  const { services } = useServices();
  const agents = useMemo(() => {
    const isNotInServices = ([, agentConfig]: [string, AgentConfig]) =>
      !services?.some(
        ({ service_public_id, home_chain }) =>
          service_public_id === agentConfig.servicePublicId &&
          home_chain === agentConfig.middlewareHomeChainId,
      );

    return (
      ACTIVE_AGENTS.filter(isNotInServices)
        // put all under construction in the end
        .sort(([, agentConfig]) => (agentConfig.isUnderConstruction ? 1 : -1))
    );
  }, [services]);

  return agents.map(([agentType, agentConfig]) => (
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
  ));
};

type SelectAgentProps = {
  selectedAgent?: AgentType;
  onSelectYourAgent: (agentType: AgentType) => void;
};

/**
 * Display the onboarding of the selected agent.
 */
export const SelectAgent = ({
  selectedAgent,
  onSelectYourAgent,
}: SelectAgentProps) => {
  const { services } = useServices();

  return (
    <>
      <SelectYourAgent canGoBack={!isEmpty(services)} />
      <SelectYourAgentList
        onSelectYourAgent={onSelectYourAgent}
        selectedAgent={selectedAgent}
      />
    </>
  );
};
