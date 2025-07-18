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
import { Nullable, Optional } from '@/types/Util';

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

  // on ramping
  usdAmountToPay: Nullable<number>;
  updateUsdAmountToPay: (amount: number) => void;
  isBuyCryptoBtnLoading: boolean;
  updateIsBuyCryptoBtnLoading: (loading: boolean) => void;

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

  // on ramping
  usdAmountToPay: null,
  updateUsdAmountToPay: () => {},
  isBuyCryptoBtnLoading: false,
  updateIsBuyCryptoBtnLoading: () => {},

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

  // on ramping
  const [usdAmountToPay, setUsdAmountToPay] = useState<Nullable<number>>(null);
  const [isBuyCryptoBtnLoading, setIsBuyCryptoBtnLoading] = useState(false);

  // Function to set the USD amount to pay
  const updateUsdAmountToPay = useCallback((amount: number) => {
    setUsdAmountToPay(amount);
  }, []);

  const updateIsBuyCryptoBtnLoading = useCallback((loading: boolean) => {
    setIsBuyCryptoBtnLoading(loading);
  }, []);

  console.log({ isBuyCryptoBtnLoading });

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

        // on ramping
        usdAmountToPay,
        updateUsdAmountToPay,
        isBuyCryptoBtnLoading,
        updateIsBuyCryptoBtnLoading,
      }}
    >
      {children}
    </SharedContext.Provider>
  );
};
