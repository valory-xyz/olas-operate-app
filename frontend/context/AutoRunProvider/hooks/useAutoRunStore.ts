import { useCallback } from 'react';

import { useElectronApi, useStore } from '@/hooks';

/**
 * Custom hook to manage the auto-run state.
 */
export const useAutoRunStore = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const autoRun = storeState?.autoRun;
  const enabled = !!autoRun?.enabled;
  const includedAgents = autoRun?.includedAgents ?? [];
  const currentAgent = autoRun?.currentAgent ?? null;

  const updateAutoRun = useCallback(
    (partial: Partial<NonNullable<typeof autoRun>>) => {
      if (!store?.set) return;
      store.set('autoRun', {
        enabled: autoRun?.enabled ?? false,
        currentAgent: autoRun?.currentAgent ?? null,
        includedAgents: autoRun?.includedAgents ?? [],
        ...partial,
      });
    },
    [autoRun?.currentAgent, autoRun?.enabled, autoRun?.includedAgents, store],
  );

  return { enabled, includedAgents, currentAgent, updateAutoRun };
};
