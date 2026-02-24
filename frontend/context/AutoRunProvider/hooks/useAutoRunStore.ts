import { useCallback, useRef } from 'react';

import { AgentType } from '@/constants';
import { useElectronApi, useStore } from '@/hooks';

const DEFAULT_AUTO_RUN: {
  enabled: boolean;
  currentAgent: AgentType | null;
  includedAgents: { agentType: AgentType; order: number }[];
  isInitialized: boolean;
} = {
  enabled: false,
  currentAgent: null,
  includedAgents: [],
  isInitialized: false,
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
      ...DEFAULT_AUTO_RUN,
      ...autoRun,
    };
  }
  const resolvedAutoRun = autoRunRef.current;
  const enabled = !!resolvedAutoRun.enabled;
  const includedAgents = resolvedAutoRun.includedAgents ?? [];
  const currentAgent = resolvedAutoRun.currentAgent ?? null;
  const isInitialized = resolvedAutoRun.isInitialized ?? false;

  const updateAutoRun = useCallback(
    (partial: Partial<NonNullable<typeof autoRun>>) => {
      if (!store?.set) return;
      const next = {
        ...DEFAULT_AUTO_RUN,
        ...autoRunRef.current,
        ...partial,
      };
      autoRunRef.current = next;
      store?.set?.('autoRun', next);
    },
    [store],
  );

  return {
    enabled,
    includedAgents,
    currentAgent,
    isInitialized,
    updateAutoRun,
  };
};
