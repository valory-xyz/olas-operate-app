import { MutableRefObject } from 'react';

import { AgentType } from '@/constants';
import { fetchAgentStakingRewardsInfo } from '@/utils/stakingRewards';

import { ELIGIBILITY_REASON, REWARDS_POLL_SECONDS } from '../constants';
import { AgentMeta } from '../types';

/**
 * Format eligibility into a human-readable reason for logs/UI.
 *  * @example
 * - { reason: 'Loading', loadingReason: 'Balances' } → "Loading: Balances"
 * - { reason: 'Low balance' }                         → "Low balance"
 * - {}                                                → "unknown"
 */
export const formatEligibilityReason = (eligibility: {
  reason?: string;
  loadingReason?: string;
}) => {
  if (
    eligibility.reason === ELIGIBILITY_REASON.LOADING &&
    eligibility.loadingReason
  ) {
    return `Loading: ${eligibility.loadingReason}`;
  }
  return eligibility.reason ?? 'unknown';
};

/**
 * Fetch staking reward eligibility for an agent, throttled per agent type.
 *  * @returns
 * - true      – agent has earned its staking rewards for the current epoch
 * - false     – agent has not yet earned rewards
 * - undefined  – agent not found in configuredAgents, missing required staking
 *               data (multisig / serviceNftTokenId / stakingProgramId), or
 *               the API call failed
 */
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

  //
  lastRewardsFetchRef.current[agentType] = now;
  const meta = configuredAgents.find((agent) => agent.agentType === agentType);
  if (!meta) return;
  if (!meta.multisig || !meta.serviceNftTokenId || !meta.stakingProgramId) {
    return;
  }

  try {
    const response = await fetchAgentStakingRewardsInfo({
      chainId: meta.chainId,
      multisig: meta.multisig,
      serviceNftTokenId: meta.serviceNftTokenId,
      stakingProgramId: meta.stakingProgramId,
      agentConfig: meta.agentConfig,
      onError: (error) =>
        logMessage(`rewards fetch error: ${agentType}: ${error}`),
    });
    const eligible = response?.isEligibleForRewards;
    if (typeof eligible === 'boolean') {
      setRewardSnapshot(agentType, eligible);
      return eligible;
    }
  } catch {
    // fetchAgentStakingRewardsInfo routes errors to onError and returns null.
  }
};

/**
 * Check if the only reason for ineligibility is a specific loading reason.
 * Useful for conditionally showing loading states in the UI.
 */
export const isOnlyLoadingReason = (
  eligibility: { reason?: string; loadingReason?: string },
  reason: string,
) => {
  if (eligibility.reason !== ELIGIBILITY_REASON.LOADING) return false;

  const reasons = eligibility.loadingReason
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return !!reasons && reasons.length === 1 && reasons[0] === reason;
};
