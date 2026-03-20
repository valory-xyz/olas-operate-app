import { useCallback, useMemo } from 'react';

import { AgentType } from '@/constants';

import { useElectronApi } from './useElectronApi';
import { useStore } from './useStore';

export const useArchivedAgents = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const archivedAgents: AgentType[] = useMemo(
    () => storeState?.archivedAgents ?? [],
    [storeState?.archivedAgents],
  );

  const isArchived = useCallback(
    (agentType: AgentType) => archivedAgents.includes(agentType),
    [archivedAgents],
  );

  const archiveAgent = useCallback(
    (agentType: AgentType) => {
      if (archivedAgents.includes(agentType)) return;
      store?.set?.('archivedAgents', [...archivedAgents, agentType]);
    },
    [store, archivedAgents],
  );

  const unarchiveAgent = useCallback(
    (agentType: AgentType) => {
      store?.set?.(
        'archivedAgents',
        archivedAgents.filter((a) => a !== agentType),
      );
    },
    [store, archivedAgents],
  );

  return { archivedAgents, isArchived, archiveAgent, unarchiveAgent };
};
