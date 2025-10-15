import { Button } from 'antd';
import { useCallback, useState } from 'react';
import styled from 'styled-components';

import { AgentType } from '@/constants/agent';
import { COLOR } from '@/constants/colors';

import {
  AGENTS_FUN_ONBOARDING_STEPS,
  MODIUS_ONBOARDING_STEPS,
  OPTIMUS_ONBOARDING_STEPS,
  PREDICTION_ONBOARDING_STEPS,
} from './constants';
import { FundingRequirementStep } from './FundingRequirementStep';
import { IntroductionStep, OnboardingStep } from './IntroductionStep';

const Dot = styled.div<{ color?: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ color }) => color || COLOR.GRAY_3};
`;

const onboardingStepsMap: Record<AgentType, OnboardingStep[]> = {
  trader: PREDICTION_ONBOARDING_STEPS,
  memeooorr: AGENTS_FUN_ONBOARDING_STEPS,
  modius: MODIUS_ONBOARDING_STEPS,
  optimus: OPTIMUS_ONBOARDING_STEPS,
};

type AgentIntroductionProps = {
  onAgentSelect: (agentType: AgentType) => void;
  selectedAgent: AgentType;
};

/**
 * Display the onboarding of the selected agent.
 */
export const AgentIntroduction = ({
  onAgentSelect,
  selectedAgent,
}: AgentIntroductionProps) => {
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

  return (
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
      onNext={onboardingStep === steps.length - 1 ? undefined : onNextStep}
      renderDot={() =>
        steps.map((_, index) => (
          <Dot
            key={index}
            color={index === onboardingStep ? COLOR.PURPLE : COLOR.GRAY_3}
          />
        ))
      }
      renderAgentSelection={() => (
        <Button
          type="primary"
          block
          size="large"
          onClick={() => onAgentSelect(selectedAgent)}
        >
          Select Agent
        </Button>
      )}
    />
  );
};
