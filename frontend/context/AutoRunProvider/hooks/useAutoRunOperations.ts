import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { AgentType, isActiveDeploymentStatus } from '@/constants';
import { ServicesService } from '@/service/Services';
import { sleepAwareDelay, withTimeout } from '@/utils/delay';

import {
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  AUTO_RUN_START_STATUS,
  AutoRunStartResult,
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  RETRY_BACKOFF_SECONDS,
  START_TIMEOUT_SECONDS,
  STOP_RECOVERY_MAX_ATTEMPTS,
  STOP_RECOVERY_RETRY_SECONDS,
  STOP_REQUEST_TIMEOUT_SECONDS,
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

const ELIGIBILITY_WAIT_TIMEOUT_MS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000;
const DEPLOYMENT_CHECK_TIMEOUT_MS = 15_000; // 15 seconds

type Eligibility = {
  canRun: boolean;
  reason?: string;
  loadingReason?: string;
};

type UseAutoRunOperationsParams = {
  enabled: boolean;
  enabledRef: MutableRefObject<boolean>;
  runningAgentTypeRef: MutableRefObject<AgentType | null>;
  configuredAgents: AgentMeta[];
  updateAgentType: (agentType: AgentType) => void;
  getSelectedEligibility: () => Eligibility;
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  showNotification?: (title: string, body?: string) => void;
  onAutoRunAgentStarted?: (agentType: AgentType) => void;
  onAutoRunStartStateChange?: (isStarting: boolean) => void;
  startService: (params: {
    agentType: AgentType;
    agentConfig: AgentMeta['agentConfig'];
    service: AgentMeta['service'];
    stakingProgramId: AgentMeta['stakingProgramId'];
    createSafeIfNeeded: () => Promise<void>;
  }) => Promise<unknown>;
  waitForAgentSelection: (
    agentType: AgentType,
    serviceConfigId?: string | null,
  ) => Promise<boolean>;
  waitForBalancesReady: () => Promise<boolean>;
  waitForRunningAgent: (
    agentType: AgentType,
    timeoutSeconds: number,
  ) => Promise<boolean>;
  getBalancesStatus: () => { ready: boolean; loading: boolean };
  getRewardSnapshot: (agentType: AgentType) => boolean | undefined;
  setRewardSnapshot: (agentType: AgentType, value: boolean | undefined) => void;
  logMessage: (message: string) => void;
};

/**
 * Operation-level primitives used by scanner/lifecycle.
 *
 * Example path:
 * 1) Scanner chooses `memeooorr`
 * 2) `startAgentWithRetries` validates selection/balances/eligibility
 * 3) Start is attempted with timeout + retry backoff
 * 4) On success it returns `STARTED`, otherwise a structured failure reason
 */
export const useAutoRunOperations = ({
  enabled,
  enabledRef,
  runningAgentTypeRef,
  configuredAgents,
  updateAgentType,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
  onAutoRunAgentStarted,
  onAutoRunStartStateChange,
  startService,
  waitForAgentSelection,
  waitForBalancesReady,
  waitForRunningAgent,
  getBalancesStatus,
  getRewardSnapshot,
  setRewardSnapshot,
  logMessage,
}: UseAutoRunOperationsParams) => {
  // Track per-agent skip reason to avoid spamming notifications.
  const skipNotifiedRef = useRef<Partial<Record<AgentType, string>>>({});
  // Throttle rewards fetch per agent to avoid spamming the API.
  const lastRewardsFetchRef = useRef<Partial<Record<AgentType, number>>>({});

  useEffect(() => {
    if (!enabled) {
      skipNotifiedRef.current = {};
    }
  }, [enabled]);

  /**
   * Reads reward eligibility for any agent, with per-agent throttling.
   *
   * Example:
   * - scanner checks `trader` twice within 2 minutes
   * - first call may fetch from RPC, second call returns cached snapshot
   */
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

  /**
   * Sends one skip notification per unique reason for an agent while auto-run is enabled.
   * Loading reasons are intentionally ignored to prevent noisy UX.
   *
   * Example:
   * - `optimus` low balance -> notify once
   * - subsequent `optimus` low balance in same session -> no duplicate notify
   */
  const notifySkipOnce = useCallback(
    (agentType: AgentType, reason?: string, isLoadingReason = false) => {
      if (!reason) return;
      if (isLoadingReason) return;
      if (skipNotifiedRef.current[agentType] === reason) return;
      skipNotifiedRef.current[agentType] = reason;
      notifySkipped(showNotification, getAgentDisplayName(agentType), reason);
      logMessage(`skip ${agentType}: ${reason}`);
    },
    [logMessage, showNotification],
  );

  /**
   * Normalizes deployability output into auto-run behavior.
   *
   * Key policy:
   * - `Another agent running` is treated as transient loading
   * - stale `Loading: Balances` is promoted to runnable when global balances
   *   are already ready
   *
   * Example:
   * - deployability says `Loading: Balances`
   * - balances context is ready
   * - normalized result becomes `{ canRun: true }`
   */
  const normalizeEligibility = useCallback(
    (eligibility: Eligibility) => {
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

  /**
   * Waits for selected-agent eligibility to leave loading state.
   *
   * Example:
   * - while selected agent is still loading balances/safe/staking info,
   *   keep polling every 2 seconds
   * - return false on timeout/disable/sleep interruption
   */
  const waitForEligibilityReady = useCallback(async () => {
    const startedAt = Date.now();
    while (enabledRef.current) {
      const eligibility = normalizeEligibility(getSelectedEligibility());
      if (eligibility.reason !== ELIGIBILITY_REASON.LOADING) return true;
      const now = Date.now();
      if (now - startedAt > ELIGIBILITY_WAIT_TIMEOUT_MS) {
        logMessage('eligibility wait timeout');
        return false;
      }
      const ok = await sleepAwareDelay(2);
      if (!ok) return false;
    }
    return false;
  }, [enabledRef, getSelectedEligibility, logMessage, normalizeEligibility]);

  /**
   * Polls deployment status until service is no longer active.
   *
   * Example:
   * - status transitions `DEPLOYED -> STOPPING -> STOPPED`
   * - function returns true once status exits active set
   */
  const waitForStoppedDeployment = useCallback(
    async (serviceConfigId: string, timeoutSeconds: number) => {
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
          if (!isActiveDeploymentStatus(deployment?.status)) return true;
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

  /**
   * Full guarded start flow with retries for one candidate.
   *
   * Flow:
   * 1) select candidate
   * 2) wait for selection/balances/eligibility
   * 3) start service with timeout
   * 4) confirm running agent
   * 5) retry with backoff on transient infra failures
   *
   * Example:
   * - attempt 1 fails (`Failed to fetch`)
   * - backoff 15s
   * - attempt 2 succeeds and running is confirmed
   */
  const startAgentWithRetries = useCallback(
    async (agentType: AgentType): Promise<AutoRunStartResult> => {
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
        const isLoadingReason =
          eligibility.reason === ELIGIBILITY_REASON.LOADING;
        notifySkipOnce(agentType, reason, isLoadingReason);
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
            await withTimeout(
              startService({
                agentType,
                agentConfig: meta.agentConfig,
                service: meta.service,
                stakingProgramId: meta.stakingProgramId,
                createSafeIfNeeded: () => createSafeIfNeeded(meta),
              }),
              START_TIMEOUT_SECONDS * 1000,
              () =>
                new Error(
                  `start operation for ${agentType} timed out after ${START_TIMEOUT_SECONDS}s`,
                ),
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

          const retryOk = await sleepAwareDelay(RETRY_BACKOFF_SECONDS[attempt]);
          if (!retryOk) {
            if (!enabledRef.current) {
              return { status: AUTO_RUN_START_STATUS.ABORTED };
            }
            logMessage(
              `start retry interrupted for ${agentType}, scheduling rescan`,
            );
            return {
              status: AUTO_RUN_START_STATUS.INFRA_FAILED,
              reason: 'retry interrupted',
            };
          }
        }
      } finally {
        onAutoRunStartStateChange?.(false);
      }

      notifyStartFailed(showNotification, meta.agentConfig.displayName);
      logMessage(`start failed for ${agentType}`);
      return {
        status: AUTO_RUN_START_STATUS.INFRA_FAILED,
        reason: lastInfraError,
      };
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

  /**
   * Performs one stop attempt:
   * - send stop request
   * - confirm via deployment polling
   * - fallback to local running-agent signal
   *
   * Example:
   * - stop request times out
   * - deployment polling later observes STOPPED
   * - returns true
   */
  const stopAgentOnce = useCallback(
    async (agentType: AgentType, serviceConfigId: string) => {
      // Send stop request then confirm from deployment status, not only local running state.
      try {
        await withTimeout(
          ServicesService.stopDeployment(serviceConfigId),
          STOP_REQUEST_TIMEOUT_SECONDS * 1000,
          () =>
            new Error(
              `stop request for ${serviceConfigId} timed out after ${STOP_REQUEST_TIMEOUT_SECONDS}s`,
            ),
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

  /**
   * Stop recovery loop with bounded retries.
   *
   * Example:
   * - attempt 1 fails to confirm stop
   * - wait configured retry delay
   * - attempt 2 confirms stop and exits
   */
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

  return {
    refreshRewardsEligibility,
    notifySkipOnce,
    startAgentWithRetries,
    stopAgentWithRecovery,
  };
};
