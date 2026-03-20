import { isEmpty } from 'lodash';

import { AgentType } from '@/constants';
import { IncludedAgentInstance } from '@/context/AutoRunProvider/types';
import { MiddlewareServiceResponse } from '@/types';

type AutoRunMigrationResult = {
  includedInstances: IncludedAgentInstance[];
  userExcludedInstances: string[];
  didMigrate: boolean;
};

/**
 * Prepares the legacy AgentType-keyed auto-run data to serviceConfigId-keyed for migration.
 *
 * - `includedAgents` → `includedAgentInstances`
 * - `userExcludedAgents` → `userExcludedAgentInstances`
 *
 * Returns `didMigrate: false` when old fields are absent or empty.
 */
export const prepateAutoRunInstancesForMigration = (
  autoRun: Record<string, unknown>,
  getInstancesOfAgentType: (
    agentType: AgentType,
  ) => MiddlewareServiceResponse[],
): AutoRunMigrationResult => {
  const oldIncluded = autoRun.includedAgents as
    | { agentType: string; order: number }[]
    | undefined;
  const oldExcluded = autoRun.userExcludedAgents as string[] | undefined;
  const existingInstances = autoRun.includedAgentInstances as
    | IncludedAgentInstance[]
    | undefined;
  const existingExcluded = autoRun.userExcludedAgentInstances as
    | string[]
    | undefined;

  // Already migrated or no old data
  if (isEmpty(oldIncluded) && isEmpty(oldExcluded)) {
    return {
      includedInstances: existingInstances ?? [],
      userExcludedInstances: existingExcluded ?? [],
      didMigrate: false,
    };
  }

  // Migrate includedAgents → includedAgentInstances
  const migratedIncluded: IncludedAgentInstance[] = [];
  if (oldIncluded) {
    for (const { agentType, order } of oldIncluded) {
      const instances = getInstancesOfAgentType(agentType as AgentType);
      for (const instance of instances) {
        const id = instance.service_config_id;
        if (!migratedIncluded.some((item) => item.serviceConfigId === id)) {
          migratedIncluded.push({ serviceConfigId: id, order });
        }
      }
    }
  }

  // Migrate userExcludedAgents → userExcludedAgentInstances
  const migratedExcluded: string[] = [];
  if (oldExcluded) {
    for (const agentType of oldExcluded) {
      const instances = getInstancesOfAgentType(agentType as AgentType);
      for (const instance of instances) {
        const id = instance.service_config_id;
        if (!migratedExcluded.includes(id)) {
          migratedExcluded.push(id);
        }
      }
    }
  }

  return {
    includedInstances:
      migratedIncluded.length > 0
        ? migratedIncluded
        : (existingInstances ?? []),
    userExcludedInstances:
      migratedExcluded.length > 0 ? migratedExcluded : (existingExcluded ?? []),
    didMigrate: true,
  };
};
