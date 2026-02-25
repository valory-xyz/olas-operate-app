import { MutableRefObject } from 'react';

import { AgentType } from '@/constants';

import { REWARDS_POLL_SECONDS } from '../constants';
import { AgentMeta } from '../types';

export const formatEligibilityReason = (eligibility: {
  reason?: string;
  loadingReason?: string;
}) => {
  if (eligibility.reason === 'Loading' && eligibility.loadingReason) {
    return `Loading: ${eligibility.loadingReason}`;
  }
  return eligibility.reason ?? 'unknown';
};

export const refreshRewardsEligibility = async ({
  agentType,
  configuredAgents,
  lastRewardsFetchRef,
  getRewardSnapshot,
  setRewardSnapshot,
  logMessage,
}: {
  agentType: AgentType;
  configuredAgents: AgentMeta[];
  lastRewardsFetchRef: MutableRefObject<Partial<Record<AgentType, number>>>;
  getRewardSnapshot: (agentType: AgentType) => boolean | undefined;
  setRewardSnapshot: (agentType: AgentType, value: boolean | undefined) => void;
  logMessage: (message: string) => void;
}) => {
  const now = Date.now();
  const lastFetch = lastRewardsFetchRef.current[agentType] ?? 0;
  if (now - lastFetch < REWARDS_POLL_SECONDS * 1000) {
    return getRewardSnapshot(agentType);
  }

  lastRewardsFetchRef.current[agentType] = now;
  const meta = configuredAgents.find((agent) => agent.agentType === agentType);
  if (!meta) return undefined;
  if (!meta.multisig || !meta.serviceNftTokenId || !meta.stakingProgramId) {
    return undefined;
  }

  try {
    const response =
      await meta.agentConfig.serviceApi.getAgentStakingRewardsInfo({
        agentMultisigAddress: meta.multisig,
        serviceId: meta.serviceNftTokenId,
        stakingProgramId: meta.stakingProgramId,
        chainId: meta.chainId,
      });
    const eligible = response?.isEligibleForRewards;
    if (typeof eligible === 'boolean') {
      setRewardSnapshot(agentType, eligible);
      return eligible;
    }
  } catch (error) {
    logMessage(`rewards fetch error: ${agentType}: ${error}`);
  }

  return undefined;
};
