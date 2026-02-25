import { useCallback, useRef } from 'react';

import { AgentType } from '@/constants';
import { useElectronApi, useStore } from '@/hooks';

const DEFAULT_AUTO_RUN: {
  enabled: boolean;
  isInitialized: boolean;
  includedAgents: { agentType: AgentType; order: number }[];
  userExcludedAgents: AgentType[];
} = {
  enabled: false,
  isInitialized: false,
  includedAgents: [],
  userExcludedAgents: [],
};

/**
 * Custom hook to manage the auto-run state.
 */
export const useAutoRunStore = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const autoRun = storeState?.autoRun;
  const autoRunRef = useRef(DEFAULT_AUTO_RUN);
  if (autoRun) {
    autoRunRef.current = {
      enabled: !!autoRun.enabled,
      includedAgents: autoRun.includedAgents ?? [],
      isInitialized: autoRun.isInitialized ?? false,
      userExcludedAgents: autoRun.userExcludedAgents ?? [],
    };
  }
  const resolvedAutoRun = autoRunRef.current;
  const enabled = resolvedAutoRun.enabled;
  const includedAgents = resolvedAutoRun.includedAgents;
  const isInitialized = resolvedAutoRun.isInitialized;
  const userExcludedAgents = resolvedAutoRun.userExcludedAgents;

  const updateAutoRun = useCallback(
    (partial: Partial<typeof DEFAULT_AUTO_RUN>) => {
      if (!store?.set) return;
      // Merge with the latest stored snapshot so we don't drop fields when only
      // a subset of auto-run settings is updated.
      const next = {
        enabled:
          partial.enabled ??
          autoRunRef.current.enabled ??
          DEFAULT_AUTO_RUN.enabled,
        isInitialized:
          partial.isInitialized ??
          autoRunRef.current.isInitialized ??
          DEFAULT_AUTO_RUN.isInitialized,
        includedAgents:
          partial.includedAgents ??
          autoRunRef.current.includedAgents ??
          DEFAULT_AUTO_RUN.includedAgents,
        userExcludedAgents:
          partial.userExcludedAgents ??
          autoRunRef.current.userExcludedAgents ??
          DEFAULT_AUTO_RUN.userExcludedAgents,
      };
      autoRunRef.current = next;
      store?.set?.('autoRun', next);
    },
    [store],
  );

  return {
    enabled,
    includedAgents,
    isInitialized,
    userExcludedAgents,
    updateAutoRun,
  };
};
