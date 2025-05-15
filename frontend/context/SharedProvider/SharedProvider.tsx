import {
  createContext,
  PropsWithChildren,
  useCallback,
  useRef,
  useState,
} from 'react';

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

  // others
}>({
  isMainOlasBalanceLoading: true,
  mainOlasBalance: undefined,
  hasMainOlasBalanceAnimatedOnLoad: false,
  setMainOlasBalanceAnimated: () => {},

  // onboarding
  onboardingStep: 0,
  updateOnboardingStep: () => {},

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

  return (
    <SharedContext.Provider
      value={{
        ...mainOlasBalanceDetails,
        hasMainOlasBalanceAnimatedOnLoad: hasAnimatedRef.current,
        setMainOlasBalanceAnimated,

        // onboarding
        onboardingStep,
        updateOnboardingStep,
      }}
    >
      {children}
    </SharedContext.Provider>
  );
};
