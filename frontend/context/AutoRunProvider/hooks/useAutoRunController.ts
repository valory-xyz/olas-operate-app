import { useCallback, useEffect, useRef } from 'react';

import { AgentType, MiddlewareDeploymentStatusMap } from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { sleepAwareDelay, withTimeout } from '@/utils/delay';

import {
  AUTO_RUN_START_DELAY_SECONDS,
  AUTO_RUN_START_STATUS,
  AutoRunStartResult,
  COOLDOWN_SECONDS,
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  RETRY_BACKOFF_SECONDS,
  REWARDS_POLL_SECONDS,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
  START_TIMEOUT_SECONDS,
  STOP_RECOVERY_MAX_ATTEMPTS,
  STOP_RECOVERY_RETRY_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  formatEligibilityReason,
  isOnlyLoadingReason,
  refreshRewardsEligibility as refreshRewardsEligibilityHelper,
} from '../utils/autoRunHelpers';
import {
  getAgentDisplayName,
  notifySkipped,
  notifyStartFailed,
} from '../utils/utils';
import { useAutoRunScanner } from './useAutoRunScanner';
import { useAutoRunSignals } from './useAutoRunSignals';
import { useLogAutoRunEvent } from './useLogAutoRunEvent';

const START_OPERATION_TIMEOUT_SECONDS = 15 * 60;

const withOperationTimeout = <T>(
  operation: Promise<T>,
  timeoutSeconds: number,
  label: string,
) =>
  withTimeout(
    operation,
    timeoutSeconds * 1000,
    () => new Error(`${label} timed out after ${timeoutSeconds}s`),
  );

type UseAutoRunControllerParams = {
  enabled: boolean;
  orderedIncludedAgentTypes: AgentType[];
  configuredAgents: AgentMeta[];
  updateAgentType: (agentType: AgentType) => void;
  selectedAgentType: AgentType;
  selectedServiceConfigId: string | null;
  isSelectedAgentDetailsLoading: boolean;
  getSelectedEligibility: () => {
    canRun: boolean;
    reason?: string;
    loadingReason?: string;
  };
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  showNotification?: (title: string, body?: string) => void;
  onAutoRunAgentStarted?: (agentType: AgentType) => void;
  onAutoRunStartStateChange?: (isStarting: boolean) => void;
};

