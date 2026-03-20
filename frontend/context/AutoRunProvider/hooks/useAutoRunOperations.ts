import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';

import {
  AUTO_RUN_HEALTH_METRIC,
  AutoRunHealthMetricNoRotation,
} from '../constants';
import { AgentMeta } from '../types';
import { refreshRewardsEligibility as refreshRewardsEligibilityHelper } from '../utils/autoRunHelpers';
import { getInstanceDisplayNames, notifySkipped } from '../utils/utils';
import { useAutoRunStartOperations } from './useAutoRunStartOperations';
import { useAutoRunStopOperations } from './useAutoRunStopOperations';
import { useAutoRunVerboseLogger } from './useAutoRunVerboseLogger';

type Eligibility = {
  canRun: boolean;
  reason?: string;
  loadingReason?: string;
};

type UseAutoRunOperationsParams = {
  enabled: boolean;
  enabledRef: MutableRefObject<boolean>;
  runningServiceConfigIdRef: MutableRefObject<string | null>;
  configuredAgents: AgentMeta[];
  updateSelectedServiceConfigId: (serviceConfigId: string) => void;
  getSelectedEligibility: () => Eligibility;
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  showNotification?: (title: string, body?: string) => void;
  onAutoRunInstanceStarted?: (serviceConfigId: string) => void;
  onAutoRunStartStateChange?: (isStarting: boolean) => void;
  startService: (params: {
    agentType: AgentType;
    agentConfig: AgentMeta['agentConfig'];
    service: AgentMeta['service'];
    stakingProgramId: AgentMeta['stakingProgramId'];
    createSafeIfNeeded: () => Promise<void>;
  }) => Promise<unknown>;
  waitForInstanceSelection: (serviceConfigId: string) => Promise<boolean>;
  waitForBalancesReady: () => Promise<boolean>;
  waitForRunningInstance: (
    serviceConfigId: string,
    timeoutSeconds: number,
  ) => Promise<boolean>;
  getBalancesStatus: () => { ready: boolean; loading: boolean };
  getRewardSnapshot: (serviceConfigId: string) => boolean | undefined;
  setRewardSnapshot: (
    serviceConfigId: string,
    value: boolean | undefined,
  ) => void;
  recordMetric: (metric: AutoRunHealthMetricNoRotation) => void;
  logMessage: (message: string) => void;
};

/**
 * Composes operational primitives used by scanner/lifecycle:
 * - rewards refresh + skip notifications
 * - guarded start with retries
 * - stop with deployment confirmation and recovery retries
 */
export const useAutoRunOperations = ({
  enabled,
  enabledRef,
  runningServiceConfigIdRef,
  configuredAgents,
  updateSelectedServiceConfigId,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
  onAutoRunInstanceStarted,
  onAutoRunStartStateChange,
  startService,
  waitForInstanceSelection,
  waitForBalancesReady,
  waitForRunningInstance,
  getBalancesStatus,
  getRewardSnapshot,
  setRewardSnapshot,
  recordMetric,
  logMessage,
}: UseAutoRunOperationsParams) => {
  const logVerbose = useAutoRunVerboseLogger(logMessage);

  // Track per-instance skip reason to avoid spamming notifications.
  const skipNotifiedRef = useRef<Partial<Record<string, string>>>({});
  // Throttle rewards fetch per instance to avoid spamming the API.
  const lastRewardsFetchRef = useRef<Partial<Record<string, number>>>({});

  useEffect(() => {
    if (!enabled) {
      skipNotifiedRef.current = {};
    }
  }, [enabled]);

  const refreshRewardsEligibility = useCallback(
    (serviceConfigId: string) =>
      refreshRewardsEligibilityHelper({
        serviceConfigId,
        configuredAgents,
        lastRewardsFetchRef,
        getRewardSnapshot,
        setRewardSnapshot,
        logMessage,
        onRewardsFetchError: () =>
          recordMetric(AUTO_RUN_HEALTH_METRIC.REWARDS_ERRORS),
      }),
    [
      configuredAgents,
      getRewardSnapshot,
      logMessage,
      recordMetric,
      setRewardSnapshot,
    ],
  );

  const notifySkipOnce = useCallback(
    (serviceConfigId: string, reason?: string, isLoadingReason = false) => {
      if (!reason) return;
      if (isLoadingReason) return;
      if (skipNotifiedRef.current[serviceConfigId] === reason) return;
      skipNotifiedRef.current[serviceConfigId] = reason;
      const { agentName, instanceName } = getInstanceDisplayNames(
        serviceConfigId,
        configuredAgents,
      );
      notifySkipped(showNotification, agentName, instanceName, reason);
      logMessage(`skip ${serviceConfigId}: ${reason}`);
    },
    [configuredAgents, logMessage, showNotification],
  );

  const { startAgentWithRetries } = useAutoRunStartOperations({
    enabledRef,
    runningServiceConfigIdRef,
    configuredAgents,
    updateSelectedServiceConfigId,
    getSelectedEligibility,
    createSafeIfNeeded,
    startService,
    waitForInstanceSelection,
    waitForBalancesReady,
    waitForRunningInstance,
    getBalancesStatus,
    notifySkipOnce,
    onAutoRunInstanceStarted,
    onAutoRunStartStateChange,
    showNotification,
    recordMetric,
    logMessage,
    logVerbose,
  });

  const { stopAgentWithRecovery } = useAutoRunStopOperations({
    runningServiceConfigIdRef,
    recordMetric,
    logMessage,
    logVerbose,
  });

  return {
    refreshRewardsEligibility,
    notifySkipOnce,
    startAgentWithRetries,
    stopAgentWithRecovery,
  };
};
