import { isEmpty, isNil, sortBy } from 'lodash';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import { AgentMap, AgentType, GEO_ELIGIBILITY_API_URL } from '@/constants';
import {
  Service,
  ServiceStakingDetails,
  StakingContractDetails,
  StakingState,
} from '@/types';

import { GeoEligibilityResponse, IncludedAgent } from './types';

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

export const fetchGeoEligibility = async (
  signal: AbortSignal,
): Promise<GeoEligibilityResponse> => {
  const response = await fetch(GEO_ELIGIBILITY_API_URL, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch geo eligibility: ${response.status}`);
  }
  return response.json();
};

export const getAgentFromService = (service: Service) => {
  return ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.servicePublicId === service.service_public_id &&
      agentConfig.middlewareHomeChainId === service.home_chain,
  );
};

export const getServiceStakingEligibility = ({
  stakingDetails,
  contractDetails,
}: {
  stakingDetails?: ServiceStakingDetails | null;
  contractDetails?: Partial<StakingContractDetails> | null;
}) => {
  const serviceStakingState = stakingDetails?.serviceStakingState;
  const serviceStakingStartTime = stakingDetails?.serviceStakingStartTime;
  const minimumStakingDuration = contractDetails?.minimumStakingDuration;
  const serviceIds = contractDetails?.serviceIds;
  const maxNumServices = contractDetails?.maxNumServices;

  const isAgentEvicted = serviceStakingState === StakingState.Evicted;
  const isServiceStaked = serviceStakingState === StakingState.Staked;
  const now = Math.round(Date.now() / 1000);
  const isServiceStakedForMinimumDuration =
    !isNil(serviceStakingStartTime) &&
    !isNil(minimumStakingDuration) &&
    now - serviceStakingStartTime >= minimumStakingDuration;

  const isEligibleForStaking =
    !isAgentEvicted || isServiceStakedForMinimumDuration;

  const hasEnoughServiceSlots =
    isNil(serviceIds) || isNil(maxNumServices)
      ? null
      : serviceIds.length < maxNumServices;

  return {
    isAgentEvicted,
    isEligibleForStaking,
    isServiceStaked,
    hasEnoughServiceSlots,
  };
};

export const isAgentsFunFieldUpdateRequired = (service: Service) => {
  const areFieldsUpdated = [
    'TWEEPY_CONSUMER_API_KEY',
    'TWEEPY_CONSUMER_API_KEY_SECRET',
    'TWEEPY_BEARER_TOKEN',
    'TWEEPY_ACCESS_TOKEN',
    'TWEEPY_ACCESS_TOKEN_SECRET',
  ].every((key) => service.env_variables?.[key]?.value);

  return !areFieldsUpdated;
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

export const getAgentDisplayName = (agentType: AgentType) =>
  AGENT_CONFIG[agentType]?.displayName ?? agentType;

export const isAgentsFunAgent = (agentType: AgentType) =>
  agentType === AgentMap.AgentsFun;
