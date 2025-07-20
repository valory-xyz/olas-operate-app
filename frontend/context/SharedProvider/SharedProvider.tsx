import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { AgentType } from '@/enums/Agent';
import { useServices } from '@/hooks/useServices';
import { Optional } from '@/types/Util';

import { useMainOlasBalance } from './useMainOlasBalance';

export const SharedContext = createContext<{
  // main olas balance
  isMainOlasBalanceLoading: boolean;
  mainOlasBalance: Optional<number>;
  hasMainOlasBalanceAnimatedOnLoad: boolean;
  setMainOlasBalanceAnimated: (value: boolean) => void;

  // onboarding
  onboardingStep: number;
  updateOnboardingStep: (step: number) => void;

  // agent specific checks
  isAgentsFunFieldUpdateRequired: boolean;

  // others
}>({
  isMainOlasBalanceLoading: true,
  mainOlasBalance: undefined,
  hasMainOlasBalanceAnimatedOnLoad: false,
  setMainOlasBalanceAnimated: () => {},

  // onboarding
  onboardingStep: 0,
  updateOnboardingStep: () => {},

  // agent specific checks
  isAgentsFunFieldUpdateRequired: false,

  // others
});

/**
 * Shared provider to provide shared context to all components in the app.
 * @example
 * - Track the main OLAS balance animation state & mount state.
 * - Track the onboarding step of the user (independent of the agent).
 * - Track the healthcheck alert shown to the user (so that they are not shown again).
 */
export const SharedProvider = ({ children }: PropsWithChildren) => {
  // state to track the onboarding step of the user (independent of the agent)
  const [onboardingStep, setOnboardingStep] = useState(0);
  const updateOnboardingStep = useCallback((step: number) => {
    setOnboardingStep(step);
  }, []);

  // state to track the main OLAS balance animation state & mount state
  const hasAnimatedRef = useRef(false);
  const mainOlasBalanceDetails = useMainOlasBalance();
  const setMainOlasBalanceAnimated = useCallback((value: boolean) => {
    hasAnimatedRef.current = value;
  }, []);

  // agent specific checks
  const { selectedAgentType, selectedService } = useServices();
  const [isAgentsFunFieldUpdateRequired, setIsAgentsFunFieldUpdateRequired] =
    useState(false);

  // Users with the AgentsFun agent type are required to update their
  // agent configurations to run the latest version of the agent.
  useEffect(() => {
    if (!selectedAgentType) return;
    if (selectedAgentType !== AgentType.AgentsFun) {
      setIsAgentsFunFieldUpdateRequired(false);
      return;
    }
    if (!selectedService) return;

    const areFieldsUpdated = [
      'TWEEPY_CONSUMER_API_KEY',
      'TWEEPY_CONSUMER_API_KEY_SECRET',
      'TWEEPY_BEARER_TOKEN',
      'TWEEPY_ACCESS_TOKEN',
      'TWEEPY_ACCESS_TOKEN_SECRET',
    ].every((key) => selectedService.env_variables?.[key]?.value);

    setIsAgentsFunFieldUpdateRequired(!areFieldsUpdated);
  }, [selectedAgentType, selectedService]);

  return (
    <SharedContext.Provider
      value={{
        ...mainOlasBalanceDetails,
        hasMainOlasBalanceAnimatedOnLoad: hasAnimatedRef.current,
        setMainOlasBalanceAnimated,

        // onboarding
        onboardingStep,
        updateOnboardingStep,

        // agent specific checks
        isAgentsFunFieldUpdateRequired,

        // others
      }}
    >
      {children}
    </SharedContext.Provider>
  );
};
