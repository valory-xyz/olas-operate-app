import { BigNumber } from 'ethers';
import { isNil } from 'lodash';
import { MutableRefObject } from 'react';

import { AgentType, EvmChainId } from '@/constants';
import { StakingRewardsInfo, StakingState } from '@/types';
import { sleepAwareDelay } from '@/utils/delay';
import { isValidServiceId } from '@/utils/service';
import { fetchAgentStakingRewardsInfo } from '@/utils/stakingRewards';

import {
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  AUTO_RUN_HEALTH_METRIC,
  AutoRunScannerMetric,
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  REWARDS_POLL_SECONDS,
  REWARDS_RETRY_DELAY_SECONDS,
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
}: Pick<StakingRewardsInfo, 'livenessPeriod' | 'tsCheckpoint'>): boolean => {
  try {
    const livenessPeriodBN = BigNumber.from(livenessPeriod);
    if (livenessPeriodBN.lte(0)) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    // Epoch expired when time elapsed since last checkpoint >= liveness period.
    // Comparison done in BigNumber to avoid toNumber() overflow on large values.
    return livenessPeriodBN.lte(nowInSeconds - tsCheckpoint);
  } catch {
    // Malformed livenessPeriod: fail closed (treat as not expired).
    return false;
  }
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
 * Fetch staking reward eligibility for an instance, throttled per serviceConfigId.
 *
 * Retries once on transient RPC failure (null response) before marking the
 * snapshot as unknown. `onRewardsFetchError` fires only on the final failure
 * so the health-summary metric doesn't double-count a single transient blip.
 *
 * When `lastStartedAtRef` and `runningServiceConfigIdRef` are provided and the
 * target is NOT the currently-running agent, a stale on-chain
 * `isEligibleForRewards=true` is overridden to `false` if the service has not
 * been started locally since the last on-chain checkpoint. This addresses the
 * deadlock where an idle alternate keeps reporting `true` indefinitely because
 * its nonce delta from a prior active run persists on-chain. The running agent
 * is excluded from this override because its signal is what triggers rotation.
 *
 * @returns
 * - true      – agent has earned its staking rewards for the current epoch
 * - false     – agent has not yet earned rewards
 * - undefined  – instance not found in configuredAgents, missing required staking
 *               data (multisig / serviceNftTokenId / stakingProgramId), the API
 *               call failed on both attempts, or the wait between retries was
 *               interrupted by disable / sleep-wake drift
 */
export const refreshRewardsEligibility = async ({
  serviceConfigId,
  configuredAgents,
  lastRewardsFetchRef,
  lastStartedAtRef,
  runningServiceConfigIdRef,
  getRewardSnapshot,
  setRewardSnapshot,
  logMessage,
  onRewardsFetchError,
}: {
  serviceConfigId: string;
  configuredAgents: AgentMeta[];
  lastRewardsFetchRef: MutableRefObject<Partial<Record<string, number>>>;
  lastStartedAtRef?: MutableRefObject<Partial<Record<string, number>>>;
  runningServiceConfigIdRef?: MutableRefObject<string | null>;
  getRewardSnapshot: (serviceConfigId: string) => boolean | undefined;
  setRewardSnapshot: (
    serviceConfigId: string,
    value: boolean | undefined,
  ) => void;
  logMessage: (message: string) => void;
  onRewardsFetchError?: () => void;
}) => {
  const now = Date.now();
  const lastFetch = lastRewardsFetchRef.current[serviceConfigId] ?? 0;
  if (now - lastFetch < REWARDS_POLL_SECONDS * 1000) {
    return getRewardSnapshot(serviceConfigId);
  }

  lastRewardsFetchRef.current[serviceConfigId] = now;
  const meta = configuredAgents.find(
    (agent) => agent.serviceConfigId === serviceConfigId,
  );
  if (!meta) return;
  if (
    !meta.multisig ||
    !isValidServiceId(meta.serviceNftTokenId) ||
    !meta.stakingProgramId
  ) {
    return;
  }

  // Retry once on transient failure. `fetchAgentStakingRewardsInfo` throws on
  // RPC errors and returns null when data is missing; both warrant a retry.
  // Metric + log fire only on the final failure so a single transient blip
  // doesn't double-count.
  let response: StakingRewardsInfo | null = null;
  let lastError: unknown;
  try {
    response = await fetchAgentStakingRewardsInfo({
      chainId: meta.chainId,
      multisig: meta.multisig,
      serviceNftTokenId: meta.serviceNftTokenId,
      stakingProgramId: meta.stakingProgramId,
      agentConfig: meta.agentConfig,
    });
  } catch (error) {
    lastError = error;
  }
  if (!response) {
    const waitOk = await sleepAwareDelay(REWARDS_RETRY_DELAY_SECONDS);
    // Bail if auto-run was disabled mid-wait — avoids firing a stray retry
    // after the user turned AutoRun off.
    if (!waitOk) return;
    try {
      response = await fetchAgentStakingRewardsInfo({
        chainId: meta.chainId,
        multisig: meta.multisig,
        serviceNftTokenId: meta.serviceNftTokenId,
        stakingProgramId: meta.stakingProgramId,
        agentConfig: meta.agentConfig,
      });
      // Success on retry — clear the prior error so we don't log it.
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
  }
  if (!response) {
    if (lastError !== undefined) {
      onRewardsFetchError?.();
      logMessage(`rewards fetch error: ${serviceConfigId}: ${lastError}`);
    }
    return;
  }

  const epochExpired = isStakingEpochExpired(response);
  if (epochExpired && response.isEligibleForRewards) {
    logMessage(
      `${serviceConfigId}: epoch expired, stale isEligibleForRewards=true overridden to false so agent runs and triggers on-chain checkpoint`,
    );
  }
  // isEligibleForRewards=true → agent already earned this epoch → auto-run SKIPS it.
  // isEligibleForRewards=false → agent hasn't earned yet → auto-run STARTS it.
  // Epoch expired but checkpoint not yet called: true is stale, override to false so
  // auto-run starts the agent and triggers the on-chain checkpoint for the new epoch.
  let eligible = epochExpired ? false : response.isEligibleForRewards;

  // Stale-true override: when an idle alternate reports `true` but has not run
  // locally since the staking pool's last checkpoint, its `true` is residue
  // from a prior active run — not a current-epoch earn. Override to `false` so
  // rotation can proceed. Skipped for the currently-running agent because its
  // signal is what triggers rotation (`false → true` transition).
  if (
    eligible === true &&
    lastStartedAtRef &&
    runningServiceConfigIdRef &&
    runningServiceConfigIdRef.current !== serviceConfigId
  ) {
    const lastStartedAt = lastStartedAtRef.current[serviceConfigId] ?? 0;
    const tsCheckpointMs = (response.tsCheckpoint ?? 0) * 1000;
    if (lastStartedAt < tsCheckpointMs) {
      logMessage(
        `${serviceConfigId}: stale isEligibleForRewards=true — last local start predates epoch checkpoint, overriding to false`,
      );
      eligible = false;
    }
  }

  if (typeof eligible === 'boolean') {
    setRewardSnapshot(serviceConfigId, eligible);
    return eligible;
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

const ELIGIBILITY_WAIT_TIMEOUT_MS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000;

type Eligibility = { canRun: boolean; reason?: string; loadingReason?: string };

export type FetchDeployabilityContext = {
  runningServiceConfigId: string | null;
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
    isLoading?: boolean;
  };
  allowStartAgentByServiceConfigId: (serviceConfigId: string) => boolean;
  hasBalancesForServiceConfigId: (serviceConfigId: string) => boolean;
  isInstanceInitiallyFunded: (
    serviceConfigId: string,
    agentType: AgentType,
  ) => boolean;
  isGeoRestrictedForAgent: (agentType: AgentType) => boolean;
  logMessage: (message: string) => void;
};

export type DeployabilityCheckResult = {
  canRun: boolean;
  reason?: string;
  /** true → transient/loading; scanner uses short-retry delay instead of long block. */
  isTransient?: boolean;
};

/**
 * Checks whether an agent instance is deployable without switching the UI
 * selection. Mirrors the logic in `useDeployability` but fetches staking state
 * directly via `serviceApi` — the same pattern used by `fetchAgentStakingRewardsInfo`.
 *
 * Enables `scanAndStartNext` to evaluate all candidates without touching the
 * React selection context, so the visible agent page never changes during a scan.
 *
 * @returns
 * - `{ canRun: true }` — agent is deployable
 * - `{ canRun: false, isTransient: true }` — transient/loading; retry shortly
 * - `{ canRun: false, isTransient: false/undefined }` — deterministic block
 */
export const fetchDeployabilityForAgent = async (
  agentMeta: AgentMeta,
  ctx: FetchDeployabilityContext,
): Promise<DeployabilityCheckResult> => {
  // 1. Safe readiness (derived from cached wallet data — no API call).
  const safeEligibility = ctx.canCreateSafeForChain(agentMeta.chainId);
  if (safeEligibility.isLoading) {
    return { canRun: false, reason: 'Safe loading', isTransient: true };
  }
  if (!safeEligibility.ok) {
    return {
      canRun: false,
      reason: safeEligibility.reason ?? 'Safe not ready',
    };
  }

  // 2. Static agent-config flags (no API needed).
  if (agentMeta.agentConfig.isUnderConstruction) {
    return { canRun: false, reason: 'Under construction' };
  }

  if (
    agentMeta.agentConfig.isGeoLocationRestricted &&
    ctx.isGeoRestrictedForAgent(agentMeta.agentType)
  ) {
    return { canRun: false, reason: 'Region restricted' };
  }

  // 3. Another agent already running (transient — rotation handles this).
  if (
    ctx.runningServiceConfigId !== null &&
    ctx.runningServiceConfigId !== agentMeta.serviceConfigId
  ) {
    return {
      canRun: false,
      reason: 'Another agent running',
      isTransient: true,
    };
  }

  // 4. On-chain staking state via direct API calls (same endpoints as
  //    StakingContractDetailsProvider, but for any service, not just selected).
  //    Skip if the service hasn't been deployed yet (no NFT token ID or staking program).
  if (
    isValidServiceId(agentMeta.serviceNftTokenId) &&
    agentMeta.stakingProgramId
  ) {
    try {
      const [contractDetails, stakingDetails] = await Promise.all([
        agentMeta.agentConfig.serviceApi.getStakingContractDetails(
          agentMeta.stakingProgramId,
          agentMeta.chainId,
        ),
        agentMeta.agentConfig.serviceApi.getServiceStakingDetails(
          agentMeta.serviceNftTokenId,
          agentMeta.stakingProgramId,
          agentMeta.chainId,
        ),
      ]);

      const { serviceStakingState, serviceStakingStartTime } = stakingDetails;
      const isAgentEvicted = serviceStakingState === StakingState.Evicted;
      const isServiceStaked =
        !!serviceStakingStartTime &&
        serviceStakingState === StakingState.Staked;

      const { serviceIds, maxNumServices, minimumStakingDuration } =
        contractDetails ?? {};
      const hasEnoughServiceSlots =
        isNil(serviceIds) || isNil(maxNumServices)
          ? null
          : serviceIds.length < maxNumServices;

      if (hasEnoughServiceSlots === false && !isServiceStaked) {
        return { canRun: false, reason: 'No available slots' };
      }

      if (isAgentEvicted) {
        const isEligibleAfterEviction = (() => {
          if (isNil(serviceStakingStartTime) || isNil(minimumStakingDuration))
            return false;
          return (
            Math.round(Date.now() / 1000) - serviceStakingStartTime >=
            minimumStakingDuration
          );
        })();
        if (!isEligibleAfterEviction) {
          return { canRun: false, reason: 'Evicted' };
        }
      }
    } catch (error) {
      ctx.logMessage(
        `fetchDeployabilityForAgent: staking API error for ${agentMeta.serviceConfigId}: ${error}`,
      );
      return {
        canRun: false,
        reason: 'Staking data unavailable',
        isTransient: true,
      };
    }
  }

  // 5. Initial funding flag (from electron store — no API).
  if (
    !ctx.isInstanceInitiallyFunded(
      agentMeta.serviceConfigId,
      agentMeta.agentType,
    )
  ) {
    return { canRun: false, reason: 'Unfinished setup' };
  }

  // 6. Balance / refill requirements (cached per-service, not selection-keyed).
  //    Guard first: if data doesn't exist yet for this service, treat as transient.
  if (!ctx.hasBalancesForServiceConfigId(agentMeta.serviceConfigId)) {
    return { canRun: false, reason: 'Balance data loading', isTransient: true };
  }
  if (!ctx.allowStartAgentByServiceConfigId(agentMeta.serviceConfigId)) {
    return { canRun: false, reason: 'Low balance' };
  }

  return { canRun: true };
};

/**
 * Shared eligibility-wait implementation used by both scanner and start operations.
 *
 * Polls every 2s until eligibility leaves the LOADING state, returns true.
 * Returns false on disable, sleep/wake detection, or hard timeout (60 s).
 *
 * Example:
 * - candidate eligibility is "Loading: Balances" → polls until balances resolve
 * - disabled mid-wait → returns false immediately
 */
export const waitForEligibilityReadyHelper = async ({
  enabledRef,
  getSelectedEligibility,
  normalizeEligibility,
  recordMetric,
  logMessage,
}: {
  enabledRef: MutableRefObject<boolean>;
  getSelectedEligibility: () => Eligibility;
  normalizeEligibility: (eligibility: Eligibility) => Eligibility;
  recordMetric: (metric: AutoRunScannerMetric) => void;
  logMessage: (message: string) => void;
}): Promise<boolean> => {
  const startedAt = Date.now();
  while (enabledRef.current) {
    const eligibility = normalizeEligibility(getSelectedEligibility());
    if (eligibility.reason !== ELIGIBILITY_REASON.LOADING) return true;
    if (Date.now() - startedAt > ELIGIBILITY_WAIT_TIMEOUT_MS) {
      recordMetric(AUTO_RUN_HEALTH_METRIC.ELIGIBILITY_TIMEOUTS);
      logMessage('eligibility wait timeout');
      return false;
    }
    const ok = await sleepAwareDelay(2);
    if (!ok) return false;
  }
  return false;
};
