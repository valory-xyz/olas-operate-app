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
 * Persisted auto-run settings bridge.
 *
 * Example:
 * - user excludes `polystrat`
 * - settings are written to Electron store
 * - app restart loads the same included/excluded state from this hook
 */
export const useAutoRunStore = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const autoRunRef = useRef(DEFAULT_AUTO_RUN);

  const autoRun = storeState?.autoRun;
  if (autoRun) {
    // Keep an always-defined local snapshot to avoid undefined checks in callers.
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
      // Merge with latest snapshot so partial writes do not erase sibling fields.
      // Example: toggling `enabled` should not wipe `includedAgents`.
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
