import { isEmpty, sortBy } from 'lodash';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentType } from '@/constants';
import { Service } from '@/types';

import { IncludedAgent } from './types';

export const logAutoRun = (
  logEvent: ((message: string) => void) | undefined,
  prefix: string,
  message: string,
) => {
  logEvent?.(`${prefix} ${message}`);
};

export const notifySkipped = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentName: string,
  reason?: string,
) => {
  showNotification?.(`Agent ${agentName} was skipped`, reason);
};

export const notifyStartFailed = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentName: string,
) => {
  showNotification?.(`Failed to start ${agentName}`, 'Moving to next agent.');
};

export const getAgentFromService = (service: Service) => {
  return ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.servicePublicId === service.service_public_id &&
      agentConfig.middlewareHomeChainId === service.home_chain,
  );
};

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

export const buildIncludedAgentsFromOrder = (agentTypes: AgentType[]) =>
  agentTypes.map((agentType, index) => ({ agentType, order: index }));

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
