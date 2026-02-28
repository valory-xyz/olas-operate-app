import { MutableRefObject, useCallback, useEffect, useRef } from 'react';

import { AgentType } from '@/constants';
import { sleepAwareDelay } from '@/utils/delay';

import {
  AUTO_RUN_START_DELAY_SECONDS,
  COOLDOWN_SECONDS,
  REWARDS_POLL_SECONDS,
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';

type UseAutoRunLifecycleParams = {
  enabled: boolean;
  runningAgentType: AgentType | null;
  orderedIncludedAgentTypes: AgentType[];
  configuredAgents: AgentMeta[];
  enabledRef: MutableRefObject<boolean>;
  runningAgentTypeRef: MutableRefObject<AgentType | null>;
  lastRewardsEligibilityRef: MutableRefObject<
    Partial<Record<AgentType, boolean | undefined>>
  >;
  scanTick: number;
  rewardsTick: number;
  scheduleNextScan: (delaySeconds: number) => void;
  hasScheduledScan: () => boolean;
  refreshRewardsEligibility: (
    agentType: AgentType,
  ) => Promise<boolean | undefined>;
  getRewardSnapshot: (agentType: AgentType) => boolean | undefined;
  getPreferredStartFrom: () => AgentType | null;
  scanAndStartNext: (startFrom?: AgentType | null) => Promise<{
    started: boolean;
  }>;
  startSelectedAgentIfEligible: () => Promise<boolean>;
  stopAgentWithRecovery: (
    agentType: AgentType,
    serviceConfigId: string,
  ) => Promise<boolean>;
  stopRetryBackoffUntilRef: MutableRefObject<
    Partial<Record<AgentType, number>>
  >;
  logMessage: (message: string) => void;
};

/**
 * Lifecycle effects that keep auto-run moving over time.
 *
 * Example:
 * - `optimus` is running
 * - rewards flip to earned
 * - lifecycle rotates to next candidate and starts scan
 */
export const useAutoRunLifecycle = ({
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
}: UseAutoRunLifecycleParams) => {
  // Guards against overlapping scan/rotation loops.
  const isRotatingRef = useRef(false);
  // Track prior enabled state to distinguish initial enable vs later idle (cooldown on manual stop).
  const wasAutoRunEnabledRef = useRef(false);

  useEffect(() => {
    // Clear stop-timeout backoff state whenever auto-run is disabled.
    if (!enabled) {
      stopRetryBackoffUntilRef.current = {};
    }
  }, [enabled, stopRetryBackoffUntilRef]);

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
      // Rotation policy:
      // 1) If all other agents are already earned/unknown -> keep current running.
      // 2) Otherwise stop current, cool down, and scan from next.
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
        logMessage(
          `all other agents earned or unknown, keeping ${currentAgentType} running, rescan in ${SCAN_ELIGIBLE_DELAY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return;
      }

      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return;
      if (!enabledRef.current) return;

      const stopOk = await stopAgentWithRecovery(
        currentMeta.agentType,
        currentMeta.serviceConfigId,
      );
      if (!stopOk) {
        logMessage(`stop timeout for ${currentAgentType}, aborting rotation`);
        // Reset rewards guard so the next poll cycle can re-trigger rotation
        // instead of being blocked by the previousEligibility === true check.
        lastRewardsEligibilityRef.current[currentAgentType] = undefined;
        stopRetryBackoffUntilRef.current[currentAgentType] =
          Date.now() + SCAN_BLOCKED_DELAY_SECONDS * 1000;
        logMessage(
          `reset rewards guard for ${currentAgentType}, scheduling rescan in ${SCAN_BLOCKED_DELAY_SECONDS}s`,
        );
        scheduleNextScan(SCAN_BLOCKED_DELAY_SECONDS);
        return;
      }

      stopRetryBackoffUntilRef.current[currentAgentType] = undefined;
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
      scheduleNextScan,
      stopAgentWithRecovery,
      lastRewardsEligibilityRef,
      stopRetryBackoffUntilRef,
    ],
  );

  const stopRunningAgent = useCallback(
    async (currentAgentType?: AgentType | null) => {
      if (!currentAgentType) return false;
      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return false;
      return stopAgentWithRecovery(
        currentMeta.agentType,
        currentMeta.serviceConfigId,
      );
    },
    [configuredAgents, stopAgentWithRecovery],
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
        const stopRetryBackoffUntil =
          stopRetryBackoffUntilRef.current[currentType] ?? 0;
        if (Date.now() < stopRetryBackoffUntil) return;
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
    stopRetryBackoffUntilRef,
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
    let reachedScan = false;
    const startNext = async () => {
      const preferredStartFrom = getPreferredStartFromRef.current();
      if (!wasEnabled) {
        // First enable path:
        // wait startup delay, try selected agent first, then scan queue.
        const startOk = await sleepAwareDelay(AUTO_RUN_START_DELAY_SECONDS);
        if (!startOk) return;
        if (!enabledRef.current || runningAgentTypeRef.current) return;
        const startedSelected = await startSelectedAgentIfEligibleRef.current();
        if (startedSelected) return;
        reachedScan = true;
        await scanAndStartNextRef.current(preferredStartFrom);
        return;
      }
      // Auto-run was already enabled but the agent stopped (e.g. sleep/wake,
      // backend crash, manual stop via backend). Try to resume the previously
      // running agent first — selectedAgentType is still set to it because
      // updateAgentType was called when it started. If it can't run (earned
      // rewards, low balance, etc.), fall through to scanning.
      const cooldownOk = await sleepAwareDelay(COOLDOWN_SECONDS);
      if (!cooldownOk) return;
      if (!enabledRef.current) return;
      const resumedSelected = await startSelectedAgentIfEligibleRef.current();
      if (resumedSelected) return;
      reachedScan = true;
      await scanAndStartNextRef.current(preferredStartFrom);
    };

    startNext()
      .catch((error) => logMessage(`manual stop start error: ${error}`))
      .finally(() => {
        isRotatingRef.current = false;
        // Safety net: if auto-run is still on but nothing started and we
        // never reached scanAndStartNext (e.g. sleep bail-out interrupted
        // the flow before a scan was scheduled), ensure the loop retries.
        // Skip if scan already ran — it schedules its own delay internally.
        if (
          !reachedScan &&
          enabledRef.current &&
          !runningAgentTypeRef.current &&
          !hasScheduledScan()
        ) {
          logMessage(
            `safety net: flow interrupted before scan, retrying in ${COOLDOWN_SECONDS}s`,
          );
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
    hasScheduledScan,
    startSelectedAgentIfEligible,
    runningAgentTypeRef,
    enabledRef,
  ]);

  return {
    stopCurrentRunningAgent,
  };
};
