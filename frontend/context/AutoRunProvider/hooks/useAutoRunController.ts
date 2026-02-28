import { useRef } from 'react';

import { AgentType } from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';

import { AgentMeta } from '../types';
import { useAutoRunLifecycle } from './useAutoRunLifecycle';
import { useAutoRunOperations } from './useAutoRunOperations';
import { useAutoRunScanner } from './useAutoRunScanner';
import { useAutoRunSignals } from './useAutoRunSignals';
import { useLogAutoRunEvent } from './useLogAutoRunEvent';

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

/**
 * Thin composition hook:
 * - `useAutoRunSignals`: shared runtime refs + wait helpers
 * - `useAutoRunOperations`: start/stop/retry primitives
 * - `useAutoRunScanner`: queue traversal and candidate selection
 * - `useAutoRunLifecycle`: effects (rotation, polling, resume-after-stop)
 *
 * Example:
 * Selected agent = `memeooorr`, running agent = `optimus`.
 * - Controller wires all pieces so lifecycle can stop `optimus`,
 * - scanner can pick next candidate and
 * - operations can start it safely.
 */
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
    hasScheduledScan,
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

  // Per-agent backoff after stop-timeout to avoid immediate re-trigger loops.
  // Example: if `optimus` fails to stop, keep a temporary "do not rotate yet" window.
  const stopRetryBackoffUntilRef = useRef<Partial<Record<AgentType, number>>>(
    {},
  );

  const {
    refreshRewardsEligibility,
    notifySkipOnce,
    startAgentWithRetries,
    stopAgentWithRecovery,
  } = useAutoRunOperations({
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
  });

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

  const { stopCurrentRunningAgent } = useAutoRunLifecycle({
    enabled,
    runningAgentType,
    orderedIncludedAgentTypes,
    configuredAgents,
    enabledRef,
    runningAgentTypeRef,
    lastRewardsEligibilityRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    hasScheduledScan,
    refreshRewardsEligibility,
    getRewardSnapshot,
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
    stopAgentWithRecovery,
    stopRetryBackoffUntilRef,
    logMessage,
  });

  return {
    stopRunningAgent: stopCurrentRunningAgent,
  };
};
