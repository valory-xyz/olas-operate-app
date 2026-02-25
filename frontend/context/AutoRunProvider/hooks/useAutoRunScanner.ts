import { MutableRefObject, useCallback } from 'react';

import { AgentType } from '@/constants';
import { delayInSeconds } from '@/utils/delay';

import {
  SCAN_BLOCKED_DELAY_SECONDS,
  SCAN_ELIGIBLE_DELAY_SECONDS,
} from '../constants';
import { AgentMeta } from '../types';

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
    (eligibility: {
      canRun: boolean;
      reason?: string;
      loadingReason?: string;
    }) => {
      if (eligibility.reason === 'Another agent running') {
        return {
          canRun: false,
          reason: 'Loading',
          loadingReason: 'Another agent running',
        };
      }
      if (eligibility.reason !== 'Loading') return eligibility;
      const loadingReason = eligibility.loadingReason
        ?.split(',')
        .map((item) => item.trim());
      const isOnlyBalances =
        loadingReason &&
        loadingReason.length === 1 &&
        loadingReason[0] === 'Balances';
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
    const startedAt = Date.now();
    while (enabledRef.current) {
      const eligibility = normalizeEligibility(getSelectedEligibility());
      if (eligibility.reason !== 'Loading') return true;
      const now = Date.now();
      if (now - startedAt > 60_000) {
        logMessage('eligibility wait timeout');
        return false;
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
      let hasBlocked = false;
      let hasEligible = false;
      let candidate = findNextInOrder(startFrom);
      if (!candidate) {
        scheduleNextScan(SCAN_ELIGIBLE_DELAY_SECONDS);
        return { started: false };
      }
      const visited = new Set<AgentType>();

      while (candidate && !visited.has(candidate)) {
        if (!enabledRef.current) return { started: false };
        visited.add(candidate);

        const candidateMeta = configuredAgents.find(
          (agent) => agent.agentType === candidate,
        );
        if (!candidateMeta) {
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        updateAgentType(candidate);
        markRewardSnapshotPending(candidate);
        const selectionReady = await waitForAgentSelection(
          candidate,
          candidateMeta.serviceConfigId,
        );
        if (!selectionReady) return { started: false };
        await refreshRewardsEligibility(candidate);
        const selectionReadyAfterRefresh = await waitForAgentSelection(
          candidate,
          candidateMeta.serviceConfigId,
        );
        if (!selectionReadyAfterRefresh) return { started: false };
        const balancesReady = await waitForBalancesReady();
        if (!balancesReady) return { started: false };
        const eligibilityReady = await waitForEligibilityReady();
        if (!eligibilityReady) {
          scheduleNextScan(30);
          return { started: false };
        }

        const eligibility = normalizeEligibility(getSelectedEligibility());
        if (!eligibility.canRun) {
          const reason = formatEligibilityReason(eligibility);
          const isLoadingReason = reason.toLowerCase().includes('loading');
          if (isLoadingReason) {
            scheduleNextScan(30);
            return { started: false };
          }
          notifySkipOnce(candidate, reason);
          hasBlocked = true;
          candidate = findNextInOrder(candidate);
          continue;
        }

        const candidateEligibility = await waitForRewardsEligibility(candidate);
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
      markRewardSnapshotPending,
      refreshRewardsEligibility,
      notifySkipOnce,
      normalizeEligibility,
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
      return false;
    }

    const selectedMeta = configuredAgents.find(
      (agent) => agent.agentType === selectedAgentType,
    );
    if (!selectedMeta) {
      return false;
    }

    const rewardSnapshot = getRewardSnapshot(selectedAgentType);
    if (rewardSnapshot === true) {
      return false;
    }

    markRewardSnapshotPending(selectedAgentType);
    const selectionReady = await waitForAgentSelection(
      selectedAgentType,
      selectedMeta.serviceConfigId,
    );
    if (!selectionReady) return false;
    await refreshRewardsEligibility(selectedAgentType);
    const selectionReadyAfterRefresh = await waitForAgentSelection(
      selectedAgentType,
      selectedMeta.serviceConfigId,
    );
    if (!selectionReadyAfterRefresh) return false;
    const balancesReady = await waitForBalancesReady();
    if (!balancesReady) return false;
    const eligibilityReady = await waitForEligibilityReady();
    if (!eligibilityReady) {
      scheduleNextScan(30);
      return false;
    }
    const eligibility = normalizeEligibility(getSelectedEligibility());
    if (!eligibility.canRun) {
      const reason = formatEligibilityReason(eligibility);
      const isLoadingReason = reason.toLowerCase().includes('loading');
      if (isLoadingReason) {
        scheduleNextScan(30);
        return false;
      }
      notifySkipOnce(selectedAgentType, reason);
      return false;
    }

    const rewardsEligibility =
      await waitForRewardsEligibility(selectedAgentType);
    if (rewardsEligibility === true) {
      return false;
    }

    const started = await startAgentWithRetries(selectedAgentType);
    return started;
  }, [
    configuredAgents,
    getSelectedEligibility,
    getRewardSnapshot,
    markRewardSnapshotPending,
    refreshRewardsEligibility,
    notifySkipOnce,
    orderedIncludedAgentTypes,
    selectedAgentType,
    startAgentWithRetries,
    waitForAgentSelection,
    normalizeEligibility,
    scheduleNextScan,
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
