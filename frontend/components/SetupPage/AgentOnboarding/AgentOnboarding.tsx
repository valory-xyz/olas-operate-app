import { Button, Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import { LuConstruction } from 'react-icons/lu';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { BackButton } from '@/components/ui';
import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR, PAGES, SETUP_SCREEN } from '@/constants';
import { usePageState, useServices, useSetup } from '@/hooks';
import { AgentConfig, Optional } from '@/types';

import { FundingRequirementStep } from './FundingRequirementStep';

const { Text, Title } = Typography;

const Container = styled(Flex)`
  width: 840px;
  margin: 16px auto 0 auto;
  border-radius: 8px;
  background-color: ${COLOR.WHITE};
  .agent-selection-left-content {
    width: 380px;
    border-right: 1px solid ${COLOR.GRAY_4};
  }
  .agent-selection-right-content {
    width: 460px;
    min-height: 600px;
    overflow: hidden;
  }
`;

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
        .sort(([_, agentConfig]) => (agentConfig.isUnderConstruction ? 1 : -1))
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

/**
 * Display the onboarding of the selected agent.
 */
export const AgentOnboarding = () => {
  const { goto } = useSetup();
  const { updateAgentType, services } = useServices();
  const [selectedAgent, setSelectedAgent] = useState<Optional<AgentType>>();

  const handleAgentSelect = useCallback(() => {
    if (!selectedAgent) return;
    const currentAgentConfig = AGENT_CONFIG[selectedAgent];

    // if agent is "coming soon" should be redirected to EARLY ACCESS PAGE
    if (currentAgentConfig.isComingSoon) {
      goto(SETUP_SCREEN.EarlyAccessOnly);
      return;
    }

    // if the selected type requires setting up an agent,
    // should be redirected to setup screen.
    if (currentAgentConfig.requiresSetup && !currentAgentConfig.isX402Enabled) {
      goto(SETUP_SCREEN.SetupYourAgent);
    } else {
      goto(SETUP_SCREEN.SelectStaking);
    }
  }, [goto, selectedAgent]);

  const handleSelectYourAgent = useCallback(
    (agentType: AgentType) => {
      updateAgentType(agentType);
      setSelectedAgent(agentType);
    },
    [updateAgentType],
  );

  const canSelectAgent = selectedAgent
    ? !AGENT_CONFIG[selectedAgent].isUnderConstruction
    : false;

  return (
    <Container>
      <Flex vertical className="agent-selection-left-content">
        <SelectYourAgent canGoBack={!isEmpty(services)} />
        <SelectYourAgentList
          onSelectYourAgent={handleSelectYourAgent}
          selectedAgent={selectedAgent}
        />
      </Flex>

      <Flex className="agent-selection-right-content">
        <AgentIntroduction
          agentType={selectedAgent}
          renderFundingRequirements={(desc) =>
            selectedAgent ? (
              <FundingRequirementStep agentType={selectedAgent} desc={desc} />
            ) : null
          }
          renderAgentSelection={
            canSelectAgent
              ? () => (
                  <Button
                    onClick={handleAgentSelect}
                    type="primary"
                    block
                    size="large"
                  >
                    Select Agent
                  </Button>
                )
              : undefined
          }
        />
      </Flex>
    </Container>
  );
};
