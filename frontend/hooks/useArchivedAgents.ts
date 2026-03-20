import { useCallback, useEffect, useMemo, useRef } from 'react';

import { AGENT_CONFIG } from '@/config/agents';
import { isServiceOfAgent } from '@/utils';

import { useElectronApi } from './useElectronApi';
import { useServices } from './useServices';
import { useStore } from './useStore';

/**
 * Manages the list of archived service instances (by serviceConfigId).
 *
 * Includes a one-time migration from the legacy `archivedAgents` (AgentType[])
 * store key to the new `archivedInstances` (string[]) key.
 */
export const useArchivedAgents = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { services } = useServices();

  const hasMigrated = useRef(false);

  const archivedInstances: string[] = useMemo(
    () => storeState?.archivedInstances ?? [],
    [storeState?.archivedInstances],
  );

  // One-time migration: expand legacy archivedAgents → archivedInstances
  useEffect(() => {
    if (hasMigrated.current) return;
    if (!services || services.length === 0) return;

    const legacyArchived = storeState?.archivedAgents;
    if (!legacyArchived || legacyArchived.length === 0) return;

    // Only migrate if archivedInstances is empty (first migration)
    if (
      storeState?.archivedInstances &&
      storeState.archivedInstances.length > 0
    )
      return;

    hasMigrated.current = true;

    const migratedIds: string[] = [];
    for (const agentType of legacyArchived) {
      const config = AGENT_CONFIG[agentType];
      if (!config) continue;
      const matching = services.filter((s) => isServiceOfAgent(s, config));
      for (const svc of matching) {
        migratedIds.push(svc.service_config_id);
      }
    }

    if (migratedIds.length > 0) {
      store?.set?.('archivedInstances', migratedIds);
    }
    // Clear legacy key
    store?.set?.('archivedAgents', []);
  }, [
    services,
    store,
    storeState?.archivedAgents,
    storeState?.archivedInstances,
  ]);

  const isArchived = useCallback(
    (serviceConfigId: string) => archivedInstances.includes(serviceConfigId),
    [archivedInstances],
  );

  const archiveInstance = useCallback(
    (serviceConfigId: string) => {
      if (archivedInstances.includes(serviceConfigId)) return;
      store?.set?.('archivedInstances', [
        ...archivedInstances,
        serviceConfigId,
      ]);
    },
    [store, archivedInstances],
  );

  const unarchiveInstance = useCallback(
    (serviceConfigId: string) => {
      store?.set?.(
        'archivedInstances',
        archivedInstances.filter((id) => id !== serviceConfigId),
      );
    },
    [store, archivedInstances],
  );

  return { archivedInstances, isArchived, archiveInstance, unarchiveInstance };
};
