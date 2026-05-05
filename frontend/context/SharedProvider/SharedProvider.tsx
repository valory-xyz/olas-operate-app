import { useQuery } from '@tanstack/react-query';
import { createContext, PropsWithChildren, useEffect, useState } from 'react';

import { AgentMap, REACT_QUERY_KEYS } from '@/constants';
import { useServices } from '@/hooks/useServices';
import { RecoveryService } from '@/service/Recovery';

import { useOnlineStatus } from '../OnlineStatusProvider';

export const SharedContext = createContext<{
  // agent specific checks
  isAgentsFunFieldUpdateRequired: boolean;

  // recovery
  isAccountRecoveryStatusLoading?: boolean;
  hasActiveRecoverySwap?: boolean;

  // session state (cleared on app restart)
  mnemonicExists: boolean | undefined;
  setMnemonicExists: (exists: boolean) => void;
}>({
  // agent specific checks
  isAgentsFunFieldUpdateRequired: false,

  // recovery
  isAccountRecoveryStatusLoading: true,
  hasActiveRecoverySwap: false,

  // session state (cleared on app restart)
  mnemonicExists: undefined,
  setMnemonicExists: () => {},
});

/**
 * Shared provider to provide shared context to all components in the app.
 * @example
 * - Track the onboarding step of the user (independent of the agent).
 * - Track the healthcheck alert shown to the user (so that they are not shown again).
 */
export const SharedProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useOnlineStatus();

  // session state — not persisted, cleared on app restart
  const [mnemonicExists, setMnemonicExists] = useState<boolean | undefined>(
    undefined,
  );

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

  // fetch only if online and just once on mount
  const {
    data: hasActiveRecoverySwap,
    isLoading: isAccountRecoveryStatusLoading,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.RECOVERY_STATUS_KEY,
    queryFn: ({ signal }) => RecoveryService.getRecoveryStatus(signal),
    enabled: isOnline,
    select: (data) => !!data.has_swaps,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  return (
    <SharedContext.Provider
      value={{
        // agent specific checks
        isAgentsFunFieldUpdateRequired,

        // recovery
        isAccountRecoveryStatusLoading,
        hasActiveRecoverySwap,

        // session state (cleared on app restart)
        mnemonicExists,
        setMnemonicExists,
      }}
    >
      {children}
    </SharedContext.Provider>
  );
};
