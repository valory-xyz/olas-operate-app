import { MutableRefObject, useCallback } from 'react';

import {
  AUTO_RUN_HEALTH_METRIC,
  AUTO_RUN_START_STATUS,
  AutoRunScannerMetric,
  AutoRunStartResult,
  ELIGIBILITY_REASON,
  EMPTY_REWARD_POOL_REASON,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
  SCAN_LOADING_RETRY_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  DeployabilityCheckResult,
  formatEligibilityReason,
  normalizeEligibility as normalizeEligibilityHelper,
  waitForEligibilityReadyHelper,
} from '../utils/autoRunHelpers';
import { useAutoRunVerboseLogger } from './useAutoRunVerboseLogger';

export type ScanOptions = {
  /** Candidate tried before the usual order, e.g. a rotation's chosen next agent. */
  first?: string;
  /** Instance whose stop is confirmed: read as not running, whatever the deployment poll says. */
  stoppedId?: string;
  /** Rotation the scan belongs to, for its log lines. */
  cycleId?: string;
  trigger?: string;
};

export type ScanResult = { startedId: string | null };

type UseAutoRunScannerParams = {
  enabledRef: MutableRefObject<boolean>;
  orderedIncludedInstances: string[];
  configuredAgents: AgentMeta[];
  selectedServiceConfigId: string | null;
  getSelectedEligibility: () => {
    canRun: boolean;
    reason?: string;
    loadingReason?: string;
  };
  waitForInstanceSelection: (serviceConfigId: string) => Promise<boolean>;
  waitForBalancesReady: () => Promise<boolean>;
  refreshRewardsEligibility: (
    serviceConfigId: string,
  ) => Promise<boolean | undefined>;
  /** Stored rewards status, `undefined` when it cannot decide without a read. */
  getRewardStatus: (serviceConfigId: string) => boolean | undefined;
  /** Whether the instance was moved on from for a stall in this epoch. */
  isStallDeferred: (serviceConfigId: string) => boolean;
  clearStallDeferral: (serviceConfigId: string) => void;
  getBalancesStatus: () => { ready: boolean; loading: boolean };
  notifySkipOnce: (
    serviceConfigId: string,
    reason?: string,
    isLoadingReason?: boolean,
  ) => void;
  /** Fetches deployability for a candidate without switching UI selection. */
  getDeployabilityForAgent: (
    agentMeta: AgentMeta,
    options?: { stoppedId?: string },
  ) => Promise<DeployabilityCheckResult>;
  startAgentWithRetries: (
    serviceConfigId: string,
    options?: { isStillDue?: () => Promise<boolean> },
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
  orderedIncludedInstances,
  configuredAgents,
  selectedServiceConfigId,
  getSelectedEligibility,
  waitForInstanceSelection,
  waitForBalancesReady,
  refreshRewardsEligibility,
  getRewardStatus,
  isStallDeferred,
  clearStallDeferral,
  getBalancesStatus,
  notifySkipOnce,
  getDeployabilityForAgent,
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
  const waitForEligibilityReady = useCallback(
    () =>
      waitForEligibilityReadyHelper({
        enabledRef,
        getSelectedEligibility,
        normalizeEligibility,
        recordMetric,
        logMessage,
      }),
    [
      enabledRef,
      getSelectedEligibility,
      logMessage,
      normalizeEligibility,
      recordMetric,
    ],
  );

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
   * An unknown rewards status never means "go": the candidate is passed
   * over, without a skip notification, and checked again on the next scan.
   */
  const passOverUnknownRewards = useCallback(
    (serviceConfigId: string) => {
      recordMetric(AUTO_RUN_HEALTH_METRIC.ELIGIBILITY_TIMEOUTS);
      logMessage(`${serviceConfigId}: rewards status unknown, passing over`);
    },
    [logMessage, recordMetric],
  );

  /**
   * Core queue traversal — runs entirely in the background without switching
   * the visible agent page.
   *
   * Candidates: `first` when given, then the included order after `from`,
   * wrapping round to `from` last. For each, once per scan cycle:
   * 1) fetch deployability directly (no UI switch)
   * 2) refresh rewards (reusing a read still fresh), so the start is decided
   *    on a read made after any wait for deployability
   * 3) skip/start based on deployability + rewards state
   *
   * Instances deferred for a stall, then for an empty reward pool, are tried
   * only once no other candidate started: empty-pool ones first, stalled ones
   * last. `first` is the pre-check's choice among those tiers, so it is never
   * deferred.
   *
   * Returns the id of the instance actually started, if any.
   */
  const scanAndStartNext = useCallback(
    async (
      from?: string | null,
      options: ScanOptions = {},
    ): Promise<ScanResult> => {
      const notStarted: ScanResult = { startedId: null };
      if (!enabledRef.current) return notStarted;
      const { first, stoppedId, cycleId, trigger } = options;
      const logPrefix = cycleId
        ? `cycle=${cycleId} trigger=${trigger ?? 'unknown'} `
        : 'scan: ';
      const passOver = (serviceConfigId: string, check?: string) =>
        logVerbose(
          `${logPrefix}pass over ${serviceConfigId}: ${check ?? 'unknown'}`,
        );
      const getDeployability = (meta: AgentMeta) =>
        getDeployabilityForAgent(meta, { stoppedId });
      const startIfStillDue = (serviceConfigId: string) =>
        startAgentWithRetries(serviceConfigId, {
          isStillDue: async () =>
            (await refreshRewardsEligibility(serviceConfigId)) === false,
        });

      // Wait for global balance data before scanning any candidate.
      const balancesReady = await waitForBalancesReady();
      if (!balancesReady) {
        if (enabledRef.current) scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
        return notStarted;
      }

      // Aggregate scan outcome across all visited candidates so we can choose
      // an appropriate next-scan delay when nothing starts.
      let hasBlocked = false;
      let hasEligible = false;
      let hasLoading = false;
      let hasInfraFailed = false;
      let hasUnknown = false;
      // Candidates blocked *only* because their staking contract has no rewards
      // left. Deferred rather than skipped outright: if nothing better can run,
      // starting one of these beats idling the entire rotation — they still do
      // their on-chain work, they just don't earn while the pool is drained.
      // Metas, not ids: the fallback re-validates deployability before starting.
      const emptyPoolCandidates: AgentMeta[] = [];
      // Candidates moved on from for a stall this epoch: tried last of all.
      const stalledCandidates: AgentMeta[] = [];

      // Announces the deferred candidates that were genuinely passed over.
      // Deliberately NOT called for candidates that were attempted (those get
      // `notifyStartFailed` from `startAgentWithRetries` — a second "was
      // skipped" would misattribute the outcome) or that had already earned
      // this epoch (the main loop passes those over silently too).
      const notifyEmptyPoolSkips = (passedOver: Iterable<string>) => {
        for (const deferred of passedOver) {
          notifySkipOnce(deferred, EMPTY_REWARD_POOL_REASON, false);
        }
      };

      const inOrder: string[] = [];
      let next = findNextInOrder(from);
      while (next && !inOrder.includes(next)) {
        inOrder.push(next);
        next = findNextInOrder(next);
      }
      const candidates =
        first && inOrder.includes(first)
          ? [first, ...inOrder.filter((id) => id !== first)]
          : inOrder;
      if (candidates.length === 0) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return notStarted;
      }

      for (const candidate of candidates) {
        if (!enabledRef.current) return notStarted;

        const candidateMeta = configuredAgents.find(
          (agent) => agent.serviceConfigId === candidate,
        );
        if (!candidateMeta) {
          passOver(candidate, 'not configured');
          hasBlocked = true;
          continue;
        }

        const isFirst = candidate === first;

        // Fetch deployability directly without switching UI selection.
        const deployability = await getDeployability(candidateMeta);
        if (!enabledRef.current) return notStarted;
        if (!deployability.canRun && !deployability.isEmptyRewardPool) {
          passOver(candidate, deployability.reason);
          if (deployability.isTransient) {
            hasLoading = true;
          } else {
            notifySkipOnce(candidate, deployability.reason, false);
            hasBlocked = true;
          }
          continue;
        }

        const isDeferredForStall = isStallDeferred(candidate);
        if (isDeferredForStall && !isFirst) {
          passOver(candidate, 'stalled on its activity goal, deferred');
          stalledCandidates.push(candidateMeta);
          continue;
        }
        if (!deployability.canRun && !isFirst) {
          passOver(candidate, deployability.reason);
          emptyPoolCandidates.push(candidateMeta);
          continue;
        }

        const candidateEligibility = await refreshRewardsEligibility(candidate);
        if (!enabledRef.current) return notStarted;
        if (candidateEligibility === true) {
          passOver(candidate, 'done for the epoch');
          hasEligible = true;
          continue;
        }
        if (candidateEligibility === undefined) {
          passOverUnknownRewards(candidate);
          hasUnknown = true;
          continue;
        }

        const startResult = await startIfStillDue(candidate);
        if (startResult.status === AUTO_RUN_START_STATUS.STARTED) {
          if (isDeferredForStall) clearStallDeferral(candidate);
          notifyEmptyPoolSkips(
            emptyPoolCandidates.map((meta) => meta.serviceConfigId),
          );
          return { startedId: candidate };
        }
        if (startResult.status === AUTO_RUN_START_STATUS.ABORTED) {
          if (enabledRef.current) {
            logVerbose(
              `scan paused on ${candidate}: start gates timed out, rescan in ${SCAN_LOADING_RETRY_SECONDS}s`,
            );
            scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          }
          return notStarted;
        }
        if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
          logVerbose(
            `scan: ${candidate} infra_failed (${startResult.reason ?? 'unknown'}), trying next candidate`,
          );
          hasInfraFailed = true;
          continue;
        }
        hasBlocked = true;
      }

      // Degraded mode: no rewarded candidate could be started, so fall back to
      // the instances deferred for an empty reward pool instead of idling,
      // then to stalled ones, which run again with a fresh hour. Without this,
      // a user whose agents all sit on drained contracts would have auto-run
      // start nothing at all.
      if (emptyPoolCandidates.length > 0) {
        logVerbose(
          `scan: no rewarded candidate startable, falling back to ${emptyPoolCandidates.length} empty-pool candidate(s)`,
        );
      }
      // Empty-pool candidates still owed a skip notification: the empty pool
      // stops being the accurate explanation once one is visited here.
      const passedOver = new Set(
        emptyPoolCandidates.map((meta) => meta.serviceConfigId),
      );
      const fallbacks = [
        ...emptyPoolCandidates.map((meta) => ({ meta, isStalled: false })),
        ...stalledCandidates.map((meta) => ({ meta, isStalled: true })),
      ];
      for (const { meta, isStalled } of fallbacks) {
        const deferred = meta.serviceConfigId;
        if (!enabledRef.current) return notStarted;
        passedOver.delete(deferred);

        // Re-validate before starting: a candidate ahead of this one
        // exhausting `startAgentWithRetries` can take ~48min, and balances,
        // slots and eviction state can all have moved since the main loop.
        const recheck = await getDeployability(meta);
        if (!enabledRef.current) return notStarted;
        if (!recheck.canRun && !recheck.isEmptyRewardPool) {
          passOver(deferred, recheck.reason);
          if (recheck.isTransient) {
            hasLoading = true;
          } else {
            notifySkipOnce(deferred, recheck.reason, false);
            hasBlocked = true;
          }
          continue;
        }

        // Read after the recheck: a `false` decides only while fresh.
        const deferredEligibility = await refreshRewardsEligibility(deferred);
        if (!enabledRef.current) return notStarted;
        if (deferredEligibility === true) {
          passOver(deferred, 'done for the epoch');
          hasEligible = true;
          continue;
        }
        if (deferredEligibility === undefined) {
          passOverUnknownRewards(deferred);
          hasUnknown = true;
          continue;
        }

        const startResult = await startIfStillDue(deferred);
        if (startResult.status === AUTO_RUN_START_STATUS.STARTED) {
          if (isStalled) {
            logVerbose(
              `scan: started stalled ${deferred}, no other agent could start`,
            );
            clearStallDeferral(deferred);
          } else {
            logVerbose(
              `scan: started ${deferred} in degraded mode (empty reward pool)`,
            );
          }
          notifyEmptyPoolSkips(passedOver);
          return { startedId: deferred };
        }
        if (startResult.status === AUTO_RUN_START_STATUS.ABORTED) {
          if (enabledRef.current) {
            logVerbose(
              `scan paused on ${deferred} (fallback): start gates timed out, rescan in ${SCAN_LOADING_RETRY_SECONDS}s`,
            );
            scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
          }
          return notStarted;
        }
        if (startResult.status === AUTO_RUN_START_STATUS.INFRA_FAILED) {
          logVerbose(
            `scan: ${deferred} infra_failed in fallback (${startResult.reason ?? 'unknown'}), trying next deferred candidate`,
          );
          hasInfraFailed = true;
          continue;
        }
        hasBlocked = true;
      }

      const delay = (() => {
        if (hasLoading || hasInfraFailed) return SCAN_LOADING_RETRY_SECONDS;
        if (hasBlocked || hasUnknown) return SCAN_BLOCKED_DELAY_SECONDS;
        if (hasEligible) return SCAN_ELIGIBLE_DELAY_SECONDS;
        return SCAN_BLOCKED_DELAY_SECONDS;
      })();

      logVerbose(
        `scan complete: no agent started (loading=${hasLoading}, blocked=${hasBlocked}, eligible=${hasEligible}, infraFailed=${hasInfraFailed}, unknown=${hasUnknown}), rescan in ${delay}s`,
      );
      scheduleNextScan(delay);
      return notStarted;
    },
    [
      clearStallDeferral,
      configuredAgents,
      enabledRef,
      findNextInOrder,
      getDeployabilityForAgent,
      isStallDeferred,
      passOverUnknownRewards,
      refreshRewardsEligibility,
      notifySkipOnce,
      scheduleNextScan,
      startAgentWithRetries,
      waitForBalancesReady,
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

    if (getRewardStatus(selectedServiceConfigId) === true) return false;
    // A stalled instance waits for the scan's stalled fallback.
    if (isStallDeferred(selectedServiceConfigId)) return false;

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

    const fastPathDeployability = await getDeployabilityForAgent(selectedMeta);
    if (!fastPathDeployability.canRun) {
      if (fastPathDeployability.isTransient) {
        scheduleNextScan(SCAN_LOADING_RETRY_SECONDS);
        return false;
      }
      // Empty pool is deferred, not notified, here: the caller falls through to
      // `scanAndStartNext`, which may still start this instance in degraded
      // mode. Notifying now would announce a skip that never happens.
      if (!fastPathDeployability.isEmptyRewardPool) {
        notifySkipOnce(
          selectedServiceConfigId,
          fastPathDeployability.reason,
          false,
        );
      }
      return false;
    }

    // Reuses the read above while it is still fresh.
    const rewardsEligibility = await refreshRewardsEligibility(
      selectedServiceConfigId,
    );
    if (rewardsEligibility === true) {
      return false;
    }
    if (rewardsEligibility === undefined) {
      passOverUnknownRewards(selectedServiceConfigId);
      return false;
    }

    const startResult = await startAgentWithRetries(selectedServiceConfigId, {
      isStillDue: async () =>
        (await refreshRewardsEligibility(selectedServiceConfigId)) === false,
    });
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
    configuredAgents,
    enabledRef,
    getDeployabilityForAgent,
    getSelectedEligibility,
    getRewardStatus,
    isStallDeferred,
    passOverUnknownRewards,
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
  ]);

  return {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
  };
};
