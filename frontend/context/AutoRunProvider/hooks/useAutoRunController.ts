import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AgentType,
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '@/constants';
import { useElectronApi, useStartService } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { delayInSeconds } from '@/utils/delay';

import {
  AUTO_RUN_LOG_PREFIX,
  COOLDOWN_SECONDS,
  RETRY_BACKOFF_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  getAgentDisplayName,
  logAutoRun,
  notifySkipped,
  notifyStartFailed,
} from '../utils';

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
    currentAgent?: AgentType | null;
    enabled?: boolean;
  }) => void;
  updateAgentType: (agentType: AgentType) => void;
  selectedAgentType: AgentType;
  runningAgentType: AgentType | null;
  isEligibleForRewards?: boolean;
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
  runningAgentType,
  isEligibleForRewards,
  isSelectedAgentDetailsLoading,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
}: UseAutoRunControllerParams) => {
  const { logEvent } = useElectronApi();
  const { startService } = useStartService();
  // Auto-run only kicks in once a manual start happens while enabled.
  const [hasActivated, setHasActivated] = useState(false);
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

  const logMessage = useCallback(
    (message: string) => {
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, message);
    },
    [logEvent],
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

  // Wait for the selected agent's data to finish loading before evaluating eligibility.
  const waitForSelectedData = useCallback(async () => {
    while (isSelectedAgentDetailsLoading) {
      await delayInSeconds(2);
    }
    return true;
  }, [isSelectedAgentDetailsLoading]);

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
      let hasBlocked = false;
      let hasEligible = false;
      let candidate = findNextInOrder(startFrom);
      const visited = new Set<AgentType>();

      while (candidate && !visited.has(candidate)) {
        visited.add(candidate);

        // Select candidate to load its data (eligibility, rewards).
        updateAgentType(candidate);
        rewardSnapshotRef.current[candidate] = undefined;

        await waitForSelectedData();

        const eligibility = getSelectedEligibility();
        if (!eligibility.canRun) {
          notifySkipOnce(candidate, eligibility.reason);
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const candidateEligibility = await waitForRewardsEligibility(candidate);

        // If candidate already earned rewards, keep scanning.
        if (candidateEligibility === true) {
          hasEligible = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const started = await startAgentWithRetries(candidate);
        if (started) return { started: true };

        hasBlocked = true;
        candidate = findNextInOrder(candidate);
      }

      const delay = hasBlocked
        ? SCAN_BLOCKED_DELAY_SECONDS
        : hasEligible
          ? SCAN_ELIGIBLE_DELAY_SECONDS
          : SCAN_BLOCKED_DELAY_SECONDS;

      logMessage(`scan complete; scheduling next scan in ${delay}s`);
      scheduleNextScan(delay);

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
      waitForSelectedData,
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

      logMessage(`cooldown ${COOLDOWN_SECONDS}s`);
      await delayInSeconds(COOLDOWN_SECONDS);
      await scanAndStartNext(currentAgentType);
    },
    [configuredAgents, logMessage, scanAndStartNext, stopAgent],
  );

  useEffect(() => {
    if (!enabled) {
      setHasActivated(false);
      return;
    }
    // Auto-run "activates" once we see a running agent while enabled.
    if (runningAgentType) setHasActivated(true);
  }, [enabled, runningAgentType]);

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
    if (!enabled || !hasActivated) return;
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
    hasActivated,
    isEligibleForRewards,
    logMessage,
    rotateToNext,
    runningAgentType,
    selectedAgentType,
    scanTick,
  ]);

  // Manual stop: if nothing is running, scan and start after cooldown.
  useEffect(() => {
    if (!enabled || !hasActivated) return;
    if (runningAgentType) return;
    if (isRotatingRef.current) return;

    isRotatingRef.current = true;
    delayInSeconds(COOLDOWN_SECONDS)
      .then(() => scanAndStartNext(currentAgent))
      .catch((error) => logMessage(`manual stop start error: ${error}`))
      .finally(() => {
        isRotatingRef.current = false;
      });
  }, [
    currentAgent,
    enabled,
    hasActivated,
    logMessage,
    runningAgentType,
    scanAndStartNext,
    scanTick,
  ]);

  const canSyncSelection = useMemo(() => {
    if (!enabled) return false;
    if (!currentAgent) return false;
    if (!hasActivated && !runningAgentType) return false;
    return true;
  }, [currentAgent, enabled, hasActivated, runningAgentType]);

  return {
    hasActivated,
    canSyncSelection,
  };
};
