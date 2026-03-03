import { MutableRefObject, useCallback, useRef } from 'react';

import { AgentType, isActiveDeploymentStatus } from '@/constants';
import { ServicesService } from '@/service/Services';
import { sleepAwareDelay, withTimeout } from '@/utils/delay';

import {
  AUTO_RUN_HEALTH_METRIC,
  AutoRunHealthMetricNoRotation,
  START_TIMEOUT_SECONDS,
  STOP_RECOVERY_MAX_ATTEMPTS,
  STOP_RECOVERY_RETRY_SECONDS,
  STOP_REQUEST_TIMEOUT_SECONDS,
} from '../constants';

const DEPLOYMENT_CHECK_TIMEOUT_MS = 15_000; // 15 seconds

type UseAutoRunStopOperationsParams = {
  runningAgentTypeRef: MutableRefObject<AgentType | null>;
  recordMetric: (metric: AutoRunHealthMetricNoRotation) => void;
  logMessage: (message: string) => void;
  logVerbose: (message: string) => void;
};

export const useAutoRunStopOperations = ({
  runningAgentTypeRef,
  recordMetric,
  logMessage,
  logVerbose,
}: UseAutoRunStopOperationsParams) => {
  const stopOperationSeqRef = useRef(0);

  const waitForStoppedDeployment = useCallback(
    async (
      serviceConfigId: string,
      timeoutSeconds: number,
      opId: string,
      attempt: number,
    ) => {
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
      let checks = 0;
      let lastStatus: unknown = undefined;
      while (Date.now() - startedAt < timeoutSeconds * 1000) {
        try {
          const deployment = await getDeploymentWithTimeout();
          checks += 1;
          lastStatus = deployment?.status;
          if (!isActiveDeploymentStatus(deployment?.status)) {
            return {
              stopped: true,
              lastStatus,
              checks,
              elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
            };
          }
        } catch (error) {
          logVerbose(
            `op=${opId} phase=stop_confirm status=poll_error attempt=${attempt} service=${serviceConfigId} error=${error}`,
          );
        }
        const waitOk = await sleepAwareDelay(5);
        if (!waitOk) {
          return {
            stopped: false,
            lastStatus,
            checks,
            elapsedSeconds: Math.floor((Date.now() - startedAt) / 1000),
          };
        }
      }
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      logMessage(
        `op=${opId} phase=stop_confirm status=timeout attempt=${attempt} service=${serviceConfigId} checks=${checks} elapsed=${elapsedSeconds}s lastStatus=${String(lastStatus)}`,
      );
      return { stopped: false, lastStatus, checks, elapsedSeconds };
    },
    [logMessage, logVerbose],
  );

  const stopAgentOnce = useCallback(
    async (
      agentType: AgentType,
      serviceConfigId: string,
      opId: string,
      attempt: number,
    ) => {
      try {
        logVerbose(
          `op=${opId} phase=stop_request status=begin attempt=${attempt} agent=${agentType} service=${serviceConfigId}`,
        );
        await withTimeout(
          ServicesService.stopDeployment(serviceConfigId),
          STOP_REQUEST_TIMEOUT_SECONDS * 1000,
          () =>
            new Error(
              `stop request for ${serviceConfigId} timed out after ${STOP_REQUEST_TIMEOUT_SECONDS}s`,
            ),
        );
        logVerbose(
          `op=${opId} phase=stop_request status=ok attempt=${attempt} agent=${agentType} service=${serviceConfigId}`,
        );
      } catch (error) {
        logMessage(
          `op=${opId} phase=stop_request status=error attempt=${attempt} agent=${agentType} service=${serviceConfigId} error=${error}`,
        );
      }

      const stopResult = await waitForStoppedDeployment(
        serviceConfigId,
        START_TIMEOUT_SECONDS,
        opId,
        attempt,
      );
      if (stopResult.stopped) {
        logVerbose(
          `op=${opId} phase=stop_confirm status=ok attempt=${attempt} agent=${agentType} service=${serviceConfigId} checks=${stopResult.checks} elapsed=${stopResult.elapsedSeconds}s`,
        );
        return true;
      }

      const stoppedByRunningState = runningAgentTypeRef.current !== agentType;
      if (stoppedByRunningState) {
        logVerbose(
          `op=${opId} phase=stop_confirm status=local_fallback_ok attempt=${attempt} agent=${agentType} service=${serviceConfigId} runningAgent=${String(runningAgentTypeRef.current)}`,
        );
        return true;
      }

      logMessage(
        `op=${opId} phase=stop_confirm status=failed attempt=${attempt} agent=${agentType} service=${serviceConfigId} runningAgent=${String(runningAgentTypeRef.current)} lastStatus=${String(stopResult.lastStatus)} checks=${stopResult.checks} elapsed=${stopResult.elapsedSeconds}s`,
      );
      return false;
    },
    [logMessage, logVerbose, runningAgentTypeRef, waitForStoppedDeployment],
  );

  const stopAgentWithRecovery = useCallback(
    async (agentType: AgentType, serviceConfigId: string) => {
      stopOperationSeqRef.current += 1;
      const opId = `stop-${stopOperationSeqRef.current}-${agentType}`;
      for (
        let attempt = 0;
        attempt < STOP_RECOVERY_MAX_ATTEMPTS;
        attempt += 1
      ) {
        const stopOk = await stopAgentOnce(
          agentType,
          serviceConfigId,
          opId,
          attempt + 1,
        );
        if (stopOk) return true;
        if (attempt >= STOP_RECOVERY_MAX_ATTEMPTS - 1) break;
        logVerbose(
          `op=${opId} phase=stop_retry status=scheduled nextAttempt=${attempt + 2}/${STOP_RECOVERY_MAX_ATTEMPTS} wait=${STOP_RECOVERY_RETRY_SECONDS}s agent=${agentType} service=${serviceConfigId}`,
        );
        const retryOk = await sleepAwareDelay(STOP_RECOVERY_RETRY_SECONDS);
        if (!retryOk) return false;
      }
      recordMetric(AUTO_RUN_HEALTH_METRIC.STOP_TIMEOUTS);
      return false;
    },
    [logVerbose, recordMetric, stopAgentOnce],
  );

  return {
    stopAgentWithRecovery,
  };
};
