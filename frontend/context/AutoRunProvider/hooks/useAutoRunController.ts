import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AgentType,
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '@/constants';
import { useAgentRunning, useRewardContext, useStartService } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { Maybe } from '@/types';
import { delayInSeconds } from '@/utils/delay';

import { COOLDOWN_SECONDS, RETRY_BACKOFF_SECONDS } from '../constants';
import { AgentMeta } from '../types';
import {
  getAgentDisplayName,
  notifySkipped,
  notifyStartFailed,
} from '../utils';
import { useAutoRunEvent } from './useLogAutoRunEvent';

/** When every candidate is blocked or missing data, wait longer before re-scan. */
const SCAN_BLOCKED_DELAY_SECONDS = 10 * 60;

/** When all agents have already earned rewards, back off longer. */
const SCAN_ELIGIBLE_DELAY_SECONDS = 30 * 60;

const START_TIMEOUT_SECONDS = 120;

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
  isSelectedAgentDetailsLoading: boolean;
  getSelectedEligibility: () => { canRun: boolean; reason?: string };
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  showNotification?: (title: string, body?: string) => void;
};

export const useAutoRunController = ({
  enabled,
  currentAgent,
  orderedIncludedAgentTypes,
  configuredAgents,
  updateAutoRun,
  updateAgentType,
  selectedAgentType,
  isSelectedAgentDetailsLoading,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
}: UseAutoRunControllerParams) => {
  const { isEligibleForRewards } = useRewardContext();
  const { runningAgentType } = useAgentRunning();
  const { startService } = useStartService();
  const { logMessage } = useAutoRunEvent();

  // Guards against overlapping scan/rotation loops.
  const isRotatingRef = useRef(false);
  // Track per-agent skip reason to avoid spamming notifications.
  const skipNotifiedRef = useRef<Partial<Record<AgentType, string>>>({});
  // Latest reward-eligibility snapshot keyed by agent type.
  const rewardSnapshotRef = useRef<
    Partial<Record<AgentType, boolean | undefined>>
  >({});
  // Keeps delayed re-scan from stacking multiple timers.
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Toggled to force re-scan in effects when we schedule a delay.
  const [scanTick, setScanTick] = useState(0);
  /**
   * Track prior enabled state to distinguish initial enable vs. later idle.
   * On first enable: start immediately. On later idle (manual stop): apply cooldown.
   */
  const wasAutoRunEnabledRef = useRef(false);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, [enabled]);

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

  // Keep a ref so async loops always read the live loading value (avoids stale closure).
  const isSelectedAgentDetailsLoadingRef = useRef(
    isSelectedAgentDetailsLoading,
  );
  useEffect(() => {
    isSelectedAgentDetailsLoadingRef.current = isSelectedAgentDetailsLoading;
  }, [isSelectedAgentDetailsLoading]);

  // Wait until hooks for the selected agent finish loading before eligibility checks.
  const waitForSelectedAgentDetails = useCallback(async () => {
    while (isSelectedAgentDetailsLoadingRef.current) {
      await delayInSeconds(2);
    }
    return true;
  }, []);

  // Wait for rewards eligibility to be populated for the selected agent.
  const waitForRewardsEligibility = useCallback(
    async (agentType: AgentType) => {
      while (rewardSnapshotRef.current[agentType] === undefined) {
        await delayInSeconds(2);
      }
      return rewardSnapshotRef.current[agentType];
    },
    [],
  );

  // Build the included agents list in the order of the configured agent types, excluding any that are not configured.
  const findNextInOrder = useCallback(
    (currentAgentType?: AgentType | null) => {
      if (orderedIncludedAgentTypes.length === 0) return null;

      const startIndex = currentAgentType
        ? orderedIncludedAgentTypes.indexOf(currentAgentType)
        : -1;

      for (let i = 1; i <= orderedIncludedAgentTypes.length; i += 1) {
        const index = (startIndex + i) % orderedIncludedAgentTypes.length;
        const candidate = orderedIncludedAgentTypes[index];
        if (!candidate) continue;
        if (candidate === currentAgentType) continue;
        return candidate;
      }

      return null;
    },
    [orderedIncludedAgentTypes],
  );

  const getPreferredStartFrom = useCallback(() => {
    const length = orderedIncludedAgentTypes.length;
    if (length <= 1) return null;
    const index = orderedIncludedAgentTypes.indexOf(selectedAgentType);
    if (index === -1) return null;
    const prevIndex = (index - 1 + length) % length;
    return orderedIncludedAgentTypes[prevIndex] ?? null;
  }, [orderedIncludedAgentTypes, selectedAgentType]);

  // Poll deployment status until it reaches the desired state or timeout.
  const waitForDeploymentStatus = useCallback(
    async (
      serviceConfigId: string,
      status: MiddlewareDeploymentStatus,
      timeoutSeconds: number,
    ) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < timeoutSeconds * 1000) {
        try {
          const deployment = await ServicesService.getDeployment({
            serviceConfigId,
            signal: new AbortController().signal,
          });
          if (deployment?.status === status) return true;
        } catch (error) {
          logMessage(`deployment status check failed: ${error}`);
        }
        await delayInSeconds(5);
      }
      return false;
    },
    [logMessage],
  );

  // Start a candidate agent with retries + backoff, respecting eligibility gates.
  const startAgentWithRetries = useCallback(
    async (agentType: AgentType) => {
      if (!enabledRef.current) return false;
      const meta = configuredAgents.find(
        (agent) => agent.agentType === agentType,
      );
      if (!meta) return false;

      const agentName = meta.agentConfig.displayName;
      const eligibility = getSelectedEligibility();
      if (!eligibility.canRun) {
        notifySkipOnce(agentType, eligibility.reason);
        return false;
      }

      // Persist + select before starting so downstream hooks query the right agent.
      updateAutoRun({ currentAgent: agentType });
      updateAgentType(agentType);

      for (
        let attempt = 0;
        attempt < RETRY_BACKOFF_SECONDS.length;
        attempt += 1
      ) {
        try {
          logMessage(`starting ${agentType} (attempt ${attempt + 1})`);
          await startService({
            agentType,
            agentConfig: meta.agentConfig,
            service: meta.service,
            stakingProgramId: meta.stakingProgramId,
            createSafeIfNeeded: () => createSafeIfNeeded(meta),
          });

          const deployed = await waitForDeploymentStatus(
            meta.serviceConfigId,
            MiddlewareDeploymentStatusMap.DEPLOYED,
            START_TIMEOUT_SECONDS,
          );

          if (deployed) {
            logMessage(`started ${agentType}`);
            return true;
          }

          logMessage(`start timeout for ${agentType} (attempt ${attempt + 1})`);
        } catch (error) {
          logMessage(`start error for ${agentType}: ${error}`);
        }

        await delayInSeconds(RETRY_BACKOFF_SECONDS[attempt]);
      }

      notifyStartFailed(showNotification, agentName);
      return false;
    },
    [
      configuredAgents,
      createSafeIfNeeded,
      getSelectedEligibility,
      logMessage,
      notifySkipOnce,
      showNotification,
      startService,
      updateAgentType,
      updateAutoRun,
      waitForDeploymentStatus,
    ],
  );

  // Stop the current deployment and wait until it is fully stopped.
  const stopAgent = useCallback(
    async (serviceConfigId: string) => {
      try {
        logMessage(`stopping ${serviceConfigId}`);
        await ServicesService.stopDeployment(serviceConfigId);
      } catch (error) {
        logMessage(`stop failed for ${serviceConfigId}: ${error}`);
      }

      return waitForDeploymentStatus(
        serviceConfigId,
        MiddlewareDeploymentStatusMap.STOPPED,
        START_TIMEOUT_SECONDS,
      );
    },
    [logMessage, waitForDeploymentStatus],
  );

  // Schedule a delayed scan, coalescing any existing timer.
  const scheduleNextScan = useCallback((delaySeconds: number) => {
    if (!enabledRef.current) return;
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      scanTimeoutRef.current = null;
      setScanTick((value) => value + 1);
    }, delaySeconds * 1000);
  }, []);

  // Scan sequentially through the queue and attempt to start the first eligible agent.
  const scanAndStartNext = useCallback(
    async (startFrom?: AgentType | null) => {
      if (!enabledRef.current) return { started: false };
      let hasBlocked = false;
      let hasEligible = false;
      let candidate = findNextInOrder(startFrom);
      const visited = new Set<AgentType>();

      while (candidate && !visited.has(candidate)) {
        if (!enabledRef.current) return { started: false };
        visited.add(candidate);

        // Select candidate to load its data (eligibility, rewards).
        updateAgentType(candidate);
        rewardSnapshotRef.current[candidate] = undefined;

        await waitForSelectedAgentDetails();

        const eligibility = getSelectedEligibility();
        if (!eligibility.canRun) {
          notifySkipOnce(candidate, eligibility.reason);
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        // If candidate already earned rewards, keep scanning.
        const candidateEligibility = await waitForRewardsEligibility(candidate);
        if (candidateEligibility === true) {
          hasEligible = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        // Attempt to start the first eligible candidate.
        const started = await startAgentWithRetries(candidate);
        if (started) return { started: true };

        hasBlocked = true;
        candidate = findNextInOrder(candidate);
      }

      const delay = (() => {
        if (hasBlocked) return SCAN_BLOCKED_DELAY_SECONDS;
        if (hasEligible) return SCAN_ELIGIBLE_DELAY_SECONDS;
        return SCAN_BLOCKED_DELAY_SECONDS;
      })();

      if (enabledRef.current) {
        logMessage(`scan complete; scheduling next scan in ${delay}s`);
        scheduleNextScan(delay);
      }

      return { started: false };
    },
    [
      findNextInOrder,
      getSelectedEligibility,
      logMessage,
      notifySkipOnce,
      scheduleNextScan,
      startAgentWithRetries,
      updateAgentType,
      waitForRewardsEligibility,
      waitForSelectedAgentDetails,
    ],
  );

  // Stop current agent, cooldown, then scan for the next candidate.
  const rotateToNext = useCallback(
    async (currentAgentType: AgentType) => {
      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return;

      const stopOk = await stopAgent(currentMeta.serviceConfigId);
      if (!stopOk) {
        logMessage(`stop timeout for ${currentAgentType}, aborting rotation`);
        return;
      }

      if (!enabledRef.current) return;

      logMessage(`cooldown ${COOLDOWN_SECONDS}s`);
      await delayInSeconds(COOLDOWN_SECONDS);
      if (!enabledRef.current) return;
      await scanAndStartNext(currentAgentType);
    },
    [configuredAgents, logMessage, scanAndStartNext, stopAgent],
  );

  const stopRunningAgent = useCallback(async () => {
    const currentType = runningAgentType || currentAgent;
    if (!currentType) return false;
    const currentMeta = configuredAgents.find(
      (agent) => agent.agentType === currentType,
    );
    if (!currentMeta) return false;
    return stopAgent(currentMeta.serviceConfigId);
  }, [configuredAgents, currentAgent, runningAgentType, stopAgent]);

  useEffect(() => {
    if (!enabled) return;
    if (!runningAgentType) return;
    if (currentAgent === runningAgentType) return;
    updateAutoRun({ currentAgent: runningAgentType });
    logMessage(`current agent set to ${runningAgentType}`);
  }, [currentAgent, enabled, logMessage, runningAgentType, updateAutoRun]);

  // Keep latest rewards eligibility snapshot for the selected agent.
  useEffect(() => {
    if (!selectedAgentType) return;
    rewardSnapshotRef.current[selectedAgentType] = isEligibleForRewards;
  }, [isEligibleForRewards, selectedAgentType]);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  // Rotation when current agent earns rewards.
  useEffect(() => {
    if (!enabled) return;
    if (isRotatingRef.current) return;

    const currentType = currentAgent || runningAgentType;
    if (!currentType) return;

    if (runningAgentType && selectedAgentType !== runningAgentType) return;
    if (isEligibleForRewards !== true) return;

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
    scanTick,
  ]);

  // When enabled and nothing is running, scan and start.
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
  ]);

  const canSyncSelection = useMemo(() => {
    if (!enabled) return false;
    if (!currentAgent) return false;
    return true;
  }, [currentAgent, enabled]);

  return {
    canSyncSelection,
    stopRunningAgent,
  };
};
