import { MutableRefObject, useCallback } from 'react';

import { AgentType } from '@/constants';
import { delayInSeconds } from '@/utils/delay';

import { AgentMeta } from '../types';

/** When every candidate is blocked or missing data, wait longer before re-scan. */
const SCAN_BLOCKED_DELAY_SECONDS = 10 * 60; // 10 minutes

/** When all agents have already earned rewards, back off longer. */
const SCAN_ELIGIBLE_DELAY_SECONDS = 30 * 60; // 30 minutes

type UseAutoRunScannerParams = {
  enabledRef: MutableRefObject<boolean>;
  orderedIncludedAgentTypes: AgentType[];
  configuredAgents: AgentMeta[];
  selectedAgentType: AgentType;
  updateAgentType: (agentType: AgentType) => void;
  getSelectedEligibility: () => {
    canRun: boolean;
    reason?: string;
    loadingReason?: string;
  };
  waitForAgentSelection: (
    agentType: AgentType,
    serviceConfigId?: string | null,
  ) => Promise<boolean>;
  waitForBalancesReady: () => Promise<boolean>;
  waitForRewardsEligibility: (
    agentType: AgentType,
  ) => Promise<boolean | undefined>;
  refreshRewardsEligibility: (
    agentType: AgentType,
  ) => Promise<boolean | undefined>;
  markRewardSnapshotPending: (agentType: AgentType) => void;
  getRewardSnapshot: (agentType: AgentType) => boolean | undefined;
  getBalancesStatus: () => { ready: boolean; loading: boolean };
  notifySkipOnce: (agentType: AgentType, reason?: string) => void;
  startAgentWithRetries: (agentType: AgentType) => Promise<boolean>;
  scheduleNextScan: (delaySeconds: number) => void;
  logMessage: (message: string) => void;
};

const formatEligibilityReason = (eligibility: {
  reason?: string;
  loadingReason?: string;
}) => {
  if (eligibility.reason === 'Loading' && eligibility.loadingReason) {
    return `Loading: ${eligibility.loadingReason}`;
  }
  return eligibility.reason ?? 'unknown';
};

