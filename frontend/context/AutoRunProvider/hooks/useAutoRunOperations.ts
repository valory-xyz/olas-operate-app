import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';

import {
  AUTO_RUN_HEALTH_METRIC,
  AutoRunHealthMetricNoRotation,
} from '../constants';
import { AgentMeta } from '../types';
import { refreshRewardsEligibility as refreshRewardsEligibilityHelper } from '../utils/autoRunHelpers';
import { getAgentDisplayName, notifySkipped } from '../utils/utils';
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
  runningAgentTypeRef: MutableRefObject<AgentType | null>;
  configuredAgents: AgentMeta[];
  updateAgentType: (agentType: AgentType) => void;
  getSelectedEligibility: () => Eligibility;
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  canSwitchAgentRef: MutableRefObject<boolean>;
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
  runningAgentTypeRef,
  configuredAgents,
  updateAgentType,
  getSelectedEligibility,
  createSafeIfNeeded,
  canSwitchAgentRef,
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
  recordMetric,
  logMessage,
}: UseAutoRunOperationsParams) => {
  const logVerbose = useAutoRunVerboseLogger(logMessage);

  // Track per-agent skip reason to avoid spamming notifications.
  const skipNotifiedRef = useRef<Partial<Record<AgentType, string>>>({});
  // Throttle rewards fetch per agent to avoid spamming the API.
  const lastRewardsFetchRef = useRef<Partial<Record<AgentType, number>>>({});

  useEffect(() => {
    if (!enabled) {
      skipNotifiedRef.current = {};
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

  const { startAgentWithRetries } = useAutoRunStartOperations({
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
  });

  const { stopAgentWithRecovery } = useAutoRunStopOperations({
    runningAgentTypeRef,
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
