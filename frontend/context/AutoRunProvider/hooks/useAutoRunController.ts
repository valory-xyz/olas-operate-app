import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  AgentType,
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
  ONE_SECOND_INTERVAL,
} from '@/constants';
import { useElectronApi } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { delayInSeconds } from '@/utils/delay';
import { updateServiceIfNeeded } from '@/utils/service';

import {
  AUTO_RUN_LOG_PREFIX,
  COOLDOWN_SECONDS,
  RETRY_BACKOFF_SECONDS,
  START_TIMEOUT_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';
import {
  getAgentDisplayName,
  logAutoRun,
  notifySkipped,
  notifyStartFailed,
} from '../utils';

/** Time to wait after stopping an agent before starting the next one,
 * to allow for proper cooldown and avoid potential issues with rapid restarts. */
const SCAN_BLOCKED_DELAY_SECONDS = 10 * 60;

/** Time to wait before re-scanning for eligible agents when we find
 * an eligible agent but fail to start it, to avoid rapid retry loops. */
const SCAN_ELIGIBLE_DELAY_SECONDS = 30 * 60;

/** Time to wait for candidate eligibility data to load before skipping the candidate. */
const CANDIDATE_ELIGIBILITY_TIMEOUT_SECONDS = 30 * ONE_SECOND_INTERVAL;

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
  isSelectedDataLoading: boolean;
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
  isSelectedDataLoading,
  getSelectedEligibility,
  createSafeIfNeeded,
  showNotification,
}: UseAutoRunControllerParams) => {
  const { logEvent } = useElectronApi();
  const [hasActivated, setHasActivated] = useState(false);
  const isRotatingRef = useRef(false);
  const skipNotifiedRef = useRef<Partial<Record<AgentType, string>>>({});
  const rewardSnapshotRef = useRef<
    Partial<Record<AgentType, boolean | undefined>>
  >({});
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Append new agents to the end of the included list, preserving order of existing agents.
  const waitForSelectedData = useCallback(async () => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < CANDIDATE_ELIGIBILITY_TIMEOUT_SECONDS) {
      if (!isSelectedDataLoading) return true;
      await delayInSeconds(2);
    }
    return false;
  }, [isSelectedDataLoading]);

  const waitForRewardsEligibility = useCallback(
    async (agentType: AgentType) => {
      const startedAt = Date.now();
      while (Date.now() - startedAt < CANDIDATE_ELIGIBILITY_TIMEOUT_SECONDS) {
        const snapshot = rewardSnapshotRef.current[agentType];
        if (snapshot !== undefined) return snapshot;
        await delayInSeconds(2);
      }
      return undefined;
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

      updateAutoRun({ currentAgent: agentType });
      updateAgentType(agentType);

      for (
        let attempt = 0;
        attempt < RETRY_BACKOFF_SECONDS.length;
        attempt += 1
      ) {
        try {
          logMessage(`starting ${agentType} (attempt ${attempt + 1})`);
          await createSafeIfNeeded(meta);
          await updateServiceIfNeeded(meta.service, agentType);
          await ServicesService.startService(meta.serviceConfigId);

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
      updateAgentType,
      updateAutoRun,
      waitForDeploymentStatus,
    ],
  );

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

  const scheduleNextScan = useCallback((delaySeconds: number) => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    scanTimeoutRef.current = setTimeout(() => {
      scanTimeoutRef.current = null;
      setScanTick((value) => value + 1);
    }, delaySeconds * 1000);
  }, []);

  const scanAndStartNext = useCallback(
    async (startFrom?: AgentType | null) => {
      let hasBlocked = false;
      let hasEligible = false;
      let candidate = findNextInOrder(startFrom);
      const visited = new Set<AgentType>();

      while (candidate && !visited.has(candidate)) {
        visited.add(candidate);

        updateAgentType(candidate);
        rewardSnapshotRef.current[candidate] = undefined;

        const dataReady = await waitForSelectedData();
        if (!dataReady) {
          notifySkipOnce(candidate, 'Data loading timeout');
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const eligibility = getSelectedEligibility();
        if (!eligibility.canRun) {
          notifySkipOnce(candidate, eligibility.reason);
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const candidateEligibility = await waitForRewardsEligibility(candidate);
        if (candidateEligibility === undefined) {
          notifySkipOnce(candidate, 'Rewards status unavailable');
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

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
    if (runningAgentType) setHasActivated(true);
  }, [enabled, runningAgentType]);

  useEffect(() => {
    if (!enabled) return;
    if (!runningAgentType) return;
    if (currentAgent === runningAgentType) return;
    updateAutoRun({ currentAgent: runningAgentType });
    logMessage(`current agent set to ${runningAgentType}`);
  }, [currentAgent, enabled, logMessage, runningAgentType, updateAutoRun]);

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
