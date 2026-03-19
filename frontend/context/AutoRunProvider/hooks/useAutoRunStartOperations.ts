import { MutableRefObject, useCallback, useRef } from 'react';

import { AgentType } from '@/constants';
import { sleepAwareDelay, withTimeout } from '@/utils/delay';

import {
  AGENT_SELECTION_WAIT_TIMEOUT_SECONDS,
  AUTO_RUN_HEALTH_METRIC,
  AUTO_RUN_START_STATUS,
  AutoRunHealthMetricNoRotation,
  AutoRunStartResult,
  ELIGIBILITY_REASON,
  RETRY_BACKOFF_SECONDS,
  START_TIMEOUT_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  formatEligibilityReason,
  normalizeEligibility as normalizeEligibilityHelper,
} from '../utils/autoRunHelpers';
import { notifyStartFailed } from '../utils/utils';

const ELIGIBILITY_WAIT_TIMEOUT_MS = AGENT_SELECTION_WAIT_TIMEOUT_SECONDS * 1000;

type Eligibility = {
  canRun: boolean;
  reason?: string;
  loadingReason?: string;
};

type UseAutoRunStartOperationsParams = {
  enabledRef: MutableRefObject<boolean>;
  runningAgentTypeRef: MutableRefObject<AgentType | null>;
  configuredAgents: AgentMeta[];
  updateAgentType: (agentType: AgentType) => void;
  getSelectedEligibility: () => Eligibility;
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  /** Defense-in-depth: also checked here in case the scanner guard is bypassed. */
  canSwitchAgentRef: MutableRefObject<boolean>;
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
  notifySkipOnce: (
    agentType: AgentType,
    reason?: string,
    isLoadingReason?: boolean,
  ) => void;
  onAutoRunAgentStarted?: (agentType: AgentType) => void;
  onAutoRunStartStateChange?: (isStarting: boolean) => void;
  showNotification?: (title: string, body?: string) => void;
  recordMetric: (metric: AutoRunHealthMetricNoRotation) => void;
  logMessage: (message: string) => void;
  logVerbose: (message: string) => void;
};

export const useAutoRunStartOperations = ({
  enabledRef,
  runningAgentTypeRef,
  configuredAgents,
  updateAgentType,
  getSelectedEligibility,
  createSafeIfNeeded,
  canSwitchAgentRef,
  startService,
  waitForAgentSelection,
  waitForBalancesReady,
  waitForRunningAgent,
  getBalancesStatus,
  notifySkipOnce,
  onAutoRunAgentStarted,
  onAutoRunStartStateChange,
  showNotification,
  recordMetric,
  logMessage,
  logVerbose,
}: UseAutoRunStartOperationsParams) => {
  const startOperationSeqRef = useRef(0);

  const normalizeEligibility = useCallback(
    (eligibility: Eligibility) =>
      normalizeEligibilityHelper(eligibility, getBalancesStatus),
    [getBalancesStatus],
  );

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

      startOperationSeqRef.current += 1;
      const opId = `start-${startOperationSeqRef.current}-${agentType}`;
      logVerbose(
        `op=${opId} phase=start_prepare agent=${agentType} service=${meta.serviceConfigId}`,
      );

      // Defense-in-depth: if user navigated away between the scanner gate and
      // here, abort rather than switching the visible agent.
      if (!canSwitchAgentRef.current) {
        return { status: AUTO_RUN_START_STATUS.ABORTED };
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
          if (runningAgentTypeRef.current === agentType) {
            logVerbose(
              `op=${opId} phase=start_confirm status=already_running agent=${agentType} service=${meta.serviceConfigId}`,
            );
            onAutoRunAgentStarted?.(agentType);
            return { status: AUTO_RUN_START_STATUS.STARTED };
          }
          try {
            logVerbose(
              `op=${opId} phase=start_request status=begin attempt=${attempt + 1} agent=${agentType} service=${meta.serviceConfigId}`,
            );
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
            logVerbose(
              `op=${opId} phase=start_request status=ok attempt=${attempt + 1} agent=${agentType} service=${meta.serviceConfigId}`,
            );

            const deployed = await waitForRunningAgent(
              agentType,
              START_TIMEOUT_SECONDS,
            );
            if (deployed) {
              logVerbose(
                `op=${opId} phase=start_confirm status=ok attempt=${attempt + 1} agent=${agentType} service=${meta.serviceConfigId}`,
              );
              onAutoRunAgentStarted?.(agentType);
              return { status: AUTO_RUN_START_STATUS.STARTED };
            }

            lastInfraError = 'running timeout';
            recordMetric(AUTO_RUN_HEALTH_METRIC.START_ERRORS);
            logMessage(
              `op=${opId} phase=start_confirm status=timeout attempt=${attempt + 1} agent=${agentType} service=${meta.serviceConfigId}`,
            );
          } catch (error) {
            lastInfraError = `${error}`;
            recordMetric(AUTO_RUN_HEALTH_METRIC.START_ERRORS);
            logMessage(
              `op=${opId} phase=start_request status=error attempt=${attempt + 1} agent=${agentType} service=${meta.serviceConfigId} error=${error}`,
            );
          }

          const retryOk = await sleepAwareDelay(RETRY_BACKOFF_SECONDS[attempt]);
          if (!retryOk) {
            if (!enabledRef.current) {
              return { status: AUTO_RUN_START_STATUS.ABORTED };
            }
            logMessage(
              `op=${opId} phase=start_retry status=interrupted agent=${agentType} service=${meta.serviceConfigId}`,
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
      logMessage(
        `op=${opId} phase=start_final status=failed agent=${agentType} service=${meta.serviceConfigId} reason=${lastInfraError}`,
      );
      return {
        status: AUTO_RUN_START_STATUS.INFRA_FAILED,
        reason: lastInfraError,
      };
    },
    [
      canSwitchAgentRef,
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
      logVerbose,
      startService,
      createSafeIfNeeded,
      waitForRunningAgent,
      onAutoRunAgentStarted,
      onAutoRunStartStateChange,
      recordMetric,
      showNotification,
    ],
  );

  return {
    startAgentWithRetries,
  };
};
