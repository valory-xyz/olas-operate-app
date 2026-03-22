import { MutableRefObject, useCallback } from 'react';

import { sleepAwareDelay } from '@/utils/delay';

import {
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  AUTO_RUN_HEALTH_METRIC,
  AUTO_RUN_START_STATUS,
  AutoRunScannerMetric,
  AutoRunStartResult,
  ELIGIBILITY_REASON,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
  SCAN_LOADING_RETRY_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  formatEligibilityReason,
  normalizeEligibility as normalizeEligibilityHelper,
} from '../utils/autoRunHelpers';
import { useAutoRunVerboseLogger } from './useAutoRunVerboseLogger';

const ELIGIBILITY_WAIT_TIMEOUT_MS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000;

type UseAutoRunScannerParams = {
  enabledRef: MutableRefObject<boolean>;
  /** When false, scanner pauses and reschedules — prevents switching agents
   *  while the user is on agent-specific pages (Setup, AgentWallet,
   *  AgentStaking, staking flows). Neutral pages (Settings, HelpAndSupport,
   *  ReleaseNotes, PearlWallet) allow switching. */
  canSwitchAgentRef: MutableRefObject<boolean>;
  orderedIncludedInstances: string[];
  configuredAgents: AgentMeta[];
  selectedServiceConfigId: string | null;
  updateSelectedServiceConfigId: (serviceConfigId: string) => void;
  getSelectedEligibility: () => {
    canRun: boolean;
    reason?: string;
    loadingReason?: string;
  };
  waitForInstanceSelection: (serviceConfigId: string) => Promise<boolean>;
  waitForBalancesReady: () => Promise<boolean>;
  waitForRewardsEligibility: (
    serviceConfigId: string,
  ) => Promise<boolean | undefined>;
  refreshRewardsEligibility: (
    serviceConfigId: string,
  ) => Promise<boolean | undefined>;
  markRewardSnapshotPending: (serviceConfigId: string) => void;
  getRewardSnapshot: (serviceConfigId: string) => boolean | undefined;
  getBalancesStatus: () => { ready: boolean; loading: boolean };
  notifySkipOnce: (
    serviceConfigId: string,
    reason?: string,
    isLoadingReason?: boolean,
  ) => void;
  startAgentWithRetries: (
    serviceConfigId: string,
  ) => Promise<AutoRunStartResult>;
  scheduleNextScan: (delaySeconds: number) => void;
  recordMetric: (metric: AutoRunScannerMetric) => void;
  logMessage: (message: string) => void;
};

/**
 * Queue-scanning logic for auto-run.
 *
 * Example:
 * Order is [sc-aaa, sc-bbb, sc-ccc].
 * If scan starts from `sc-aaa`, this hook checks `sc-bbb` first,
 * then `sc-ccc`, then wraps once.
 */
