import { Divider, Flex, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useSharedContext } from '@/hooks/useSharedContext';

import {
  AGENTS_FUND_ONBOARDING_STEPS,
  MODIUS_ONBOARDING_STEPS,
  OPTIMUS_ONBOARDING_STEPS,
  PREDICTION_ONBOARDING_STEPS,
} from './constants';
import { IntroductionStep, OnboardingStep } from './IntroductionStep';

const { Text } = Typography;

type IntroductionProps = {
  steps: OnboardingStep[];
  onOnboardingComplete: () => void;
  isUnderConstruction: boolean;
};

const Introduction = ({
  steps,
  onOnboardingComplete,
  isUnderConstruction,
}: IntroductionProps) => {
  const { goto } = useSetup();
  const { onboardingStep, updateOnboardingStep } = useSharedContext();

  const onNextStep = useCallback(() => {
    if (onboardingStep === steps.length - 1) {
      onOnboardingComplete();
    } else {
      updateOnboardingStep(onboardingStep + 1);
    }
  }, [
    onboardingStep,
    steps.length,
    onOnboardingComplete,
    updateOnboardingStep,
  ]);

  const onPreviousStep = useCallback(() => {
    if (onboardingStep === 0) {
      goto(SetupScreen.AgentSelection);
    } else {
      updateOnboardingStep(onboardingStep - 1);
    }
  }, [onboardingStep, goto, updateOnboardingStep]);

  const buttonLabel = useMemo(() => {
    if (onboardingStep === steps.length - 1) {
      return isUnderConstruction ? 'Return to agent selection' : 'Set up agent';
    }
    return 'Continue';
  }, [onboardingStep, steps.length, isUnderConstruction]);

  return (
    <IntroductionStep
      title={steps[onboardingStep].title}
      desc={steps[onboardingStep].desc}
      imgSrc={steps[onboardingStep].imgSrc}
      helper={steps[onboardingStep].helper}
      btnText={buttonLabel}
      onPrev={onPreviousStep}
      onNext={onNextStep}
    />
  );
};

/**
 * Display the introduction (onboarding) of the selected agent.
 */
export const AgentIntroduction = () => {
  const { goto } = useSetup();
  const { goto: gotoPage } = usePageState();
  const { selectedAgentType, selectedAgentConfig } = useServices();

  const introductionSteps = useMemo(() => {
    if (selectedAgentType === 'trader') return PREDICTION_ONBOARDING_STEPS;
    if (
      selectedAgentType === 'memeooorr' ||
      selectedAgentType === 'agentsFunEliza'
    )
      return AGENTS_FUND_ONBOARDING_STEPS;
    if (selectedAgentType === 'modius') return MODIUS_ONBOARDING_STEPS;
    if (selectedAgentType === 'optimus') return OPTIMUS_ONBOARDING_STEPS;

    throw new Error('Invalid agent type');
  }, [selectedAgentType]);

  const onComplete = useCallback(() => {
    // if agent is "coming soon" should be redirected to EARLY ACCESS PAGE
    if (selectedAgentConfig.isComingSoon) {
      goto(SetupScreen.EarlyAccessOnly);
      return;
    }

    // if agent is under construction, goes back to agent selection
    if (selectedAgentConfig.isUnderConstruction) {
      gotoPage(Pages.SwitchAgent);
    }

    // if the selected type requires setting up an agent,
    // should be redirected to setup screen.
    if (selectedAgentConfig.requiresSetup) {
      goto(SetupScreen.SetupYourAgent);
    } else {
      goto(SetupScreen.SetupEoaFunding);
    }
  }, [goto, gotoPage, selectedAgentConfig]);

  return (
    <>
      <Flex align="center" justify="center" style={{ paddingTop: 12 }}>
        <Text>{selectedAgentConfig.displayName}</Text>
      </Flex>
      <Divider style={{ margin: '12px 0 0 0' }} />
      <Introduction
        steps={introductionSteps}
        onOnboardingComplete={onComplete}
        isUnderConstruction={!!selectedAgentConfig.isUnderConstruction}
      />
    </>
  );
};
