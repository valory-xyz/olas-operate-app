import { MutableRefObject, useCallback } from 'react';

import { AgentType } from '@/constants';
import { sleepAwareDelay } from '@/utils/delay';

import {
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  AUTO_RUN_START_STATUS,
  AutoRunStartResult,
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
  SCAN_LOADING_RETRY_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import { isOnlyLoadingReason } from '../utils/autoRunHelpers';

const ELIGIBILITY_WAIT_TIMEOUT_MS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000;

type UseAutoRunScannerParams = {
  enabledRef: MutableRefObject<boolean>;
  orderedIncludedAgentTypes: AgentType[];
  configuredAgents: AgentMeta[];
  selectedAgentType: AgentType;
  updateAgentType: (agentType: AgentType) => void;
  getSelectedEligibility: () => {
    canRun: boolean;
    reason?: string;
    loadingReason?: string;
  };
  waitForAgentSelection: (
    agentType: AgentType,
    serviceConfigId?: string | null,
  ) => Promise<boolean>;
  waitForBalancesReady: () => Promise<boolean>;
  waitForRewardsEligibility: (
    agentType: AgentType,
  ) => Promise<boolean | undefined>;
  refreshRewardsEligibility: (
    agentType: AgentType,
  ) => Promise<boolean | undefined>;
  markRewardSnapshotPending: (agentType: AgentType) => void;
  getRewardSnapshot: (agentType: AgentType) => boolean | undefined;
  getBalancesStatus: () => { ready: boolean; loading: boolean };
  notifySkipOnce: (
    agentType: AgentType,
    reason?: string,
    isLoadingReason?: boolean,
  ) => void;
  startAgentWithRetries: (agentType: AgentType) => Promise<AutoRunStartResult>;
  scheduleNextScan: (delaySeconds: number) => void;
  logMessage: (message: string) => void;
};

/**
 * Converts a normalized eligibility object into a user/log-friendly reason.
 *
 * Example:
 * - { reason: LOADING, loadingReason: 'Balances' } -> "Loading: Balances"
 * - { reason: 'Low balance' } -> "Low balance"
 */
const formatEligibilityReason = (eligibility: {
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
 * Queue-scanning logic for auto-run.
 *
 * Example:
 * Order is [omenstrat, polystrat, optimus].
 * If scan starts from `omenstrat`, this hook checks `polystrat` first,
 * then `optimus`, then wraps once.
 */
export const useAutoRunScanner = ({
  enabledRef,
  orderedIncludedAgentTypes,
  configuredAgents,
  selectedAgentType,
  updateAgentType,
  getSelectedEligibility,
  waitForAgentSelection,
  waitForBalancesReady,
  waitForRewardsEligibility,
  refreshRewardsEligibility,
  markRewardSnapshotPending,
  getRewardSnapshot,
  getBalancesStatus,
  notifySkipOnce,
  startAgentWithRetries,
  scheduleNextScan,
  logMessage,
}: UseAutoRunScannerParams) => {
  /**
   * Normalizes deployability output for scanner decisions.
   *
   * Example:
   * - "Another agent running" is treated as transient loading
   * - stale "Loading: Balances" becomes runnable when global balances are ready
   */
  const normalizeEligibility = useCallback(
    (eligibility: {
      canRun: boolean;
      reason?: string;
      loadingReason?: string;
    }) => {
      if (eligibility.reason === ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING) {
        return {
          canRun: false,
          reason: ELIGIBILITY_REASON.LOADING,
          loadingReason: ELIGIBILITY_REASON.ANOTHER_AGENT_RUNNING,
        };
      }

      // Pass through if this isn't the specific "Loading: Balances" stale-read case.
      if (
        !isOnlyLoadingReason(eligibility, ELIGIBILITY_LOADING_REASON.BALANCES)
      ) {
        return eligibility;
      }

      // Special stale-read case:
      // if deployability says "Loading: Balances" but global balances are already
      // ready, we can treat this candidate as runnable and proceed.
      const balances = getBalancesStatus();
      if (balances.ready && !balances.loading) {
        return { canRun: true };
      }
      return eligibility;
    },
    [getBalancesStatus],
  );

  /**
   * Waits until eligibility leaves loading state.
   *
   * Example:
   * - candidate stays in loading (safe/balance/rewards metadata not ready)
   * - we poll every 2s up to timeout, then continue scan logic safely
   */
  const waitForEligibilityReady = useCallback(async () => {
    const startedAt = Date.now();
    while (enabledRef.current) {
      const eligibility = normalizeEligibility(getSelectedEligibility());
      if (eligibility.reason !== ELIGIBILITY_REASON.LOADING) return true;
      if (Date.now() - startedAt > ELIGIBILITY_WAIT_TIMEOUT_MS) {
        logMessage('eligibility wait timeout');
        return false;
      }
      const ok = await sleepAwareDelay(2);
      if (!ok) return false;
    }
    return false;
  }, [enabledRef, getSelectedEligibility, logMessage, normalizeEligibility]);

  /**
   * Returns the next candidate in circular included order.
   * Skips the currently provided agent.
   *
   * Example:
   * - included order: [a, b, c], current=b -> returns c
   * - next call with current=c -> returns a
   */
  const findNextInOrder = useCallback(
    (currentAgentType?: AgentType | null) => {
      if (orderedIncludedAgentTypes.length === 0) return null;
      const startIndex = currentAgentType
        ? orderedIncludedAgentTypes.indexOf(currentAgentType)
        : -1;
      for (let i = 1; i <= orderedIncludedAgentTypes.length; i += 1) {
        const index = (startIndex + i) % orderedIncludedAgentTypes.length;
        const candidate = orderedIncludedAgentTypes[index];
        if (!candidate) continue;
        if (candidate === currentAgentType) continue;
        return candidate;
      }
      return null;
    },
    [orderedIncludedAgentTypes],
  );

  /**
   * Picks the "start-from" anchor so the selected agent gets first chance.
   *
   * Scanner always begins from `findNextInOrder(startFrom)`, so we pass the
   * previous item as anchor to make selected agent the first candidate.
   *
   * Example:
   * - order [a,b,c], selected=b -> startFrom=a -> first candidate=b
   * - order [a,b,c], selected=c -> startFrom=b -> first candidate=c
   */
  const getPreferredStartFrom = useCallback(() => {
    const length = orderedIncludedAgentTypes.length;
    if (length <= 1) return null;
    const index = orderedIncludedAgentTypes.indexOf(selectedAgentType);
    if (index === -1) return null;
    const prevIndex = (index - 1 + length) % length;
    return orderedIncludedAgentTypes[prevIndex] ?? null;
  }, [orderedIncludedAgentTypes, selectedAgentType]);

  /**
   * Core queue traversal.
   *
   * For each candidate once per scan cycle:
   * 1) switch selection
   * 2) refresh rewards snapshot
   * 3) wait for required readiness gates
   * 4) skip/start based on normalized eligibility + rewards state
   *
   * Returns `{ started: true }` only when an agent is actually started.
   */
  const scanAndStartNext = useCallback(
    async (startFrom?: AgentType | null) => {
      if (!enabledRef.current) return { started: false };
      // Aggregate scan outcome across all visited candidates so we can choose
      // an appropriate next-scan delay when nothing starts.
      let hasBlocked = false;
      let hasEligible = false;
      let hasLoading = false;
      let candidate = findNextInOrder(startFrom);
      if (!candidate) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return { started: false };
      }
      const visited = new Set<AgentType>();

      // Visit each included agent at most once per scan cycle to prevent
      // infinite loops in a single scan pass.
      while (candidate && !visited.has(candidate)) {
        if (!enabledRef.current) return { started: false };

        visited.add(candidate);
        const candidateMeta = configuredAgents.find(
          (agent) => agent.agentType === candidate,
        );
        if (!candidateMeta) {
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        // Move UI context to candidate, then wait until selection-derived data
        // is coherent before making decisions for this agent.
        updateAgentType(candidate);
        markRewardSnapshotPending(candidate);
        const selectionReady = await waitForAgentSelection(
          candidate,
          candidateMeta.serviceConfigId,
        );
        if (!selectionReady) {
          if (enabledRef.current) {
            scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          }
          return { started: false };
        }

        await refreshRewardsEligibility(candidate);
        const selectionReadyAfterRefresh = await waitForAgentSelection(
          candidate,
          candidateMeta.serviceConfigId,
        );
        if (!selectionReadyAfterRefresh) {
          if (enabledRef.current) {
            scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          }
          return { started: false };
        }

        const balancesReady = await waitForBalancesReady();
        if (!balancesReady) {
          if (enabledRef.current) {
            scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          }
          return { started: false };
        }

        const eligibilityReady = await waitForEligibilityReady();
        if (!eligibilityReady) {
          if (!enabledRef.current) return { started: false };
          hasLoading = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        // Evaluate deterministic eligibility first, then rewards state,
        // and only then attempt start.
        const eligibility = normalizeEligibility(getSelectedEligibility());
        if (!eligibility.canRun) {
          if (eligibility.reason === ELIGIBILITY_REASON.LOADING) {
            hasLoading = true;
            candidate = findNextInOrder(candidate);
            continue;
          }
          const reason = formatEligibilityReason(eligibility);
          notifySkipOnce(candidate, reason, false);
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const candidateEligibility = await waitForRewardsEligibility(candidate);
        if (candidateEligibility === true) {
          hasEligible = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const startResult = await startAgentWithRetries(candidate);
        if (startResult.status === AUTO_RUN_START_STATUS.STARTED) {
          return { started: true };
        }
        if (startResult.status === AUTO_RUN_START_STATUS.ABORTED) {
          return { started: false };
        }
        if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
          logMessage(
            `scan paused on ${candidate}: transient start failure (${startResult.reason ?? 'unknown'}), rescan in ${SCAN_LOADING_RETRY_SECONDS}s`,
          );
          scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          return { started: false };
        }
        hasBlocked = true;
        candidate = findNextInOrder(candidate);
      }

      const delay = (() => {
        if (hasLoading) return SCAN_LOADING_RETRY_SECONDS;
        if (hasBlocked) return SCAN_BLOCKED_DELAY_SECONDS;
        if (hasEligible) return SCAN_ELIGIBLE_DELAY_SECONDS;
        return SCAN_BLOCKED_DELAY_SECONDS;
      })();

      logMessage(
        `scan complete: no agent started (loading=${hasLoading}, blocked=${hasBlocked}, eligible=${hasEligible}), rescan in ${delay}s`,
      );
      scheduleNextScan(delay);
      return { started: false };
    },
    [
      configuredAgents,
      enabledRef,
      findNextInOrder,
      getSelectedEligibility,
      markRewardSnapshotPending,
      refreshRewardsEligibility,
      notifySkipOnce,
      normalizeEligibility,
      scheduleNextScan,
      startAgentWithRetries,
      updateAgentType,
      waitForAgentSelection,
      waitForBalancesReady,
      waitForRewardsEligibility,
      waitForEligibilityReady,
      logMessage,
    ],
  );

  /**
   * Fast path used on enable/resume:
   * tries current selected agent before queue scan.
   *
   * Example:
   * - user is viewing `memeooorr` and enables auto-run
   * - this function tries `memeooorr` first
   * - if not startable, caller falls back to `scanAndStartNext`
   */
  const startSelectedAgentIfEligible = useCallback(async () => {
    if (!orderedIncludedAgentTypes.includes(selectedAgentType)) {
      return false;
    }

    const selectedMeta = configuredAgents.find(
      (agent) => agent.agentType === selectedAgentType,
    );
    if (!selectedMeta) return false;

    const rewardSnapshot = getRewardSnapshot(selectedAgentType);
    if (rewardSnapshot === true) return false;

    markRewardSnapshotPending(selectedAgentType);
    const selectionReady = await waitForAgentSelection(
      selectedAgentType,
      selectedMeta.serviceConfigId,
    );
    if (!selectionReady) return false;

    await refreshRewardsEligibility(selectedAgentType);
    const selectionReadyAfterRefresh = await waitForAgentSelection(
      selectedAgentType,
      selectedMeta.serviceConfigId,
    );
    if (!selectionReadyAfterRefresh) return false;

    const balancesReady = await waitForBalancesReady();
    if (!balancesReady) return false;

    const eligibilityReady = await waitForEligibilityReady();
    if (!eligibilityReady) {
      scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
      return false;
    }
    const eligibility = normalizeEligibility(getSelectedEligibility());
    if (!eligibility.canRun) {
      if (eligibility.reason === ELIGIBILITY_REASON.LOADING) {
        scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
        return false;
      }
      const reason = formatEligibilityReason(eligibility);
      notifySkipOnce(selectedAgentType, reason, false);
      return false;
    }

    const rewardsEligibility =
      await waitForRewardsEligibility(selectedAgentType);
    if (rewardsEligibility === true) {
      return false;
    }

    const startResult = await startAgentWithRetries(selectedAgentType);
    if (startResult.status === AUTO_RUN_START_STATUS.STARTED) return true;
    if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
      logMessage(
        `selected start paused: transient failure (${startResult.reason ?? 'unknown'}), rescan in ${SCAN_LOADING_RETRY_SECONDS}s`,
      );
      scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
      return true;
    }
    if (startResult.status === AUTO_RUN_START_STATUS.ABORTED) {
      return true;
    }
    return false;
  }, [
    configuredAgents,
    getSelectedEligibility,
    getRewardSnapshot,
    markRewardSnapshotPending,
    refreshRewardsEligibility,
    notifySkipOnce,
    orderedIncludedAgentTypes,
    selectedAgentType,
    startAgentWithRetries,
    waitForAgentSelection,
    normalizeEligibility,
    logMessage,
    scheduleNextScan,
    waitForBalancesReady,
    waitForEligibilityReady,
    waitForRewardsEligibility,
  ]);

  return {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
  };
};
