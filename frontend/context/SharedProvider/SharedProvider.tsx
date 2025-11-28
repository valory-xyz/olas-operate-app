import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { AgentMap } from '@/constants';
import { useServices } from '@/hooks/useServices';

export const SharedContext = createContext<{
  hasMainOlasBalanceAnimatedOnLoad: boolean;
  setMainOlasBalanceAnimated: (value: boolean) => void;

  // agent specific checks
  isAgentsFunFieldUpdateRequired: boolean;

  // others
}>({
  hasMainOlasBalanceAnimatedOnLoad: false,
  setMainOlasBalanceAnimated: () => {},

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
  // state to track the main OLAS balance animation state & mount state
  const hasAnimatedRef = useRef(false);
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
    if (selectedAgentType !== AgentMap.AgentsFun) {
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
        hasMainOlasBalanceAnimatedOnLoad: hasAnimatedRef.current,
        setMainOlasBalanceAnimated,

        // agent specific checks
        isAgentsFunFieldUpdateRequired,

        // others
      }}
    >
      {children}
    </SharedContext.Provider>
  );
};