export const useAutoRunScanner = ({
  enabledRef,
  canSwitchAgentRef,
  orderedIncludedInstances,
  configuredAgents,
  selectedServiceConfigId,
  updateSelectedServiceConfigId,
  getSelectedEligibility,
  waitForInstanceSelection,
  waitForBalancesReady,
  waitForRewardsEligibility,
  refreshRewardsEligibility,
  markRewardSnapshotPending,
  getRewardSnapshot,
  getBalancesStatus,
  notifySkipOnce,
  startAgentWithRetries,
  scheduleNextScan,
  recordMetric,
  logMessage,
}: UseAutoRunScannerParams) => {
  const logVerbose = useAutoRunVerboseLogger(logMessage);

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
    }) => normalizeEligibilityHelper(eligibility, getBalancesStatus),
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
        recordMetric(AUTO_RUN_HEALTH_METRIC.ELIGIBILITY_TIMEOUTS);
        logMessage('eligibility wait timeout');
        return false;
      }
      const ok = await sleepAwareDelay(2);
      if (!ok) return false;
    }
    return false;
  }, [
    enabledRef,
    getSelectedEligibility,
    logMessage,
    normalizeEligibility,
    recordMetric,
  ]);

  /**
   * Returns the next candidate in circular included order.
   * Skips the currently provided instance.
   *
   * Example:
   * - included order: [a, b, c], current=b -> returns c
   * - next call with current=c -> returns a
   */
  const findNextInOrder = useCallback(
    (currentId?: string | null) => {
      if (orderedIncludedInstances.length === 0) return null;
      const startIndex = currentId
        ? orderedIncludedInstances.indexOf(currentId)
        : -1;
      for (let i = 1; i <= orderedIncludedInstances.length; i += 1) {
        const index = (startIndex + i) % orderedIncludedInstances.length;
        const candidate = orderedIncludedInstances[index];
        if (!candidate) continue;
        if (candidate === currentId) continue;
        return candidate;
      }
      return null;
    },
    [orderedIncludedInstances],
  );

  /**
   * Picks the "start-from" anchor so the selected instance gets first chance.
   *
   * Scanner always begins from `findNextInOrder(startFrom)`, so we pass the
   * previous item as anchor to make the selected instance the first candidate.
   *
   * Example:
   * - order [a,b,c], selected=b -> startFrom=a -> first candidate=b
   * - order [a,b,c], selected=c -> startFrom=b -> first candidate=c
   */
  const getPreferredStartFrom = useCallback(() => {
    const length = orderedIncludedInstances.length;
    if (length <= 1) return null;
    if (!selectedServiceConfigId) return null;
    const index = orderedIncludedInstances.indexOf(selectedServiceConfigId);
    if (index === -1) return null;
    const prevIndex = (index - 1 + length) % length;
    return orderedIncludedInstances[prevIndex] ?? null;
  }, [orderedIncludedInstances, selectedServiceConfigId]);

  /**
   * Core queue traversal.
   *
   * For each candidate once per scan cycle:
   * 1) switch selection
   * 2) refresh rewards snapshot
   * 3) wait for required readiness gates
   * 4) skip/start based on normalized eligibility + rewards state
   *
   * Returns `{ started: true }` only when an instance is actually started.
   */
  const scanAndStartNext = useCallback(
    async (startFrom?: string | null) => {
      if (!enabledRef.current) return { started: false };
      // Block scan on agent-specific pages (Setup/FundYourAgent, AgentWallet,
      // AgentStaking, staking flows, FundPearlWallet). Reschedule to retry shortly.
      if (!canSwitchAgentRef.current) {
        logVerbose(
          `scan paused: user on non-Main page, retry in ${SCAN_LOADING_RETRY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
        return { started: false };
      }
      // Aggregate scan outcome across all visited candidates so we can choose
      // an appropriate next-scan delay when nothing starts.
      let hasBlocked = false;
      let hasEligible = false;
      let hasLoading = false;
      let hasInfraFailed = false;
      let candidate = findNextInOrder(startFrom);
      if (!candidate) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return { started: false };
      }
      const visited = new Set<string>();

      // Visit each included agent at most once per scan cycle to prevent
      // infinite loops in a single scan pass.
      while (candidate && !visited.has(candidate)) {
        if (!enabledRef.current) return { started: false };

        visited.add(candidate);
        // Re-check page guard mid-loop: user may have navigated away after the
        // scan started. Stop and reschedule rather than switching agents.
        if (!canSwitchAgentRef.current) {
          logVerbose(
            `scan paused mid-loop on ${candidate}: user navigated away, retry in ${SCAN_LOADING_RETRY_SECONDS}s`,
          );
          if (enabledRef.current) scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          return { started: false };
        }
        const candidateMeta = configuredAgents.find(
          (agent) => agent.serviceConfigId === candidate,
        );
        if (!candidateMeta) {
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        // Move UI context to candidate, then wait until selection-derived data
        // is coherent before making decisions for this agent.
        updateSelectedServiceConfigId(candidate);
        markRewardSnapshotPending(candidate);
        const selectionReady = await waitForInstanceSelection(candidate);
        if (!selectionReady) {
          if (enabledRef.current) {
            scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          }
          return { started: false };
        }

        await refreshRewardsEligibility(candidate);
        const selectionReadyAfterRefresh =
          await waitForInstanceSelection(candidate);
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
          if (enabledRef.current) {
            logVerbose(
              `scan paused on ${candidate}: start gates timed out, rescan in ${SCAN_LOADING_RETRY_SECONDS}s`,
            );
            scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          }
          return { started: false };
        }
        if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
          logVerbose(
            `scan: ${candidate} infra_failed (${startResult.reason ?? 'unknown'}), trying next candidate`,
          );
          hasInfraFailed = true;
          candidate = findNextInOrder(candidate);
          continue;
        }
        hasBlocked = true;
        candidate = findNextInOrder(candidate);
      }

      const delay = (() => {
        if (hasLoading || hasInfraFailed) return SCAN_LOADING_RETRY_SECONDS;
        if (hasBlocked) return SCAN_BLOCKED_DELAY_SECONDS;
        if (hasEligible) return SCAN_ELIGIBLE_DELAY_SECONDS;
        return SCAN_BLOCKED_DELAY_SECONDS;
      })();

      logVerbose(
        `scan complete: no agent started (loading=${hasLoading}, blocked=${hasBlocked}, eligible=${hasEligible}, infraFailed=${hasInfraFailed}), rescan in ${delay}s`,
      );
      scheduleNextScan(delay);
      return { started: false };
    },
    [
      canSwitchAgentRef,
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
      updateSelectedServiceConfigId,
      waitForInstanceSelection,
      waitForBalancesReady,
      waitForRewardsEligibility,
      waitForEligibilityReady,
      logVerbose,
    ],
  );

  /**
   * Fast path used on enable/resume:
   * tries current selected instance before queue scan.
   *
   * Example:
   * - user is viewing instance `sc-aaa` and enables auto-run
   * - this function tries `sc-aaa` first
   * - if not startable, caller falls back to `scanAndStartNext`
   */
  const startSelectedAgentIfEligible = useCallback(async () => {
    // Block on agent-specific pages — same guard as scanAndStartNext entry.
    if (!canSwitchAgentRef.current) {
      if (enabledRef.current) scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
      return false;
    }
    if (
      !selectedServiceConfigId ||
      !orderedIncludedInstances.includes(selectedServiceConfigId)
    ) {
      return false;
    }

    const selectedMeta = configuredAgents.find(
      (agent) => agent.serviceConfigId === selectedServiceConfigId,
    );
    if (!selectedMeta) return false;

    const rewardSnapshot = getRewardSnapshot(selectedServiceConfigId);
    if (rewardSnapshot === true) return false;

    markRewardSnapshotPending(selectedServiceConfigId);
    const selectionReady = await waitForInstanceSelection(
      selectedServiceConfigId,
    );
    if (!selectionReady) return false;

    await refreshRewardsEligibility(selectedServiceConfigId);
    const selectionReadyAfterRefresh = await waitForInstanceSelection(
      selectedServiceConfigId,
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
      notifySkipOnce(selectedServiceConfigId, reason, false);
      return false;
    }

    const rewardsEligibility = await waitForRewardsEligibility(
      selectedServiceConfigId,
    );
    if (rewardsEligibility === true) {
      return false;
    }

    const startResult = await startAgentWithRetries(selectedServiceConfigId);
    if (startResult.status === AUTO_RUN_START_STATUS.STARTED) return true;
    if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
      logVerbose(
        `selected start paused: transient failure (${startResult.reason ?? 'unknown'}), scanning other agents`,
      );
      if (orderedIncludedInstances.length > 1) {
        // Scan from the selected instance so other candidates are tried before rescheduling.
        // scanAndStartNext schedules its own rescan delay at the end.
        await scanAndStartNext(selectedServiceConfigId);
      } else {
        // Single-instance: scanAndStartNext would find no next candidate and schedule
        // SCAN_ELIGIBLE_DELAY_SECONDS (30min). Use short retry instead.
        scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
      }
      return true;
    }
    if (startResult.status === AUTO_RUN_START_STATUS.ABORTED) {
      if (enabledRef.current) {
        logVerbose(
          `selected start paused: start gates timed out, rescan in ${SCAN_LOADING_RETRY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
      }
      return true;
    }
    return false;
  }, [
    canSwitchAgentRef,
    configuredAgents,
    enabledRef,
    getSelectedEligibility,
    getRewardSnapshot,
    markRewardSnapshotPending,
    refreshRewardsEligibility,
    notifySkipOnce,
    orderedIncludedInstances,
    scanAndStartNext,
    selectedServiceConfigId,
    startAgentWithRetries,
    waitForInstanceSelection,
    normalizeEligibility,
    logVerbose,
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
