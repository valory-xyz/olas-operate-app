import { MutableRefObject, useCallback, useRef } from 'react';

import { AgentType } from '@/constants';
import { sleepAwareDelay, withTimeout } from '@/utils/delay';

import {
  AUTO_RUN_HEALTH_METRIC,
  AUTO_RUN_START_STATUS,
  AutoRunHealthMetricNoRotation,
  AutoRunStartResult,
  RETRY_BACKOFF_SECONDS,
  START_TIMEOUT_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import { getInstanceDisplayNames, notifyStartFailed } from '../utils/utils';

type UseAutoRunStartOperationsParams = {
  enabledRef: MutableRefObject<boolean>;
  runningServiceConfigIdRef: MutableRefObject<string | null>;
  configuredAgents: AgentMeta[];
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  startService: (params: {
    agentType: AgentType;
    agentConfig: AgentMeta['agentConfig'];
    service: AgentMeta['service'];
    stakingProgramId: AgentMeta['stakingProgramId'];
    createSafeIfNeeded: () => Promise<void>;
  }) => Promise<unknown>;
  waitForBalancesReady: () => Promise<boolean>;
  waitForRunningInstance: (
    serviceConfigId: string,
    timeoutSeconds: number,
  ) => Promise<boolean>;
  onAutoRunInstanceStarted?: (serviceConfigId: string) => void;
  onAutoRunStartStateChange?: (isStarting: boolean) => void;
  showNotification?: (title: string, body?: string) => void;
  recordMetric: (metric: AutoRunHealthMetricNoRotation) => void;
  logMessage: (message: string) => void;
  logVerbose: (message: string) => void;
};

export const useAutoRunStartOperations = ({
  enabledRef,
  runningServiceConfigIdRef,
  configuredAgents,
  createSafeIfNeeded,
  startService,
  waitForBalancesReady,
  waitForRunningInstance,
  onAutoRunInstanceStarted,
  onAutoRunStartStateChange,
  showNotification,
  recordMetric,
  logMessage,
  logVerbose,
}: UseAutoRunStartOperationsParams) => {
  const startOperationSeqRef = useRef(0);

  const startAgentWithRetries = useCallback(
    async (serviceConfigId: string): Promise<AutoRunStartResult> => {
      if (!enabledRef.current) {
        return { status: AUTO_RUN_START_STATUS.ABORTED };
      }
      const meta = configuredAgents.find(
        (agent) => agent.serviceConfigId === serviceConfigId,
      );
      if (!meta) {
        logMessage(`start: ${serviceConfigId} not configured`);
        return {
          status: AUTO_RUN_START_STATUS.AGENT_BLOCKED,
          reason: 'Not configured',
        };
      }

      startOperationSeqRef.current += 1;
      const opId = `start-${startOperationSeqRef.current}-${serviceConfigId}`;
      logVerbose(
        `op=${opId} phase=start_prepare service=${meta.serviceConfigId} agent=${meta.agentType}`,
      );

      // Lightweight global balance gate before the expensive start call.
      const balancesReady = await waitForBalancesReady();
      if (!balancesReady) {
        return { status: AUTO_RUN_START_STATUS.ABORTED };
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
          if (runningServiceConfigIdRef.current === serviceConfigId) {
            logVerbose(
              `op=${opId} phase=start_confirm status=already_running service=${meta.serviceConfigId} agent=${meta.agentType}`,
            );
            onAutoRunInstanceStarted?.(serviceConfigId);
            return { status: AUTO_RUN_START_STATUS.STARTED };
          }
          try {
            logVerbose(
              `op=${opId} phase=start_request status=begin attempt=${attempt + 1} service=${meta.serviceConfigId} agent=${meta.agentType}`,
            );
            await withTimeout(
              startService({
                agentType: meta.agentType,
                agentConfig: meta.agentConfig,
                service: meta.service,
                stakingProgramId: meta.stakingProgramId,
                createSafeIfNeeded: () => createSafeIfNeeded(meta),
              }),
              START_TIMEOUT_SECONDS * 1000,
              () =>
                new Error(
                  `start operation for ${serviceConfigId} timed out after ${START_TIMEOUT_SECONDS}s`,
                ),
            );
            logVerbose(
              `op=${opId} phase=start_request status=ok attempt=${attempt + 1} service=${meta.serviceConfigId} agent=${meta.agentType}`,
            );

            const deployed = await waitForRunningInstance(
              serviceConfigId,
              START_TIMEOUT_SECONDS,
            );
            if (deployed) {
              logVerbose(
                `op=${opId} phase=start_confirm status=ok attempt=${attempt + 1} service=${meta.serviceConfigId} agent=${meta.agentType}`,
              );
              onAutoRunInstanceStarted?.(serviceConfigId);
              return { status: AUTO_RUN_START_STATUS.STARTED };
            }

            lastInfraError = 'running timeout';
            recordMetric(AUTO_RUN_HEALTH_METRIC.START_ERRORS);
            logMessage(
              `op=${opId} phase=start_confirm status=timeout attempt=${attempt + 1} service=${meta.serviceConfigId} agent=${meta.agentType}`,
            );
          } catch (error) {
            lastInfraError = `${error}`;
            recordMetric(AUTO_RUN_HEALTH_METRIC.START_ERRORS);
            logMessage(
              `op=${opId} phase=start_request status=error attempt=${attempt + 1} service=${meta.serviceConfigId} agent=${meta.agentType} error=${error}`,
            );
          }

          const retryOk = await sleepAwareDelay(RETRY_BACKOFF_SECONDS[attempt]);
          if (!retryOk) {
            if (!enabledRef.current) {
              return { status: AUTO_RUN_START_STATUS.ABORTED };
            }
            logMessage(
              `op=${opId} phase=start_retry status=interrupted service=${meta.serviceConfigId} agent=${meta.agentType}`,
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

      const { agentName, instanceName } = getInstanceDisplayNames(
        serviceConfigId,
        configuredAgents,
      );
      notifyStartFailed(showNotification, agentName, instanceName);
      logMessage(
        `op=${opId} phase=start_final status=failed service=${meta.serviceConfigId} agent=${meta.agentType} reason=${lastInfraError}`,
      );
      return {
        status: AUTO_RUN_START_STATUS.INFRA_FAILED,
        reason: lastInfraError,
      };
    },
    [
      enabledRef,
      runningServiceConfigIdRef,
      configuredAgents,
      waitForBalancesReady,
      waitForRunningInstance,
      logMessage,
      logVerbose,
      startService,
      createSafeIfNeeded,
      onAutoRunInstanceStarted,
      onAutoRunStartStateChange,
      recordMetric,
      showNotification,
    ],
  );

  return {
    startAgentWithRetries,
  };
};
