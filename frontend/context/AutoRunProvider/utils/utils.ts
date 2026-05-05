import { isEmpty, sortBy } from 'lodash';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants';
import { Service } from '@/types';
import { getServiceInstanceName } from '@/utils/service';

import { AgentMeta, IncludedAgentInstance } from '../types';

/**
 * Desktop notification informing the user that an instance was skipped
 * during an auto-run scan cycle (e.g. due to low balance, eviction, etc.).
 *
 * @example notifySkipped(show, "Polystrat", "corzim-vardor96", "Low balance")
 * // → title: 'Polystrat agent "corzim-vardor96" was skipped'
 * // → body:  'Low balance'
 */
export const notifySkipped = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentDisplayName: string,
  instanceName: string,
  reason?: string,
) => {
  showNotification?.(
    `${agentDisplayName} agent "${instanceName}" was skipped`,
    reason,
  );
};

/**
 * Desktop notification when all start retries for an instance have been
 * exhausted and the rotation loop is moving on to the next candidate.
 *
 * @example notifyStartFailed(show, "Optimus", "nekfam-nushim36")
 * // → title: 'Failed to start Optimus agent "nekfam-nushim36"'
 */
export const notifyStartFailed = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentDisplayName: string,
  instanceName: string,
) => {
  showNotification?.(
    `Failed to start ${agentDisplayName} agent "${instanceName}"`,
    'Moving to next agent.',
  );
};

/**
 * Resolves the ACTIVE_AGENTS config entry that corresponds to a running
 * service instance by matching both `servicePublicId` and
 * `middlewareHomeChainId`. Returns the `[AgentType, AgentConfig]` tuple, or
 * `undefined` if no match is found.
 */
export const getAgentFromService = (service: Service) => {
  return ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.servicePublicId === service.service_public_id &&
      agentConfig.middlewareHomeChainId === service.home_chain,
  );
};

/**
 * Filters `includedInstances` to only those present in `allowedInstances`, then
 * sorts the result by the `order` field (ascending). Used to produce the
 * deterministic rotation sequence for auto-run.
 */
export const sortIncludedInstances = (
  includedInstances: IncludedAgentInstance[],
  allowedInstances: string[],
) => {
  if (isEmpty(includedInstances)) return [];
  const allowed = new Set(allowedInstances);
  return sortBy(
    includedInstances.filter((instance) =>
      allowed.has(instance.serviceConfigId),
    ),
    (item) => item.order,
  );
};

/**
 * Appends new instances to the end of an existing list by
 * assigning them order values that continue after the current maximum.
 * Used when newly onboarded instances are auto-added to the rotation.
 *
 * @example
 * - existing=[{serviceConfigId:'sc-aaa',order:0},{serviceConfigId:'sc-bbb',order:2}]
 * - newInstances=['sc-ccc']
 * - result=[...existing, {serviceConfigId:'sc-ccc', order:3}]
 */
export const appendNewInstances = (
  existing: IncludedAgentInstance[],
  newInstances: string[],
) => {
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((item) => item.order)) : -1;
  const appended = newInstances.map((serviceConfigId, index) => ({
    serviceConfigId,
    order: maxOrder + index + 1,
  }));
  return [...existing, ...appended];
};

/**
 * Deduplicates and re-sequences the `order` values in an `IncludedAgentInstance[]`
 * list. Sorting is done first so the first occurrence of a duplicate is kept.
 *
 * @example
 * - [{serviceConfigId:'sc-aaa',order:0},{serviceConfigId:'sc-bbb',order:5},{serviceConfigId:'sc-aaa',order:7}]
 * - result: [{serviceConfigId:'sc-aaa',order:0},{serviceConfigId:'sc-bbb',order:1}]  (duplicate removed, orders compacted)
 */
export const normalizeIncludedInstances = (
  includedInstances: IncludedAgentInstance[],
) => {
  if (isEmpty(includedInstances)) return [];
  const sorted = sortBy(includedInstances, (item) => item.order);
  const seen = new Set<string>();
  const unique: IncludedAgentInstance[] = [];

  for (const item of sorted) {
    if (seen.has(item.serviceConfigId)) continue;
    seen.add(item.serviceConfigId);
    unique.push(item);
  }

  return unique.map((item, index) => ({
    serviceConfigId: item.serviceConfigId,
    order: index,
  }));
};

export const getAgentDisplayName = (agentType: AgentType) =>
  AGENT_CONFIG[agentType]?.displayName ?? agentType;

/**
 * Returns `{ agentName, instanceName }` for notification messages.
 */
export const getInstanceDisplayNames = (
  serviceConfigId: string,
  configuredAgents: AgentMeta[],
): { agentName: string; instanceName: string } => {
  const meta = configuredAgents.find(
    (agent) => agent.serviceConfigId === serviceConfigId,
  );
  if (!meta)
    return { agentName: serviceConfigId, instanceName: serviceConfigId };

  const instanceName = getServiceInstanceName(
    meta.service,
    meta.agentConfig.displayName,
    meta.agentConfig.evmHomeChainId,
  );

  return { agentName: meta.agentConfig.displayName, instanceName };
};

/**
 * Returns the service config IDs from `configuredAgents` that are no longer
 * available for deployment.
 */
export const getDecommissionedInstances = (configuredAgents: AgentMeta[]) =>
  configuredAgents
    .filter(
      (agent) =>
        agent.agentConfig.isUnderConstruction ||
        agent.agentConfig.isAgentEnabled === false,
    )
    .map((agent) => agent.serviceConfigId);

export const getEligibleInstances = (
  configuredInstances: string[],
  decommissionedInstances: string[],
) => {
  if (configuredInstances.length === 0) return [];
  const blocked = new Set(decommissionedInstances);
  return configuredInstances.filter((id) => !blocked.has(id));
};

export const getOrderedIncludedInstances = (
  includedInstancesSorted: { serviceConfigId: string }[],
  eligibleInstances: string[],
) => {
  if (includedInstancesSorted.length > 0) {
    return includedInstancesSorted.map((inst) => inst.serviceConfigId);
  }
  return eligibleInstances;
};

export const getExcludedInstances = (
  configuredInstances: string[],
  orderedIncludedInstances: string[],
) => {
  const includedSet = new Set(orderedIncludedInstances);
  return configuredInstances.filter((id) => !includedSet.has(id));
};