export const useAutoRunScanner = ({
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
}: UseAutoRunScannerParams) => {
  const normalizeEligibility = useCallback(
    (eligibility: { canRun: boolean; reason?: string; loadingReason?: string }) => {
      if (eligibility.reason !== 'Loading') return eligibility;
      const loadingReason = eligibility.loadingReason?.split(',').map((item) => item.trim());
      const isOnlyBalances =
        loadingReason && loadingReason.length === 1 && loadingReason[0] === 'Balances';
      if (!isOnlyBalances) return eligibility;
      const balances = getBalancesStatus();
      if (balances.ready && !balances.loading) {
        return { canRun: true };
      }
      return eligibility;
    },
    [getBalancesStatus],
  );

  const waitForEligibilityReady = useCallback(async () => {
    logMessage('waiting for eligibility readiness');
    const startedAt = Date.now();
    let lastLogAt = Date.now();
    while (enabledRef.current) {
      const eligibility = normalizeEligibility(getSelectedEligibility());
      if (eligibility.reason !== 'Loading') return true;
      const now = Date.now();
      if (now - startedAt > 60_000) {
        logMessage('eligibility wait timeout');
        return false;
      }
      if (now - lastLogAt >= 10000) {
        logMessage(
          `eligibility still loading: ${eligibility.loadingReason ?? 'unknown'}`,
        );
        lastLogAt = now;
      }
      await delayInSeconds(2);
    }
    return false;
  }, [enabledRef, getSelectedEligibility, logMessage, normalizeEligibility]);
  // Iterate candidates in the included order, wrapping around once.
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

  // Start scanning from the item before the selected agent for a fair rotation.
  const getPreferredStartFrom = useCallback(() => {
    const length = orderedIncludedAgentTypes.length;
    if (length <= 1) return null;
    const index = orderedIncludedAgentTypes.indexOf(selectedAgentType);
    if (index === -1) return null;
    const prevIndex = (index - 1 + length) % length;
    return orderedIncludedAgentTypes[prevIndex] ?? null;
  }, [orderedIncludedAgentTypes, selectedAgentType]);

  // Scan the queue to start the next eligible agent.
  const scanAndStartNext = useCallback(
    async (startFrom?: AgentType | null) => {
      if (!enabledRef.current) return { started: false };
      logMessage(`scan: starting from ${startFrom ?? 'head'}`);
      let hasBlocked = false;
      let hasEligible = false;
      let candidate = findNextInOrder(startFrom);
      const visited = new Set<AgentType>();

      while (candidate && !visited.has(candidate)) {
        if (!enabledRef.current) return { started: false };
        visited.add(candidate);

        const candidateMeta = configuredAgents.find(
          (agent) => agent.agentType === candidate,
        );
        if (!candidateMeta) {
          logMessage(`scan: ${candidate} not configured`);
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        updateAgentType(candidate);
        markRewardSnapshotPending(candidate);
        await waitForAgentSelection(candidate, candidateMeta.serviceConfigId);
        await refreshRewardsEligibility(candidate);
        await waitForAgentSelection(candidate, candidateMeta.serviceConfigId);
        await waitForBalancesReady();
        const eligibilityReady = await waitForEligibilityReady();
        if (!eligibilityReady) {
          scheduleNextScan(30);
          return { started: false };
        }

        const eligibility = normalizeEligibility(getSelectedEligibility());
        if (!eligibility.canRun) {
          const reason = formatEligibilityReason(eligibility);
          const isLoadingReason = reason.toLowerCase().includes('loading');
          if (reason.startsWith('Low balance')) {
            logMessage(
              `low balance check: ${candidate} service=${candidateMeta.serviceConfigId}`,
            );
          }
          if (isLoadingReason) {
            logMessage(`scan: ${candidate} still loading (${reason})`);
            scheduleNextScan(30);
            return { started: false };
          }
          logMessage(`scan: ${candidate} blocked (${reason})`);
          notifySkipOnce(candidate, reason);
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const candidateEligibility = await waitForRewardsEligibility(candidate);
        if (candidateEligibility === true) {
          logMessage(`scan: ${candidate} already earned rewards`);
          hasEligible = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        logMessage(`scan: starting ${candidate}`);
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

      scheduleNextScan(delay);
      return { started: false };
    },
    [
      configuredAgents,
      enabledRef,
      findNextInOrder,
      getSelectedEligibility,
      logMessage,
      markRewardSnapshotPending,
      refreshRewardsEligibility,
      notifySkipOnce,
      scheduleNextScan,
      startAgentWithRetries,
      updateAgentType,
      waitForAgentSelection,
      waitForBalancesReady,
      waitForRewardsEligibility,
      waitForEligibilityReady,
    ],
  );

  // Try to start the currently selected agent first when auto-run is enabled.
  const startSelectedAgentIfEligible = useCallback(async () => {
    if (!orderedIncludedAgentTypes.includes(selectedAgentType)) {
      logMessage(
        `auto-run enable: selected ${selectedAgentType} not in included list`,
      );
      return false;
    }

    const selectedMeta = configuredAgents.find(
      (agent) => agent.agentType === selectedAgentType,
    );
    if (!selectedMeta) {
      logMessage(`auto-run enable: ${selectedAgentType} not configured`);
      return false;
    }

    const rewardSnapshot = getRewardSnapshot(selectedAgentType);
    if (rewardSnapshot === true) {
      logMessage(
        `auto-run enable: ${selectedAgentType} already earned rewards`,
      );
      return false;
    }
    if (rewardSnapshot === undefined) {
      logMessage(
        `auto-run enable: rewards unknown for ${selectedAgentType}, proceeding`,
      );
    }

    markRewardSnapshotPending(selectedAgentType);
    await waitForAgentSelection(
      selectedAgentType,
      selectedMeta.serviceConfigId,
    );
    await refreshRewardsEligibility(selectedAgentType);
    await waitForAgentSelection(
      selectedAgentType,
      selectedMeta.serviceConfigId,
    );
    await waitForBalancesReady();
    const eligibilityReady = await waitForEligibilityReady();
    if (!eligibilityReady) {
      scheduleNextScan(30);
      return false;
    }
    const eligibility = normalizeEligibility(getSelectedEligibility());
    if (!eligibility.canRun) {
      const reason = formatEligibilityReason(eligibility);
      const isLoadingReason = reason.toLowerCase().includes('loading');
      if (reason.startsWith('Low balance')) {
        logMessage(
          `low balance check: ${selectedAgentType} service=${selectedMeta.serviceConfigId}`,
        );
      }
      if (isLoadingReason) {
        logMessage(
          `auto-run enable: selected ${selectedAgentType} still loading (${reason})`,
        );
        scheduleNextScan(30);
        return false;
      }
      logMessage(
        `auto-run enable: selected ${selectedAgentType} blocked (${reason})`,
      );
      notifySkipOnce(selectedAgentType, reason);
      return false;
    }

    const rewardsEligibility =
      await waitForRewardsEligibility(selectedAgentType);
    if (rewardsEligibility === true) {
      logMessage(
        `auto-run enable: ${selectedAgentType} already earned rewards`,
      );
      return false;
    }

    logMessage(`auto-run enable: starting selected ${selectedAgentType}`);
    const started = await startAgentWithRetries(selectedAgentType);
    if (!started) {
      logMessage(`auto-run enable: failed to start ${selectedAgentType}`);
    }
    return started;
  }, [
    configuredAgents,
    getSelectedEligibility,
    getRewardSnapshot,
    logMessage,
    markRewardSnapshotPending,
    refreshRewardsEligibility,
    notifySkipOnce,
    orderedIncludedAgentTypes,
    selectedAgentType,
    startAgentWithRetries,
    waitForAgentSelection,
    waitForBalancesReady,
    waitForEligibilityReady,
    waitForRewardsEligibility,
  ]);

  return {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
  };
};
