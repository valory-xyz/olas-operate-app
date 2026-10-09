import { useCallback, useRef } from 'react';

import { AgentMap } from '@/constants/agent';
import { prepareConnectAutoRunMigration } from '@/context/migrations/autoRunConnectInstances';
import { prepateAutoRunInstancesForMigration } from '@/context/migrations/autoRunInstances';
import { useElectronApi, useServices, useStore } from '@/hooks';

import { IncludedAgentInstance } from '../types';

type AutoRunStoreState = {
  enabled: boolean;
  isInitialized: boolean;
  includedInstances: IncludedAgentInstance[];
  userExcludedInstances: string[];
  connectAutoRunMigrated: boolean;
};

const DEFAULT_AUTO_RUN: AutoRunStoreState = {
  enabled: false,
  isInitialized: false,
  includedInstances: [],
  userExcludedInstances: [],
  connectAutoRunMigrated: false,
};

/** Store shape of the `autoRun` key for a resolved state. */
const toStoredAutoRun = (state: AutoRunStoreState) => ({
  enabled: state.enabled,
  isInitialized: state.isInitialized,
  includedAgentInstances: state.includedInstances,
  userExcludedAgentInstances: state.userExcludedInstances,
  connectAutoRunMigrated: state.connectAutoRunMigrated,
});

/**
 * Persisted auto-run settings bridge.
 *
 * Reads/writes `includedAgentInstances` and `userExcludedAgentInstances`
 * (keyed by serviceConfigId). On first load, migrates from legacy
 * `includedAgents`/`userExcludedAgents` (keyed by AgentType), and once
 * excludes the Connect instances that predate Connect's Auto-run support.
 */
export const useAutoRunStore = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { services, getInstancesOfAgentType } = useServices();
  const autoRunRef = useRef(DEFAULT_AUTO_RUN);
  const hasMigratedRef = useRef(false);
  const hasMigratedConnectRef = useRef(false);

  // Only read from storeState after hydration (storeState is defined).
  // Before hydration, autoRunRef keeps DEFAULT_AUTO_RUN with isInitialized=false,
  // but storeLoaded=false prevents any write-back that would overwrite real data.
  const storeLoaded = storeState !== undefined;
  const autoRun = storeState?.autoRun;
  if (autoRun) {
    // Always read from the current store fields
    autoRunRef.current = {
      enabled: !!autoRun.enabled,
      isInitialized: autoRun.isInitialized ?? false,
      includedInstances: autoRun.includedAgentInstances ?? [],
      userExcludedInstances: autoRun.userExcludedAgentInstances ?? [],
      connectAutoRunMigrated: !!autoRun.connectAutoRunMigrated,
    };

    // Run one-time migration from AgentType → serviceConfigId
    if (!hasMigratedRef.current && services?.length) {
      hasMigratedRef.current = true;
      const { includedInstances, userExcludedInstances, didMigrate } =
        prepateAutoRunInstancesForMigration(
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
          ...toStoredAutoRun(autoRunRef.current),
          includedAgents: [],
          userExcludedAgents: [],
        });
      }
    }
  }

  // One-time Connect migration. Runs during render, before the provider's
  // seed and auto-append effects read the lists, and only once `services` has
  // loaded so every pre-existing Connect instance is known.
  if (
    storeLoaded &&
    services &&
    !hasMigratedConnectRef.current &&
    !autoRunRef.current.connectAutoRunMigrated
  ) {
    hasMigratedConnectRef.current = true;
    const { userExcludedInstances, shouldMigrate } =
      prepareConnectAutoRunMigration(
        {
          connectAutoRunMigrated: autoRunRef.current.connectAutoRunMigrated,
          userExcludedAgentInstances: autoRunRef.current.userExcludedInstances,
        },
        getInstancesOfAgentType(AgentMap.Connect).map(
          (service) => service.service_config_id,
        ),
      );
    if (shouldMigrate) {
      autoRunRef.current = {
        ...autoRunRef.current,
        userExcludedInstances,
        connectAutoRunMigrated: true,
      };
      store?.set?.('autoRun', toStoredAutoRun(autoRunRef.current));
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
      const next: AutoRunStoreState = {
        enabled:
          partial.enabled ??
          autoRunRef.current.enabled ??
          DEFAULT_AUTO_RUN.enabled,
        isInitialized:
          partial.isInitialized ??
          autoRunRef.current.isInitialized ??
          DEFAULT_AUTO_RUN.isInitialized,
        includedInstances:
          partial.includedInstances ??
          autoRunRef.current.includedInstances ??
          DEFAULT_AUTO_RUN.includedInstances,
        userExcludedInstances:
          partial.userExcludedInstances ??
          autoRunRef.current.userExcludedInstances ??
          DEFAULT_AUTO_RUN.userExcludedInstances,
        connectAutoRunMigrated:
          partial.connectAutoRunMigrated ??
          autoRunRef.current.connectAutoRunMigrated ??
          DEFAULT_AUTO_RUN.connectAutoRunMigrated,
      };
      autoRunRef.current = next;
      store?.set?.('autoRun', toStoredAutoRun(next));
    },
    [store],
  );

  return {
    storeLoaded,
    enabled,
    includedInstances,
    isInitialized,
    userExcludedInstances,
    updateAutoRun,
  };
};
