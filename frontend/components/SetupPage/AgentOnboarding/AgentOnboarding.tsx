import { Button, Flex, Typography } from 'antd';
import { isEmpty } from 'lodash';
import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { AgentIntroduction } from '@/components/AgentIntroduction';
import { Alert, BackButton } from '@/components/ui';
import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType, COLOR } from '@/constants';
import { Pages, SetupScreen } from '@/enums';
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

const UnderConstructionAlert = () => (
  <Alert
    type="warning"
    fullWidth
    showIcon
    message={
      <Flex justify="space-between" gap={4} vertical>
        <Text className="text-sm font-weight-500">Agent Under Development</Text>
        <Text className="text-sm">
          The agent is unavailable due to technical issues for an unspecified
          time.
        </Text>
      </Flex>
    }
  />
);

const SelectYourAgent = ({ canGoBack }: { canGoBack: boolean }) => {
  const { goto } = usePageState();
  return (
    <Flex
      vertical
      gap={16}
      className="p-24"
      style={{ borderBottom: `1px solid ${COLOR.GRAY_4}` }}
    >
      {canGoBack && <BackButton onPrev={() => goto(Pages.Main)} />}
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
  const { updateAgentType, services } = useServices();
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
    if (currentAgentConfig.requiresSetup && !currentAgentConfig.isX402Enabled) {
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
          renderUnderConstruction={() => <UnderConstructionAlert />}
        />
      </Flex>
    </Container>
  );
};