export const useAutoRunController = ({
  enabled,
  orderedIncludedAgentTypes,
  configuredAgents,
  updateAgentType,
  selectedAgentType,
  selectedServiceConfigId,
  isSelectedAgentDetailsLoading,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
  onAutoRunAgentStarted,
  onAutoRunStartStateChange,
}: UseAutoRunControllerParams) => {
  const { isEligibleForRewards } = useRewardContext();
  const { runningAgentType } = useAgentRunning();
  const { startService } = useStartService();
  const { logMessage } = useLogAutoRunEvent();
  const {
    enabledRef,
    runningAgentTypeRef,
    lastRewardsEligibilityRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    waitForAgentSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    waitForRunningAgent,
    markRewardSnapshotPending,
    getRewardSnapshot,
    setRewardSnapshot,
    getBalancesStatus,
  } = useAutoRunSignals({
    enabled,
    runningAgentType,
    isSelectedAgentDetailsLoading,
    isEligibleForRewards,
    selectedAgentType,
    selectedServiceConfigId,
    logMessage,
  });

  // Guards against overlapping scan/rotation loops.
  const isRotatingRef = useRef(false);
  // Track per-agent skip reason to avoid spamming notifications.
  const skipNotifiedRef = useRef<Partial<Record<AgentType, string>>>({});
  // Track prior enabled state to distinguish initial enable vs later idle (cooldown on manual stop).
  const wasAutoRunEnabledRef = useRef(false);
  // Throttle rewards fetch per agent to avoid spamming the API.
  const lastRewardsFetchRef = useRef<Partial<Record<AgentType, number>>>({});
  // Prevent immediate re-trigger loops after stop timeouts for the same agent.
  const stopRetryBackoffUntilRef = useRef<Partial<Record<AgentType, number>>>(
    {},
  );

  // Reset per-agent skip dedup on each disable so notifications fire again on re-enable.
  useEffect(() => {
    if (!enabled) {
      skipNotifiedRef.current = {};
      stopRetryBackoffUntilRef.current = {};
    }
  }, [enabled]);

  const refreshRewardsEligibility = useCallback(
    (agentType: AgentType) =>
      refreshRewardsEligibilityHelper({
        agentType,
        configuredAgents,
        lastRewardsFetchRef,
        getRewardSnapshot,
        setRewardSnapshot,
        logMessage,
      }),
    [configuredAgents, getRewardSnapshot, logMessage, setRewardSnapshot],
  );

  // Notify the user that an agent was skipped for a specific reason, but only once per reason.
  const notifySkipOnce = useCallback(
    (agentType: AgentType, reason?: string) => {
      if (!reason) return;
      if (reason.toLowerCase().includes('loading')) return;
      if (skipNotifiedRef.current[agentType] === reason) return;
      skipNotifiedRef.current[agentType] = reason;
      notifySkipped(showNotification, getAgentDisplayName(agentType), reason);
      logMessage(`skip ${agentType}: ${reason}`);
    },
    [logMessage, showNotification],
  );

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
      if (
        !isOnlyLoadingReason(eligibility, ELIGIBILITY_LOADING_REASON.BALANCES)
      ) {
        return eligibility;
      }
      const balances = getBalancesStatus();
      if (balances.ready && !balances.loading) {
        return { canRun: true };
      }
      return eligibility;
    },
    [getBalancesStatus],
  );

  const waitForEligibilityReady = useCallback(async () => {
    const startedAt = Date.now();
    while (enabledRef.current) {
      const eligibility = normalizeEligibility(getSelectedEligibility());
      if (eligibility.reason !== ELIGIBILITY_REASON.LOADING) return true;
      const now = Date.now();
      if (now - startedAt > 60_000) {
        logMessage('eligibility wait timeout');
        return false;
      }
      const ok = await sleepAwareDelay(2);
      if (!ok) return false;
    }
    return false;
  }, [enabledRef, getSelectedEligibility, logMessage, normalizeEligibility]);

  const waitForStoppedDeployment = useCallback(
    async (serviceConfigId: string, timeoutSeconds: number) => {
      const DEPLOYMENT_CHECK_TIMEOUT_MS = 15_000;
      const getDeploymentWithTimeout = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          DEPLOYMENT_CHECK_TIMEOUT_MS,
        );
        try {
          return await ServicesService.getDeployment({
            serviceConfigId,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      };

      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutSeconds * 1000) {
        try {
          const deployment = await getDeploymentWithTimeout();
          const status = deployment?.status;
          const isActive =
            status === MiddlewareDeploymentStatusMap.DEPLOYED ||
            status === MiddlewareDeploymentStatusMap.DEPLOYING ||
            status === MiddlewareDeploymentStatusMap.STOPPING;
          if (!isActive) return true;
        } catch (error) {
          logMessage(
            `stop status check failed for ${serviceConfigId}: ${error}`,
          );
        }
        const waitOk = await sleepAwareDelay(5);
        if (!waitOk) return false;
      }
      logMessage(`stop timeout (deployment status): ${serviceConfigId}`);
      return false;
    },
    [logMessage],
  );

  const startAgentWithRetries = useCallback(
    async (agentType: AgentType): Promise<AutoRunStartResult> => {
      {
        if (!enabledRef.current) {
          return { status: AUTO_RUN_START_STATUS.ABORTED };
        }
        const meta = configuredAgents.find(
          (agent) => agent.agentType === agentType,
        );
        if (!meta) {
          logMessage(`start: ${agentType} not configured`);
          return {
            status: AUTO_RUN_START_STATUS.AGENT_BLOCKED,
            reason: 'Not configured',
          };
        }
        const agentName = meta.agentConfig.displayName;
        updateAgentType(agentType);
        const selectionReady = await waitForAgentSelection(
          agentType,
          meta.serviceConfigId,
        );
        if (!selectionReady) {
          return { status: AUTO_RUN_START_STATUS.ABORTED };
        }
        const balancesReady = await waitForBalancesReady();
        if (!balancesReady) {
          return { status: AUTO_RUN_START_STATUS.ABORTED };
        }
        const eligibilityReady = await waitForEligibilityReady();
        if (!eligibilityReady) {
          return { status: AUTO_RUN_START_STATUS.ABORTED };
        }
        const eligibility = normalizeEligibility(getSelectedEligibility());
        if (!eligibility.canRun) {
          const reason = formatEligibilityReason(eligibility);
          notifySkipOnce(agentType, reason);
          return { status: AUTO_RUN_START_STATUS.AGENT_BLOCKED, reason };
        }

        onAutoRunStartStateChange?.(true);
        let lastInfraError = 'unknown';
        try {
          for (
            let attempt = 0;
            attempt < RETRY_BACKOFF_SECONDS.length;
            attempt += 1
          ) {
            if (!enabledRef.current) {
              return { status: AUTO_RUN_START_STATUS.ABORTED };
            }
            // If the service deployed during the previous attempt's backoff period,
            // accept it without calling startService() again.
            if (runningAgentTypeRef.current === agentType) {
              onAutoRunAgentStarted?.(agentType);
              return { status: AUTO_RUN_START_STATUS.STARTED };
            }
            try {
              await withOperationTimeout(
                startService({
                  agentType,
                  agentConfig: meta.agentConfig,
                  service: meta.service,
                  stakingProgramId: meta.stakingProgramId,
                  createSafeIfNeeded: () => createSafeIfNeeded(meta),
                }),
                START_OPERATION_TIMEOUT_SECONDS,
                `start operation for ${agentType}`,
              );

              const deployed = await waitForRunningAgent(
                agentType,
                START_TIMEOUT_SECONDS,
              );
              if (deployed) {
                onAutoRunAgentStarted?.(agentType);
                return { status: AUTO_RUN_START_STATUS.STARTED };
              }
              lastInfraError = 'running timeout';
              logMessage(
                `start timeout for ${agentType} (attempt ${attempt + 1})`,
              );
            } catch (error) {
              lastInfraError = `${error}`;
              logMessage(`start error for ${agentType}: ${error}`);
            }
            const retryOk = await sleepAwareDelay(
              RETRY_BACKOFF_SECONDS[attempt],
            );
            if (!retryOk) {
              return { status: AUTO_RUN_START_STATUS.ABORTED };
            }
          }
        } finally {
          onAutoRunStartStateChange?.(false);
        }
        notifyStartFailed(showNotification, agentName);
        logMessage(`start failed for ${agentType}`);
        return {
          status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          reason: lastInfraError,
        };
      }
    },
    [
      enabledRef,
      runningAgentTypeRef,
      configuredAgents,
      updateAgentType,
      waitForAgentSelection,
      waitForBalancesReady,
      waitForEligibilityReady,
      normalizeEligibility,
      getSelectedEligibility,
      notifySkipOnce,
      logMessage,
      startService,
      createSafeIfNeeded,
      waitForRunningAgent,
      onAutoRunAgentStarted,
      onAutoRunStartStateChange,
      showNotification,
    ],
  );

  const stopAgentOnce = useCallback(
    async (agentType: AgentType, serviceConfigId: string) => {
      try {
        await withOperationTimeout(
          ServicesService.stopDeployment(serviceConfigId),
          60,
          `stop request for ${serviceConfigId}`,
        );
      } catch (error) {
        logMessage(`stop failed for ${serviceConfigId}: ${error}`);
      }
      const stoppedByDeployment = await waitForStoppedDeployment(
        serviceConfigId,
        START_TIMEOUT_SECONDS,
      );
      if (stoppedByDeployment) return true;
      return runningAgentTypeRef.current !== agentType;
    },
    [logMessage, runningAgentTypeRef, waitForStoppedDeployment],
  );

  const stopAgentWithRecovery = useCallback(
    async (agentType: AgentType, serviceConfigId: string) => {
      for (
        let attempt = 0;
        attempt < STOP_RECOVERY_MAX_ATTEMPTS;
        attempt += 1
      ) {
        const stopOk = await stopAgentOnce(agentType, serviceConfigId);
        if (stopOk) return true;
        if (attempt >= STOP_RECOVERY_MAX_ATTEMPTS - 1) break;
        logMessage(
          `stop retry for ${agentType} (${attempt + 2}/${STOP_RECOVERY_MAX_ATTEMPTS}) in ${STOP_RECOVERY_RETRY_SECONDS}s`,
        );
        const retryOk = await sleepAwareDelay(STOP_RECOVERY_RETRY_SECONDS);
        if (!retryOk) return false;
      }
      return false;
    },
    [logMessage, stopAgentOnce],
  );

  const {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
  } = useAutoRunScanner({
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
  });

  const startSelectedAgentIfEligibleRef = useRef(startSelectedAgentIfEligible);
  const scanAndStartNextRef = useRef(scanAndStartNext);
  const getPreferredStartFromRef = useRef(getPreferredStartFrom);

  useEffect(() => {
    startSelectedAgentIfEligibleRef.current = startSelectedAgentIfEligible;
    scanAndStartNextRef.current = scanAndStartNext;
    getPreferredStartFromRef.current = getPreferredStartFrom;
  }, [getPreferredStartFrom, scanAndStartNext, startSelectedAgentIfEligible]);

  const rotateToNext = useCallback(
    async (currentAgentType: AgentType) => {
      const otherAgents = orderedIncludedAgentTypes.filter(
        (agentType) => agentType !== currentAgentType,
      );
      if (otherAgents.length === 0) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return;
      }

      const refreshed = await Promise.all(
        otherAgents.map((agentType) => refreshRewardsEligibility(agentType)),
      );
      const rewardStates = otherAgents.map(
        (agentType, index) => refreshed[index] ?? getRewardSnapshot(agentType),
      );
      const allEarnedOrUnknown = rewardStates.every((state) => state !== false);
      if (allEarnedOrUnknown) {
        logMessage(
          `all other agents earned or unknown, keeping ${currentAgentType} running, rescan in ${SCAN_ELIGIBLE_DELAY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return;
      }

      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return;
      if (!enabledRef.current) return;

      const stopOk = await stopAgentWithRecovery(
        currentMeta.agentType,
        currentMeta.serviceConfigId,
      );
      if (!stopOk) {
        logMessage(`stop timeout for ${currentAgentType}, aborting rotation`);
        // Reset rewards guard so the next poll cycle can re-trigger rotation
        // instead of being blocked by the previousEligibility === true check.
        lastRewardsEligibilityRef.current[currentAgentType] = undefined;
        stopRetryBackoffUntilRef.current[currentAgentType] =
          Date.now() + SCAN_BLOCKED_DELAY_SECONDS * 1000;
        logMessage(
          `reset rewards guard for ${currentAgentType}, scheduling rescan in ${SCAN_BLOCKED_DELAY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
        return;
      }
      stopRetryBackoffUntilRef.current[currentAgentType] = undefined;
      if (!enabledRef.current) return;
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      await scanAndStartNextRef.current(currentAgentType);
    },
    [
      configuredAgents,
      enabledRef,
      getRewardSnapshot,
      logMessage,
      orderedIncludedAgentTypes,
      refreshRewardsEligibility,
      scheduleNextScan,
      stopAgentWithRecovery,
      lastRewardsEligibilityRef,
      stopRetryBackoffUntilRef,
    ],
  );

  const stopRunningAgent = useCallback(
    async (currentAgentType?: AgentType | null) => {
      if (!currentAgentType) return false;
      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return false;
      return stopAgentWithRecovery(
        currentMeta.agentType,
        currentMeta.serviceConfigId,
      );
    },
    [configuredAgents, stopAgentWithRecovery],
  );

  // Stop the currently running agent without requiring a caller to pass a type.
  const stopCurrentRunningAgent = useCallback(async () => {
    if (!runningAgentType) return false;
    return stopRunningAgent(runningAgentType);
  }, [runningAgentType, stopRunningAgent]);

  // Rotation when current agent earns rewards (false -> true).
  useEffect(() => {
    if (!enabled) return;
    if (isRotatingRef.current) return;

    const currentType = runningAgentType;
    if (!currentType) return;

    let isActive = true;
    const checkRewardsAndRotate = async () => {
      isRotatingRef.current = true;
      try {
        const refreshed = await refreshRewardsEligibility(currentType);
        if (!isActive) return;
        const snapshot =
          refreshed === undefined ? getRewardSnapshot(currentType) : refreshed;
        const previousEligibility =
          lastRewardsEligibilityRef.current[currentType];
        lastRewardsEligibilityRef.current[currentType] = snapshot;
        if (snapshot !== true) return;
        if (previousEligibility === true) return;
        const stopRetryBackoffUntil =
          stopRetryBackoffUntilRef.current[currentType] ?? 0;
        if (Date.now() < stopRetryBackoffUntil) return;
        logMessage(`rotation triggered: ${currentType} earned rewards`);
        await rotateToNext(currentType);
      } catch (error) {
        logMessage(`rotation error: ${error}`);
      } finally {
        isRotatingRef.current = false;
      }
    };

    checkRewardsAndRotate();
    return () => {
      isActive = false;
    };
  }, [
    enabled,
    getRewardSnapshot,
    logMessage,
    refreshRewardsEligibility,
    rotateToNext,
    runningAgentType,
    rewardsTick,
    scanTick,
    lastRewardsEligibilityRef,
    stopRetryBackoffUntilRef,
  ]);

  // Poll rewards for the running agent to allow rotation even when viewing others.
  useEffect(() => {
    if (!enabled) return;
    if (!runningAgentType) return;

    const interval = setInterval(() => {
      refreshRewardsEligibility(runningAgentType);
    }, REWARDS_POLL_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [enabled, refreshRewardsEligibility, runningAgentType]);

  // When enabled and nothing is running, start selected or scan for the next.
  // Skip cooldown on first enable, but keep cooldown after manual stops.
  useEffect(() => {
    const wasEnabled = wasAutoRunEnabledRef.current;
    wasAutoRunEnabledRef.current = enabled;
    if (!enabled) return;
    if (runningAgentType) return;
    if (isRotatingRef.current) return;

    isRotatingRef.current = true;
    let reachedScan = false;
    const startNext = async () => {
      const preferredStartFrom = getPreferredStartFromRef.current();
      if (!wasEnabled) {
        const startOk = await sleepAwareDelay(AUTO_RUN_START_DELAY_SECONDS);
        if (!startOk) return;
        if (!enabledRef.current || runningAgentTypeRef.current) return;
        const startedSelected = await startSelectedAgentIfEligibleRef.current();
        if (startedSelected) return;
        reachedScan = true;
        await scanAndStartNextRef.current(preferredStartFrom);
        return;
      }
      // Auto-run was already enabled but the agent stopped (e.g. sleep/wake,
      // backend crash, manual stop via backend). Try to resume the previously
      // running agent first — selectedAgentType is still set to it because
      // updateAgentType was called when it started. If it can't run (earned
      // rewards, low balance, etc.), fall through to scanning.
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      const resumedSelected = await startSelectedAgentIfEligibleRef.current();
      if (resumedSelected) return;
      reachedScan = true;
      await scanAndStartNextRef.current(preferredStartFrom);
    };

    startNext()
      .catch((error) => logMessage(`manual stop start error: ${error}`))
      .finally(() => {
        isRotatingRef.current = false;
        // Safety net: if auto-run is still on but nothing started and we
        // never reached scanAndStartNext (e.g. sleep bail-out interrupted
        // the flow before a scan was scheduled), ensure the loop retries.
        // Skip if scan already ran — it schedules its own delay internally.
        if (
          !reachedScan &&
          enabledRef.current &&
          !runningAgentTypeRef.current
        ) {
          logMessage(
            `safety net: flow interrupted before scan, retrying in ${COOLDOWN_SECONDS}s`,
          );
          scheduleNextScan(COOLDOWN_SECONDS);
        }
      });
  }, [
    enabled,
    getPreferredStartFrom,
    logMessage,
    runningAgentType,
    scanAndStartNext,
    scanTick,
    scheduleNextScan,
    startSelectedAgentIfEligible,
    runningAgentTypeRef,
    enabledRef,
  ]);

  return {
    stopRunningAgent: stopCurrentRunningAgent,
  };
};
