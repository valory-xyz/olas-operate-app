import { MutableRefObject, useCallback, useRef } from 'react';

import { AgentType, isRunningDeploymentStatus } from '@/constants';
import { PrestartCheckFailedError } from '@/hooks/useStartService';
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
import { probeDeploymentStatus } from '../utils/probeDeployment';
import { getInstanceDisplayNames, notifyStartFailed } from '../utils/utils';

type UseAutoRunStartOperationsParams = {
  enabledRef: MutableRefObject<boolean>;
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
  notifySkipOnce: (serviceConfigId: string, reason?: string) => void;
  recordMetric: (metric: AutoRunHealthMetricNoRotation) => void;
  logMessage: (message: string) => void;
  logVerbose: (message: string) => void;
};

export const useAutoRunStartOperations = ({
  enabledRef,
  configuredAgents,
  createSafeIfNeeded,
  startService,
  waitForBalancesReady,
  waitForRunningInstance,
  onAutoRunInstanceStarted,
  onAutoRunStartStateChange,
  showNotification,
  notifySkipOnce,
  recordMetric,
  logMessage,
  logVerbose,
}: UseAutoRunStartOperationsParams) => {
  const startOperationSeqRef = useRef(0);

  /**
   * `isStillDue`, when given, is asked right before every start request:
   * the balance wait and retries can outlast the read that chose the agent.
   */
  const startAgentWithRetries = useCallback(
    async (
      serviceConfigId: string,
      options: { isStillDue?: () => Promise<boolean> } = {},
    ): Promise<AutoRunStartResult> => {
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
        // Balances can be unready because auto-run was disabled, or just because
        // this agent's balances timed out. Only stop the rotation when disabled;
        // otherwise report a transient failure so the scanner tries other agents.
        if (!enabledRef.current) {
          return { status: AUTO_RUN_START_STATUS.ABORTED };
        }
        return {
          status: AUTO_RUN_START_STATUS.INFRA_FAILED,
          reason: 'balances not ready',
        };
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
          // Cross-check real deployment status instead of trusting the cached
          // ref. The ref can be stale after a watchdog rotation stop, causing
          // a deadlock where the scheduler believes a dead agent is still
          // running. Note: short-circuits only on DEPLOYED/DEPLOYING — a
          // STOPPING deployment is *not* eligible to be treated as
          // already-running because a start in that window would race the
          // in-flight stop; falling through lets the existing retry/backoff
          // loop probe again once the stop completes.
          try {
            const deployment = await probeDeploymentStatus(serviceConfigId);
            if (isRunningDeploymentStatus(deployment?.status)) {
              logVerbose(
                `op=${opId} phase=start_confirm status=already_running service=${meta.serviceConfigId} agent=${meta.agentType}`,
              );
              onAutoRunInstanceStarted?.(serviceConfigId);
              return { status: AUTO_RUN_START_STATUS.STARTED };
            }
          } catch (error) {
            // GET failure (timeout/network) → treat as "not running" and
            // fall through to real start. Middleware start rejects cleanly
            // if a concurrent process moved the deployment to DEPLOYED.
            logVerbose(
              `op=${opId} phase=start_liveness_check status=error service=${meta.serviceConfigId} agent=${meta.agentType} error=${error} — falling through to real start`,
            );
          }
          if (options.isStillDue && !(await options.isStillDue())) {
            logMessage(
              `op=${opId} phase=start_request status=not_due service=${meta.serviceConfigId} agent=${meta.agentType}`,
            );
            return {
              status: AUTO_RUN_START_STATUS.AGENT_BLOCKED,
              reason: 'rewards status changed',
            };
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
            if (
              error instanceof PrestartCheckFailedError &&
              error.result.status === 'failed'
            ) {
              const codes = error.result.issues.map(({ code }) => code);
              logMessage(
                `op=${opId} phase=prestart_check status=failed service=${meta.serviceConfigId} agent=${meta.agentType} issues=${codes.join(',')}`,
              );
              notifySkipOnce(
                serviceConfigId,
                error.result.issues
                  .map(({ title, description }) => `${title}. ${description}`)
                  .join(' '),
              );
              return {
                status: AUTO_RUN_START_STATUS.AGENT_BLOCKED,
                reason: `Prestart check failed: ${codes.join(', ')}`,
              };
            }
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
      notifySkipOnce,
    ],
  );

  return {
    startAgentWithRetries,
  };
};
