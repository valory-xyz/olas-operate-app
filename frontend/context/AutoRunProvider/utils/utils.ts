import { isEmpty, sortBy } from 'lodash';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants';
import { Service } from '@/types';

import { AgentMeta, IncludedAgent } from '../types';

/**
 * Desktop notification informing the user that an agent was skipped
 * during an auto-run scan cycle (e.g. due to low balance, eviction, etc.).
 */
export const notifySkipped = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentName: string,
  reason?: string,
) => {
  showNotification?.(`Agent ${agentName} was skipped`, reason);
};

/**
 * Desktop notification when all start retries for an agent have been
 * exhausted and the rotation loop is moving on to the next candidate.
 */
export const notifyStartFailed = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentName: string,
) => {
  showNotification?.(`Failed to start ${agentName}`, 'Moving to next agent.');
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
 * Filters `includedAgents` to only those present in `allowedAgents`, then
 * sorts the result by the `order` field (ascending). Used to produce the
 * deterministic rotation sequence for auto-run.
 */
export const sortIncludedAgents = (
  includedAgents: IncludedAgent[],
  allowedAgents: AgentType[],
) => {
  if (isEmpty(includedAgents)) return [];
  const allowed = new Set(allowedAgents);
  return sortBy(
    includedAgents.filter((agent) => allowed.has(agent.agentType)),
    (item) => item.order,
  );
};

/**
 * Appends new agent types to the end of an existing `IncludedAgent[]` list by
 * assigning them order values that continue after the current maximum. Used
 * when newly onboarded agents are auto-added to the rotation.
 *
 * @example
 * - existing=[{order:0},{order:2}], newAgents=['optimus']
 * - [...existing, {agentType:'optimus', order:3}]
 */
export const appendNewAgents = (
  existing: IncludedAgent[],
  newAgents: AgentType[],
) => {
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((item) => item.order)) : -1;
  const appended = newAgents.map((agentType, index) => ({
    agentType,
    order: maxOrder + index + 1,
  }));
  return [...existing, ...appended];
};

/**
 * Deduplicates and re-sequences the `order` values in an `IncludedAgent[]`
 * list. Sorting is done first so the first occurrence of a duplicate agent
 * type is kept.
 *
 * @example
 * - [{agentType:'a',order:0},{agentType:'b',order:5},{agentType:'a',order:7}]
 * - [{agentType:'a',order:0},{agentType:'b',order:1}]  (duplicate 'a' removed, orders compacted)
 */
export const normalizeIncludedAgents = (includedAgents: IncludedAgent[]) => {
  if (isEmpty(includedAgents)) return [];
  const sorted = sortBy(includedAgents, (item) => item.order);
  const seen = new Set<AgentType>();
  const unique: IncludedAgent[] = [];

  for (const item of sorted) {
    if (seen.has(item.agentType)) continue;
    seen.add(item.agentType);
    unique.push(item);
  }

  return unique.map((item, index) => ({
    agentType: item.agentType,
    order: index,
  }));
};

export const getAgentDisplayName = (agentType: AgentType) =>
  AGENT_CONFIG[agentType]?.displayName ?? agentType;

/**
 * Returns the agent types from `configuredAgents` that are no longer available
 * for deployment. These agents are excluded from the auto-run rotation
 * and from the `includedAgents` list.
 */
export const getDecommissionedAgentTypes = (configuredAgents: AgentMeta[]) =>
  configuredAgents
    .filter(
      (agent) =>
        agent.agentConfig.isUnderConstruction ||
        agent.agentConfig.isAgentEnabled === false,
    )
    .map((agent) => agent.agentType);

export const getEligibleAgentTypes = (
  configuredAgentTypes: AgentType[],
  decommissionedAgentTypes: AgentType[],
) => {
  if (configuredAgentTypes.length === 0) return [];
  const blocked = new Set(decommissionedAgentTypes);
  return configuredAgentTypes.filter((agentType) => !blocked.has(agentType));
};

export const getOrderedIncludedAgentTypes = (
  includedAgentsSorted: { agentType: AgentType }[],
  eligibleAgentTypes: AgentType[],
) => {
  if (includedAgentsSorted.length > 0) {
    return includedAgentsSorted.map((agent) => agent.agentType);
  }
  return eligibleAgentTypes;
};

export const getExcludedAgentTypes = (
  configuredAgentTypes: AgentType[],
  orderedIncludedAgentTypes: AgentType[],
) => {
  const includedSet = new Set(orderedIncludedAgentTypes);
  return configuredAgentTypes.filter(
    (agentType) => !includedSet.has(agentType),
  );
};
