import { Flex, Typography } from 'antd';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { AgentMap, AgentType } from '@/constants/agent';
import { COLOR } from '@/constants/colors';

import {
  AGENTS_FUN_ONBOARDING_STEPS,
  MODIUS_ONBOARDING_STEPS,
  OPTIMUS_ONBOARDING_STEPS,
  PETT_AI_ONBOARDING_STEPS,
  POLYSTRAT_ONBOARDING_STEPS,
  PREDICTION_ONBOARDING_STEPS,
} from './constants';
import {
  IntroductionStep,
  IntroductionStepStyles,
  OnboardingStep,
} from './IntroductionStep';

const { Text } = Typography;

const Dot = styled.div<{ color?: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ color }) => color || COLOR.GRAY_3};
`;

const onboardingStepsMap: Record<AgentType, OnboardingStep[]> = {
  [AgentMap.PredictTrader]: PREDICTION_ONBOARDING_STEPS,
  [AgentMap.AgentsFun]: AGENTS_FUN_ONBOARDING_STEPS,
  [AgentMap.Modius]: MODIUS_ONBOARDING_STEPS,
  [AgentMap.Optimus]: OPTIMUS_ONBOARDING_STEPS,
  [AgentMap.PettAi]: PETT_AI_ONBOARDING_STEPS,
  [AgentMap.Polystrat]: POLYSTRAT_ONBOARDING_STEPS,
};

type AgentIntroductionProps = {
  agentType?: AgentType;
  renderFundingRequirements?: (desc: string) => ReactNode;
  renderAgentSelection?: () => ReactNode;
} & {
  styles?: IntroductionStepStyles;
};

/**
 * Display the about (introduction) of an agent.
 */
export const AgentIntroduction = ({
  agentType,
  renderFundingRequirements,
  renderAgentSelection,
  styles,
}: AgentIntroductionProps) => {
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Reset onboarding step when selected agent changes
  useEffect(() => setOnboardingStep(0), [agentType]);

  // Skip the first step if renderFundingRequirements is provided
  // as first step is funding requirements details and description.
  const steps = (agentType ? onboardingStepsMap[agentType] : []).slice(
    renderFundingRequirements ? 0 : 1,
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
      title={steps[onboardingStep]?.title}
      desc={steps[onboardingStep]?.desc}
      imgSrc={steps[onboardingStep]?.imgSrc}
      helper={steps[onboardingStep]?.helper}
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
      styles={{ ...(styles || {}), ...(steps[onboardingStep]?.styles || {}) }}
    />
  );
};
