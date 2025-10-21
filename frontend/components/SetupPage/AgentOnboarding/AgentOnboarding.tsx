import { LeftOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { UnderConstruction } from '@/components/Alerts';
import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState, useServices, useSetup } from '@/hooks';
import { AgentConfig } from '@/types/Agent';
import { Optional } from '@/types/Util';

import { FundingRequirementStep } from './FundingRequirementStep';

const { Text, Title } = Typography;

const Container = styled(Flex)`
  width: 840px;
  margin: 36px auto 0 auto;
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

const SelectYourAgent = () => {
  const { goto } = usePageState();
  return (
    <Flex
      vertical
      gap={16}
      className="p-24"
      style={{ borderBottom: `1px solid ${COLOR.GRAY_4}` }}
    >
      <Button
        onClick={() => goto(Pages.Main)}
        icon={<LeftOutlined />}
        type="default"
        style={{ alignSelf: 'self-start' }}
      >
        Back
      </Button>
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
    const isActive = ([, agentConfig]: [string, AgentConfig]) =>
      !agentConfig.isUnderConstruction;

    const isNotInServices = ([, agentConfig]: [string, AgentConfig]) =>
      !services?.some(
        ({ service_public_id, home_chain }) =>
          service_public_id === agentConfig.servicePublicId &&
          home_chain === agentConfig.middlewareHomeChainId,
      );

    return ACTIVE_AGENTS.filter(isActive).filter(isNotInServices);
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
        alt={agentConfig.displayName}
        width={36}
        height={36}
        style={{ borderRadius: 8, border: `1px solid ${COLOR.GRAY_3}` }}
      />
      <Flex>
        <Text>{agentConfig.displayName}</Text>
      </Flex>
    </AgentSelectionContainer>
  ));
};

/**
 * Display the onboarding of the selected agent.
 */
export const AgentOnboarding = () => {
  const { goto } = useSetup();
  const { updateAgentType } = useServices();
  const [selectedAgent, setSelectedAgent] = useState<Optional<AgentType>>();

  const handleAgentSelect = useCallback(() => {
    if (!selectedAgent) return;
    const currentAgentConfig = AGENT_CONFIG[selectedAgent];

    // if agent is "coming soon" should be redirected to EARLY ACCESS PAGE
    if (currentAgentConfig.isComingSoon) {
      goto(SetupScreen.EarlyAccessOnly);
      return;
    }

    // if the selected type requires setting up an agent,
    // should be redirected to setup screen.
    if (currentAgentConfig.requiresSetup) {
      goto(SetupScreen.SetupYourAgent);
    } else {
      goto(SetupScreen.FundYourAgent);
    }
  }, [goto, selectedAgent]);

  const handleSelectYourAgent = useCallback(
    (agentType: AgentType) => {
      updateAgentType(agentType);
      setSelectedAgent(agentType);
    },
    [updateAgentType],
  );

  return (
    <Container>
      <Flex vertical className="agent-selection-left-content">
        <SelectYourAgent />
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
          renderAgentSelection={() => (
            <Button
              type="primary"
              block
              size="large"
              onClick={handleAgentSelect}
            >
              Select Agent
            </Button>
          )}
          renderUnderConstruction={() => <UnderConstruction />}
        />
      </Flex>
    </Container>
  );
};
