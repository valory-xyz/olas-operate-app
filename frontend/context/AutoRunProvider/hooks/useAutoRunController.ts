import { useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';
import { delayInSeconds } from '@/utils/delay';

import { COOLDOWN_SECONDS, REWARDS_POLL_SECONDS } from '../constants';
import { AgentMeta } from '../types';
import { getAgentDisplayName, notifySkipped } from '../utils';
import { useAutoRunActions } from './useAutoRunActions';
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
  isBalancesAndFundingRequirementsReady: boolean;
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
  orderedIncludedAgentTypes,
  configuredAgents,
  updateAgentType,
  selectedAgentType,
  selectedServiceConfigId,
  isSelectedAgentDetailsLoading,
  isBalancesAndFundingRequirementsReady,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
  onAutoRunAgentStarted,
}: UseAutoRunControllerParams) => {
  const { isEligibleForRewards } = useRewardContext();
  const { runningAgentType } = useAgentRunning();
  const { startService } = useStartService();
  const { logMessage } = useLogAutoRunEvent();
  const {
    enabledRef,
    lastRewardsEligibilityRef,
    scanTick,
    rewardsTick,
    scheduleNextScan,
    waitForAgentSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    waitForRunningAgent,
    waitForStoppedAgent,
    markRewardSnapshotPending,
    getRewardSnapshot,
    setRewardSnapshot,
  } = useAutoRunSignals({
    enabled,
    runningAgentType,
    isSelectedAgentDetailsLoading,
    isBalancesAndFundingRequirementsReady,
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
  // Throttle rewards fetch per agent to avoid spamming the API.
  const lastRewardsFetchRef = useRef<Partial<Record<AgentType, number>>>({});

  const refreshRewardsEligibility = useCallback(
    async (agentType: AgentType) => {
      const now = Date.now();
      const lastFetch = lastRewardsFetchRef.current[agentType] ?? 0;
      if (now - lastFetch < REWARDS_POLL_SECONDS * 1000) {
        return getRewardSnapshot(agentType);
      }

      lastRewardsFetchRef.current[agentType] = now;
      const meta = configuredAgents.find(
        (agent) => agent.agentType === agentType,
      );
      if (!meta) {
        logMessage(`rewards fetch: ${agentType} not configured`);
        return undefined;
      }
      if (!meta.multisig || !meta.serviceNftTokenId || !meta.stakingProgramId) {
        logMessage(`rewards fetch: ${agentType} missing staking details`);
        return undefined;
      }

      try {
        const response =
          await meta.agentConfig.serviceApi.getAgentStakingRewardsInfo({
            agentMultisigAddress: meta.multisig,
            serviceId: meta.serviceNftTokenId,
            stakingProgramId: meta.stakingProgramId,
            chainId: meta.chainId,
          });
        const eligible = response?.isEligibleForRewards;
        if (typeof eligible === 'boolean') {
          setRewardSnapshot(agentType, eligible);
          logMessage(`rewards fetched: ${agentType} -> ${String(eligible)}`);
          return eligible;
        }
      } catch (error) {
        logMessage(`rewards fetch error: ${agentType}: ${error}`);
      }

      return undefined;
    },
    [configuredAgents, getRewardSnapshot, logMessage, setRewardSnapshot],
  );

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
    updateAgentType,
    getSelectedEligibility,
    createSafeIfNeeded,
    startService,
    waitForAgentSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    waitForRunningAgent,
    waitForStoppedAgent,
    markRewardSnapshotPending,
    getRewardSnapshot,
    notifySkipOnce,
    refreshRewardsEligibility,
    onAutoRunAgentStarted,
    showNotification,
    scheduleNextScan,
    logMessage,
  });

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
      const refreshed = await refreshRewardsEligibility(currentType);
      if (!isActive) return;
      const snapshot =
        refreshed === undefined ? getRewardSnapshot(currentType) : refreshed;
      const previousEligibility =
        lastRewardsEligibilityRef.current[currentType];
      lastRewardsEligibilityRef.current[currentType] = snapshot;
      logMessage(
        `rotation check: ${currentType} rewards=${String(
          snapshot,
        )} prev=${String(previousEligibility)}`,
      );
      if (snapshot !== true) return;
      if (previousEligibility === true) return;
      logMessage(`rotation triggered: ${currentType} earned rewards`);

      isRotatingRef.current = true;
      rotateToNext(currentType)
        .catch((error) => {
          logMessage(`rotation error: ${error}`);
        })
        .finally(() => {
          isRotatingRef.current = false;
        });
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
    stopRunningAgent: stopCurrentRunningAgent,
  };
};
