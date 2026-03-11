import { BigNumber } from 'ethers';
import { MutableRefObject } from 'react';

import { AgentType } from '@/constants';
import { isValidServiceId } from '@/utils/service';
import { fetchAgentStakingRewardsInfo } from '@/utils/stakingRewards';

import {
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  REWARDS_POLL_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';

/**
 * Returns true when the staking epoch has expired but no on-chain checkpoint
 * has been called yet (i.e. livenessPeriod seconds have elapsed since tsCheckpoint).
 *
 * Used to normalize `isEligibleForRewards` to false so auto-run doesn't skip
 * all agents and stall until someone manually triggers the next checkpoint.
 */
export const isStakingEpochExpired = ({
  livenessPeriod,
  tsCheckpoint,
}: {
  livenessPeriod: { _isBigNumber: boolean; _hex: string };
  tsCheckpoint: number;
}): boolean => {
  const livenessPeriodSeconds = BigNumber.from(livenessPeriod).toNumber();
  if (livenessPeriodSeconds <= 0) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return nowInSeconds - tsCheckpoint >= livenessPeriodSeconds;
};

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
  onRewardsFetchError,
}: {
  agentType: AgentType;
  configuredAgents: AgentMeta[];
  lastRewardsFetchRef: MutableRefObject<Partial<Record<AgentType, number>>>;
  getRewardSnapshot: (agentType: AgentType) => boolean | undefined;
  setRewardSnapshot: (agentType: AgentType, value: boolean | undefined) => void;
  logMessage: (message: string) => void;
  onRewardsFetchError?: () => void;
}) => {
  const now = Date.now();
  const lastFetch = lastRewardsFetchRef.current[agentType] ?? 0;
  if (now - lastFetch < REWARDS_POLL_SECONDS * 1000) {
    return getRewardSnapshot(agentType);
  }

  lastRewardsFetchRef.current[agentType] = now;
  const meta = configuredAgents.find((agent) => agent.agentType === agentType);
  if (!meta) return;
  if (
    !meta.multisig ||
    !isValidServiceId(meta.serviceNftTokenId) ||
    !meta.stakingProgramId
  ) {
    return;
  }

  try {
    const response = await fetchAgentStakingRewardsInfo({
      chainId: meta.chainId,
      multisig: meta.multisig,
      serviceNftTokenId: meta.serviceNftTokenId,
      stakingProgramId: meta.stakingProgramId,
      agentConfig: meta.agentConfig,
      onError: (error) => {
        onRewardsFetchError?.();
        logMessage(`rewards fetch error: ${agentType}: ${error}`);
      },
    });
    if (!response) return;

    const epochExpired = isStakingEpochExpired(response);
    if (epochExpired && response.isEligibleForRewards) {
      logMessage(
        `${agentType}: epoch expired, stale isEligibleForRewards=true overridden to false so agent runs and triggers on-chain checkpoint`,
      );
    }
    // isEligibleForRewards=true → agent already earned this epoch → auto-run SKIPS it.
    // isEligibleForRewards=false → agent hasn't earned yet → auto-run STARTS it.
    // Epoch expired but checkpoint not yet called: true is stale, override to false so
    // auto-run starts the agent and triggers the on-chain checkpoint for the new epoch.
    const eligible = epochExpired ? false : response.isEligibleForRewards;
    if (typeof eligible === 'boolean') {
      setRewardSnapshot(agentType, eligible);
      return eligible;
    }
  } catch {
    // fetchAgentStakingRewardsInfo routes errors to onError and returns null.
  }
};

/**
 * Normalize deployability output into auto-run behavior.
 *
 * Key policies:
 * - `Another agent running` is treated as transient loading so the scanner
 *   retries rather than blocking.
 * - Stale `Loading: Balances` is promoted to runnable when global balances are
 *   already ready, avoiding a false block during the brief re-render window.
 *
 * @example
 * normalizeEligibility({ canRun: false, reason: 'Loading', loadingReason: 'Balances' }, () => ({ ready: true, loading: false }))
 * // => { canRun: true }
 */
export const normalizeEligibility = (
  eligibility: { canRun: boolean; reason?: string; loadingReason?: string },
  getBalancesStatus: () => { ready: boolean; loading: boolean },
): { canRun: boolean; reason?: string; loadingReason?: string } => {
  if (eligibility.reason === ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING) {
    return {
      canRun: false,
      reason: ELIGIBILITY_REASON.LOADING,
      loadingReason: ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING,
    };
  }
  if (!isOnlyLoadingReason(eligibility, ELIGIBILITY_LOADING_REASON.BALANCES)) {
    return eligibility;
  }
  const balances = getBalancesStatus();
  if (balances.ready && !balances.loading) {
    return { canRun: true };
  }
  return eligibility;
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
