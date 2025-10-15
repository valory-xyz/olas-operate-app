import { Flex, Typography } from 'antd';
import { ReactNode, useCallback, useState } from 'react';
import styled from 'styled-components';

import { AgentType } from '@/constants/agent';
import { COLOR } from '@/constants/colors';

import {
  AGENTS_FUN_ONBOARDING_STEPS,
  MODIUS_ONBOARDING_STEPS,
  OPTIMUS_ONBOARDING_STEPS,
  PREDICTION_ONBOARDING_STEPS,
} from './constants';
import { IntroductionStep, OnboardingStep } from './IntroductionStep';

const { Text } = Typography;

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
  selectedAgent?: AgentType;
  renderFundingRequirements?: (desc: string) => ReactNode;
  renderAgentSelection?: () => ReactNode;
  skipFirst?: boolean;
};

/**
 * Display the onboarding of the selected agent.
 */
export const AgentIntroduction = ({
  selectedAgent,
  renderFundingRequirements,
  renderAgentSelection,
  skipFirst,
}: AgentIntroductionProps) => {
  const [onboardingStep, setOnboardingStep] = useState(0);

  const steps = (selectedAgent ? onboardingStepsMap[selectedAgent] : []).slice(
    skipFirst ? 1 : 0,
  );

  const onNextStep = useCallback(() => {
    if (onboardingStep === steps.length - 1) return;
    setOnboardingStep(onboardingStep + 1);
  }, [onboardingStep, steps.length]);

  const onPreviousStep = useCallback(() => {
    if (onboardingStep === 0) return;
    setOnboardingStep(onboardingStep - 1);
  }, [onboardingStep]);

  if (steps.length === 0) {
    return (
      <Flex align="center" justify="center" className="w-full">
        <Text>Select an agent.</Text>
      </Flex>
    );
  }

  return (
    <IntroductionStep
      title={steps[onboardingStep].title}
      desc={steps[onboardingStep].desc}
      imgSrc={steps[onboardingStep].imgSrc}
      helper={steps[onboardingStep].helper}
      renderFundingRequirements={renderFundingRequirements}
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
      renderAgentSelection={renderAgentSelection}
    />
  );
};
