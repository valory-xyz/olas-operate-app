import { useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { sleepAwareDelay } from '@/utils/delay';

import {
  AUTO_RUN_START_DELAY_SECONDS,
  COOLDOWN_SECONDS,
  ELIGIBILITY_LOADING_REASON,
  ELIGIBILITY_REASON,
  RETRY_BACKOFF_SECONDS,
  REWARDS_POLL_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
  START_TIMEOUT_SECONDS,
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
    waitForAgentSelection,
    waitForBalancesReady,
    waitForRewardsEligibility,
    waitForRunningAgent,
    waitForStoppedAgent,
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

  // Guards against overlapping scan/rotation loops.
  const isRotatingRef = useRef(false);
  // Track per-agent skip reason to avoid spamming notifications.
  const skipNotifiedRef = useRef<Partial<Record<AgentType, string>>>({});
  // Track prior enabled state to distinguish initial enable vs later idle (cooldown on manual stop).
  const wasAutoRunEnabledRef = useRef(false);
  // Throttle rewards fetch per agent to avoid spamming the API.
  const lastRewardsFetchRef = useRef<Partial<Record<AgentType, number>>>({});

  // Reset per-agent skip dedup on each disable so notifications fire again on re-enable.
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
      }),
    [configuredAgents, getRewardSnapshot, logMessage, setRewardSnapshot],
  );

  // Notify the user that an agent was skipped for a specific reason, but only once per reason.
  const notifySkipOnce = useCallback(
    (agentType: AgentType, reason?: string) => {
      if (!reason) return;
      if (reason.toLowerCase().includes('loading')) return;
      if (skipNotifiedRef.current[agentType] === reason) return;
      skipNotifiedRef.current[agentType] = reason;
      notifySkipped(showNotification, getAgentDisplayName(agentType), reason);
      logMessage(`skip ${agentType}: ${reason}`);
    },
    [logMessage, showNotification],
  );

  const normalizeEligibility = useCallback(
    (eligibility: {
      canRun: boolean;
      reason?: string;
      loadingReason?: string;
    }) => {
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

  const waitForEligibilityReady = useCallback(async () => {
    const startedAt = Date.now();
    while (enabledRef.current) {
      const eligibility = normalizeEligibility(getSelectedEligibility());
      if (eligibility.reason !== ELIGIBILITY_REASON.LOADING) return true;
      const now = Date.now();
      if (now - startedAt > 60_000) {
        logMessage('eligibility wait timeout');
        return false;
      }
      const ok = await sleepAwareDelay(2);
      if (!ok) return false;
    }
    return false;
  }, [enabledRef, getSelectedEligibility, logMessage, normalizeEligibility]);

  const startAgentWithRetries = useCallback(
    async (agentType: AgentType) => {
      {
        if (!enabledRef.current) return false;
        const meta = configuredAgents.find(
          (agent) => agent.agentType === agentType,
        );
        if (!meta) {
          logMessage(`start: ${agentType} not configured`);
          return false;
        }
        const agentName = meta.agentConfig.displayName;
        updateAgentType(agentType);
        const selectionReady = await waitForAgentSelection(
          agentType,
          meta.serviceConfigId,
        );
        if (!selectionReady) return false;
        const balancesReady = await waitForBalancesReady();
        if (!balancesReady) return false;
        const eligibilityReady = await waitForEligibilityReady();
        if (!eligibilityReady) return false;
        const eligibility = normalizeEligibility(getSelectedEligibility());
        if (!eligibility.canRun) {
          const reason = formatEligibilityReason(eligibility);
          notifySkipOnce(agentType, reason);
          return false;
        }

        onAutoRunStartStateChange?.(true);
        try {
          for (
            let attempt = 0;
            attempt < RETRY_BACKOFF_SECONDS.length;
            attempt += 1
          ) {
            if (!enabledRef.current) return false;
            // If the service deployed during the previous attempt's backoff period,
            // accept it without calling startService() again.
            if (runningAgentTypeRef.current === agentType) {
              onAutoRunAgentStarted?.(agentType);
              return true;
            }
            try {
              await startService({
                agentType,
                agentConfig: meta.agentConfig,
                service: meta.service,
                stakingProgramId: meta.stakingProgramId,
                createSafeIfNeeded: () => createSafeIfNeeded(meta),
              });

              const deployed = await waitForRunningAgent(
                agentType,
                START_TIMEOUT_SECONDS,
              );
              if (deployed) {
                onAutoRunAgentStarted?.(agentType);
                return true;
              }
              logMessage(
                `start timeout for ${agentType} (attempt ${attempt + 1})`,
              );
            } catch (error) {
              logMessage(`start error for ${agentType}: ${error}`);
            }
            const retryOk = await sleepAwareDelay(RETRY_BACKOFF_SECONDS[attempt]);
            if (!retryOk) return false;
          }
        } finally {
          onAutoRunStartStateChange?.(false);
        }
        notifyStartFailed(showNotification, agentName);
        logMessage(`start failed for ${agentType}`);
        return false;
      }
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

  const stopAgent = useCallback(
    async (agentType: AgentType, serviceConfigId: string) => {
      try {
        await ServicesService.stopDeployment(serviceConfigId);
      } catch (error) {
        logMessage(`stop failed for ${serviceConfigId}: ${error}`);
      }
      return waitForStoppedAgent(agentType, START_TIMEOUT_SECONDS);
    },
    [logMessage, waitForStoppedAgent],
  );

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

  const startSelectedAgentIfEligibleRef = useRef(startSelectedAgentIfEligible);
  const scanAndStartNextRef = useRef(scanAndStartNext);
  const getPreferredStartFromRef = useRef(getPreferredStartFrom);

  useEffect(() => {
    startSelectedAgentIfEligibleRef.current = startSelectedAgentIfEligible;
    scanAndStartNextRef.current = scanAndStartNext;
    getPreferredStartFromRef.current = getPreferredStartFrom;
  }, [getPreferredStartFrom, scanAndStartNext, startSelectedAgentIfEligible]);

  const rotateToNext = useCallback(
    async (currentAgentType: AgentType) => {
      const otherAgents = orderedIncludedAgentTypes.filter(
        (agentType) => agentType !== currentAgentType,
      );
      if (otherAgents.length === 0) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return;
      }

      const refreshed = await Promise.all(
        otherAgents.map((agentType) => refreshRewardsEligibility(agentType)),
      );
      const rewardStates = otherAgents.map(
        (agentType, index) => refreshed[index] ?? getRewardSnapshot(agentType),
      );
      const allEarnedOrUnknown = rewardStates.every((state) => state !== false);
      if (allEarnedOrUnknown) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return;
      }

      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return;
      if (!enabledRef.current) return;

      const stopOk = await stopAgent(
        currentMeta.agentType,
        currentMeta.serviceConfigId,
      );
      if (!stopOk) {
        logMessage(`stop timeout for ${currentAgentType}, aborting rotation`);
        return;
      }
      if (!enabledRef.current) return;
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      await scanAndStartNextRef.current(currentAgentType);
    },
    [
      configuredAgents,
      enabledRef,
      getRewardSnapshot,
      logMessage,
      orderedIncludedAgentTypes,
      refreshRewardsEligibility,
      scanAndStartNext,
      scheduleNextScan,
      stopAgent,
    ],
  );

  const stopRunningAgent = useCallback(
    async (currentAgentType?: AgentType | null) => {
      if (!currentAgentType) return false;
      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return false;
      return stopAgent(currentMeta.agentType, currentMeta.serviceConfigId);
    },
    [configuredAgents, stopAgent],
  );

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
      isRotatingRef.current = true;
      try {
        const refreshed = await refreshRewardsEligibility(currentType);
        if (!isActive) return;
        const snapshot =
          refreshed === undefined ? getRewardSnapshot(currentType) : refreshed;
        const previousEligibility =
          lastRewardsEligibilityRef.current[currentType];
        lastRewardsEligibilityRef.current[currentType] = snapshot;
        if (snapshot !== true) return;
        if (previousEligibility === true) return;
        logMessage(`rotation triggered: ${currentType} earned rewards`);
        await rotateToNext(currentType);
      } catch (error) {
        logMessage(`rotation error: ${error}`);
      } finally {
        isRotatingRef.current = false;
      }
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
      const preferredStartFrom = getPreferredStartFromRef.current();
      if (!wasEnabled) {
        const startOk = await sleepAwareDelay(AUTO_RUN_START_DELAY_SECONDS);
        if (!startOk) return;
        if (!enabledRef.current || runningAgentTypeRef.current) return;
        const startedSelected =
          await startSelectedAgentIfEligibleRef.current();
        if (startedSelected) return;
        await scanAndStartNextRef.current(preferredStartFrom);
        return;
      }
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      await scanAndStartNextRef.current(preferredStartFrom);
    };

    startNext()
      .catch((error) => logMessage(`manual stop start error: ${error}`))
      .finally(() => {
        isRotatingRef.current = false;
        // Safety net: if auto-run is still on but nothing started (e.g. sleep
        // bail-out interrupted the flow before a scan was scheduled), ensure
        // the loop retries after a cooldown.
        if (enabledRef.current && !runningAgentTypeRef.current) {
          scheduleNextScan(COOLDOWN_SECONDS);
        }
      });
  }, [
    enabled,
    getPreferredStartFrom,
    logMessage,
    runningAgentType,
    scanAndStartNext,
    scanTick,
    scheduleNextScan,
    startSelectedAgentIfEligible,
  ]);

  return {
    stopRunningAgent: stopCurrentRunningAgent,
  };
};
