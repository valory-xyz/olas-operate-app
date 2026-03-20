import { useCallback, useRef } from 'react';

import { migrateAutoRunInstances } from '@/context/migrations/autoRunInstances';
import { useElectronApi, useServices, useStore } from '@/hooks';

import { IncludedAgentInstance } from '../types';

type AutoRunStoreState = {
  enabled: boolean;
  isInitialized: boolean;
  includedInstances: IncludedAgentInstance[];
  userExcludedInstances: string[];
};

const DEFAULT_AUTO_RUN: AutoRunStoreState = {
  enabled: false,
  isInitialized: false,
  includedInstances: [],
  userExcludedInstances: [],
};

/**
 * Persisted auto-run settings bridge.
 *
 * Reads/writes `includedAgentInstances` and `userExcludedAgentInstances`
 * (keyed by serviceConfigId). On first load, migrates from legacy
 * `includedAgents`/`userExcludedAgents` (keyed by AgentType).
 */
export const useAutoRunStore = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { services, getInstancesOfAgentType } = useServices();
  const autoRunRef = useRef(DEFAULT_AUTO_RUN);
  const hasMigratedRef = useRef(false);

  const autoRun = storeState?.autoRun;
  if (autoRun) {
    // Always read from the current store fields
    autoRunRef.current = {
      enabled: !!autoRun.enabled,
      isInitialized: autoRun.isInitialized ?? false,
      includedInstances: autoRun.includedAgentInstances ?? [],
      userExcludedInstances: autoRun.userExcludedAgentInstances ?? [],
    };

    // Run one-time migration from AgentType → serviceConfigId
    if (!hasMigratedRef.current && services?.length) {
      hasMigratedRef.current = true;
      const { includedInstances, userExcludedInstances, didMigrate } =
        migrateAutoRunInstances(
          autoRun as Record<string, unknown>,
          getInstancesOfAgentType,
        );

      if (didMigrate) {
        autoRunRef.current = {
          ...autoRunRef.current,
          includedInstances,
          userExcludedInstances,
        };
        store?.set?.('autoRun', {
          enabled: autoRunRef.current.enabled,
          isInitialized: autoRunRef.current.isInitialized,
          includedAgentInstances: includedInstances,
          userExcludedAgentInstances: userExcludedInstances,
          includedAgents: [],
          userExcludedAgents: [],
        });
      }
    }
  }

  const resolvedAutoRun = autoRunRef.current;
  const enabled = resolvedAutoRun.enabled;
  const includedInstances = resolvedAutoRun.includedInstances;
  const isInitialized = resolvedAutoRun.isInitialized;
  const userExcludedInstances = resolvedAutoRun.userExcludedInstances;

  const updateAutoRun = useCallback(
    (partial: Partial<AutoRunStoreState>) => {
      if (!store?.set) return;
      // Merge with latest snapshot so partial writes do not erase sibling fields.
      // Example: toggling `enabled` should not wipe `includedInstances`.
      const next = {
        enabled:
          partial.enabled ??
          autoRunRef.current.enabled ??
          DEFAULT_AUTO_RUN.enabled,
        isInitialized:
          partial.isInitialized ??
          autoRunRef.current.isInitialized ??
          DEFAULT_AUTO_RUN.isInitialized,
        includedAgentInstances:
          partial.includedInstances ??
          autoRunRef.current.includedInstances ??
          DEFAULT_AUTO_RUN.includedInstances,
        userExcludedAgentInstances:
          partial.userExcludedInstances ??
          autoRunRef.current.userExcludedInstances ??
          DEFAULT_AUTO_RUN.userExcludedInstances,
      };
      autoRunRef.current = {
        enabled: next.enabled,
        isInitialized: next.isInitialized,
        includedInstances: next.includedAgentInstances,
        userExcludedInstances: next.userExcludedAgentInstances,
      };
      store?.set?.('autoRun', next);
    },
    [store],
  );

  return {
    enabled,
    includedInstances,
    isInitialized,
    userExcludedInstances,
    updateAutoRun,
  };
};
