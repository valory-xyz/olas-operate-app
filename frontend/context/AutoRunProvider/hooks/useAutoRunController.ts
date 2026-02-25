import { useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';
import { Maybe } from '@/types';
import { delayInSeconds } from '@/utils/delay';

import { COOLDOWN_SECONDS } from '../constants';
import { AgentMeta } from '../types';
import { getAgentDisplayName, notifySkipped } from '../utils';
import { useAutoRunActions } from './useAutoRunActions';
import { useAutoRunSignals } from './useAutoRunSignals';
import { useAutoRunEvent } from './useLogAutoRunEvent';

type UseAutoRunControllerParams = {
  enabled: boolean;
  currentAgent: AgentType | null;
  orderedIncludedAgentTypes: AgentType[];
  configuredAgents: AgentMeta[];
  updateAutoRun: (partial: {
    currentAgent: Maybe<AgentType>;
    enabled?: boolean;
  }) => void;
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
};

export const useAutoRunController = ({
  enabled,
  currentAgent,
  orderedIncludedAgentTypes,
  configuredAgents,
  updateAutoRun,
  updateAgentType,
  selectedAgentType,
  selectedServiceConfigId,
  isSelectedAgentDetailsLoading,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
  onAutoRunAgentStarted,
}: UseAutoRunControllerParams) => {
  const { isEligibleForRewards } = useRewardContext();
  const { runningAgentType } = useAgentRunning();
  const { startService } = useStartService();
  const { logMessage } = useAutoRunEvent();
  const {
    enabledRef,
    lastRewardsEligibilityRef,
    scanTick,
    scheduleNextScan,
    waitForAgentSelection,
    waitForRewardsEligibility,
    waitForRunningAgent,
    waitForStoppedAgent,
    markRewardSnapshotPending,
    getRewardSnapshot,
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
  /**
   * Track prior enabled state to distinguish initial enable vs. later idle.
   * On first enable: start immediately. On later idle (manual stop): apply cooldown.
   */
  const wasAutoRunEnabledRef = useRef(false);

  // Notify the user that an agent was skipped for a specific reason, but only once per reason.
  const notifySkipOnce = useCallback(
    (agentType: AgentType, reason?: string) => {
      if (!reason) return;
      if (skipNotifiedRef.current[agentType] === reason) return;
      skipNotifiedRef.current[agentType] = reason;
      notifySkipped(showNotification, getAgentDisplayName(agentType), reason);
      logMessage(`skip ${agentType}: ${reason}`);
    },
    [logMessage, showNotification],
  );

  const {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
    rotateToNext,
    stopRunningAgent,
  } = useAutoRunActions({
    enabledRef,
    orderedIncludedAgentTypes,
    configuredAgents,
    selectedAgentType,
    updateAutoRun,
    updateAgentType,
    getSelectedEligibility,
    createSafeIfNeeded,
    startService,
    waitForAgentSelection,
    waitForRewardsEligibility,
    waitForRunningAgent,
    waitForStoppedAgent,
    markRewardSnapshotPending,
    getRewardSnapshot,
    notifySkipOnce,
    onAutoRunAgentStarted,
    showNotification,
    scheduleNextScan,
    logMessage,
  });

  // Sync current running agent into auto-run state once it appears.
  useEffect(() => {
    if (!enabled) return;
    if (!runningAgentType) return;
    if (currentAgent === runningAgentType) return;
    updateAutoRun({ currentAgent: runningAgentType });
    logMessage(`current agent set to ${runningAgentType}`);
  }, [currentAgent, enabled, logMessage, runningAgentType, updateAutoRun]);

  // Rotation when current agent earns rewards (false -> true).
  useEffect(() => {
    if (!enabled) return;
    if (isRotatingRef.current) return;

    const currentType = currentAgent || runningAgentType;
    if (!currentType) return;

    if (runningAgentType && selectedAgentType !== runningAgentType) {
      logMessage(
        `rotation skipped: viewing ${selectedAgentType} while ${runningAgentType} running`,
      );
      return;
    }
    const previousEligibility = lastRewardsEligibilityRef.current[currentType];
    lastRewardsEligibilityRef.current[currentType] = isEligibleForRewards;
    logMessage(
      `rotation check: ${currentType} rewards=${String(
        isEligibleForRewards,
      )} prev=${String(previousEligibility)}`,
    );
    if (isEligibleForRewards !== true) return;
    if (previousEligibility !== false) return;
    logMessage(`rotation triggered: ${currentType} earned rewards`);

    isRotatingRef.current = true;
    rotateToNext(currentType)
      .catch((error) => {
        logMessage(`rotation error: ${error}`);
      })
      .finally(() => {
        isRotatingRef.current = false;
      });
  }, [
    currentAgent,
    enabled,
    isEligibleForRewards,
    logMessage,
    rotateToNext,
    runningAgentType,
    selectedAgentType,
    lastRewardsEligibilityRef,
    scanTick,
  ]);

  // When enabled and nothing is running, start selected or scan for the next.
  // Skip cooldown on first enable, but keep cooldown after manual stops.
  useEffect(() => {
    const wasEnabled = wasAutoRunEnabledRef.current;
    wasAutoRunEnabledRef.current = enabled;
    if (!enabled) return;
    if (runningAgentType) return;
    if (isRotatingRef.current) return;

    isRotatingRef.current = true;
    const startNext = async () => {
      const preferredStartFrom = getPreferredStartFrom();
      if (!wasEnabled) {
        logMessage('auto-run enabled: checking selected agent first');
        const startedSelected = await startSelectedAgentIfEligible();
        if (startedSelected) return;
        logMessage('auto-run enabled: selected agent not started, scanning');
        await scanAndStartNext(preferredStartFrom);
        return;
      }
      await delayInSeconds(COOLDOWN_SECONDS);
      await scanAndStartNext(preferredStartFrom);
    };

    startNext()
      .catch((error) => logMessage(`manual stop start error: ${error}`))
      .finally(() => {
        isRotatingRef.current = false;
      });
  }, [
    enabled,
    getPreferredStartFrom,
    logMessage,
    runningAgentType,
    scanAndStartNext,
    scanTick,
    startSelectedAgentIfEligible,
  ]);

  return {
    stopRunningAgent,
  };
};
