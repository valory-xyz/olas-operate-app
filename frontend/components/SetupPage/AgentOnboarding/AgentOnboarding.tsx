import { Flex, Typography } from 'antd';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { COLOR } from '@/constants/colors';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { Optional } from '@/types/Util';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import {
  AGENTS_FUN_ONBOARDING_STEPS,
  MODIUS_ONBOARDING_STEPS,
  OPTIMUS_ONBOARDING_STEPS,
  PREDICTION_ONBOARDING_STEPS,
} from './constants';
import { FundingRequirementStep } from './FundingRequirementStep';
import { IntroductionStep, OnboardingStep } from './IntroductionStep';

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

const Dot = styled.div<{ color?: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ color }) => color || COLOR.GRAY_3};
`;

const AgentSelectionContainer = styled(Flex)<{ active?: boolean }>`
  padding: 12px 24px;
  cursor: pointer;
  background-color: ${({ active }) => (active ? COLOR.GRAY_1 : COLOR.WHITE)};
  border-bottom: 1px solid ${COLOR.GRAY_4};
  &:hover {
    background-color: ${COLOR.GRAY_1};
  }
`;

const SelectYourAgent = () => (
  <Flex
    vertical
    gap={16}
    className="p-24"
    style={{ borderBottom: `1px solid ${COLOR.GRAY_4}` }}
  >
    <Title level={3} className="m-0">
      Select your agent
    </Title>
    <Text type="secondary">Review and select the AI agent you like.</Text>
  </Flex>
);

type SelectYourAgentListProps = {
  onSelectYourAgent: (agentType: AgentType) => void;
  selectedAgent?: AgentType;
};

const SelectYourAgentList = ({
  onSelectYourAgent,
  selectedAgent,
}: SelectYourAgentListProps) =>
  ACTIVE_AGENTS.map(([agentType, agentConfig]) => {
    return (
      <AgentSelectionContainer
        key={agentType}
        onClick={() => onSelectYourAgent(agentType as AgentType)}
        gap={12}
        align="center"
        active={selectedAgent === agentType}
      >
        <Image
          src={`/agent-${agentType}-icon.png`}
          width={36}
          height={36}
          alt={agentConfig.displayName}
          style={{ borderRadius: 8, border: `1px solid ${COLOR.GRAY_3}` }}
        />

        <Flex>
          <Text>{agentConfig.displayName}</Text>
        </Flex>
      </AgentSelectionContainer>
    );
  });

const onboardingStepsMap: Record<AgentType, OnboardingStep[]> = {
  trader: PREDICTION_ONBOARDING_STEPS,
  memeooorr: AGENTS_FUN_ONBOARDING_STEPS,
  modius: MODIUS_ONBOARDING_STEPS,
  optimus: OPTIMUS_ONBOARDING_STEPS,
};

/**
 * Display the onboarding of the selected agent.
 */
export const AgentOnboarding = () => {
  const { goto } = useSetup();
  const { services } = useServices();
  const { goto: gotoPage } = usePageState();
  const [selectedAgent, setSelectedAgent] = useState<Optional<AgentType>>();
  const [onboardingStep, setOnboardingStep] = useState(0);

  const steps = selectedAgent ? onboardingStepsMap[selectedAgent] : [];

  const onNextStep = useCallback(() => {
    if (onboardingStep === steps.length - 1) return;
    setOnboardingStep(onboardingStep + 1);
  }, [onboardingStep, steps.length]);

  const onPreviousStep = useCallback(() => {
    if (onboardingStep === 0) return;
    setOnboardingStep(onboardingStep - 1);
  }, [onboardingStep]);

  const handleAgentSelect = useCallback(() => {
    if (!selectedAgent) return;
    const currentAgentConfig = AGENT_CONFIG[selectedAgent];

    // if already exists
    const isAccountCreated = services?.find(
      (service) =>
        asEvmChainId(service.home_chain) === currentAgentConfig.evmHomeChainId,
    );
    if (isAccountCreated) {
      gotoPage(Pages.Main);
      return;
    }

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
      goto(SetupScreen.SetupEoaFunding);
    }
  }, [goto, gotoPage, selectedAgent, services]);

  const handleSelectYourAgent = useCallback((agentType: AgentType) => {
    setSelectedAgent(agentType as AgentType);
    setOnboardingStep(0);
  }, []);

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
        {steps.length === 0 ? (
          <Flex align="center" justify="center" className="w-full">
            <Text>Select an agent.</Text>
          </Flex>
        ) : (
          <IntroductionStep
            title={steps[onboardingStep].title}
            desc={steps[onboardingStep].desc}
            imgSrc={steps[onboardingStep].imgSrc}
            helper={steps[onboardingStep].helper}
            renderFundingRequirements={(desc) =>
              selectedAgent ? (
                <FundingRequirementStep agentType={selectedAgent} desc={desc} />
              ) : null
            }
            onPrev={onboardingStep === 0 ? undefined : onPreviousStep}
            onNext={
              onboardingStep === steps.length - 1 ? undefined : onNextStep
            }
            renderDot={() =>
              steps.map((_, index) => (
                <Dot
                  key={index}
                  color={index === onboardingStep ? COLOR.PURPLE : COLOR.GRAY_3}
                />
              ))
            }
            onAgentSelect={handleAgentSelect}
          />
        )}
      </Flex>
    </Container>
  );
};
