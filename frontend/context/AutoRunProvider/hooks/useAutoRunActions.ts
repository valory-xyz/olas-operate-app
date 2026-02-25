import { MutableRefObject, useCallback } from 'react';

import { AgentType } from '@/constants';
import { ServicesService } from '@/service/Services';
import { delayInSeconds } from '@/utils/delay';

import { COOLDOWN_SECONDS, RETRY_BACKOFF_SECONDS } from '../constants';
import { AgentMeta } from '../types';
import { notifyStartFailed } from '../utils';
import { useAutoRunScanner } from './useAutoRunScanner';

const START_TIMEOUT_SECONDS = 120;

type UseAutoRunActionsParams = {
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
  createSafeIfNeeded: (meta: AgentMeta) => Promise<void>;
  startService: (input: {
    agentType: AgentType;
    agentConfig: AgentMeta['agentConfig'];
    service: AgentMeta['service'];
    stakingProgramId: AgentMeta['stakingProgramId'];
    createSafeIfNeeded: () => Promise<void>;
  }) => Promise<unknown>;
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
  waitForRunningAgent: (
    agentType: AgentType,
    timeoutSeconds: number,
  ) => Promise<boolean>;
  waitForStoppedAgent: (
    agentType: AgentType,
    timeoutSeconds: number,
  ) => Promise<boolean>;
  markRewardSnapshotPending: (agentType: AgentType) => void;
  getRewardSnapshot: (agentType: AgentType) => boolean | undefined;
  notifySkipOnce: (agentType: AgentType, reason?: string) => void;
  onAutoRunAgentStarted?: (agentType: AgentType) => void;
  showNotification?: (title: string, body?: string) => void;
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

/**
 * hook to manage actions related to auto-run, such as starting/stopping agents with retries,
 * scanning for the next eligible agent, and rotating to the next agent after cooldown.
 * It uses signals from useAutoRunSignals to coordinate these actions based on the current state.
 */
export const useAutoRunActions = ({
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
  refreshRewardsEligibility,
  waitForRunningAgent,
  waitForStoppedAgent,
  markRewardSnapshotPending,
  getRewardSnapshot,
  notifySkipOnce,
  onAutoRunAgentStarted,
  showNotification,
  scheduleNextScan,
  logMessage,
}: UseAutoRunActionsParams) => {
  const waitForEligibilityReady = useCallback(async () => {
    while (enabledRef.current) {
      const eligibility = getSelectedEligibility();
      if (eligibility.reason !== 'Loading') return true;
      await delayInSeconds(2);
    }
    return false;
  }, [enabledRef, getSelectedEligibility]);

  // Start a single agent with retries and wait for it to be running.
  const startAgentWithRetries = useCallback(
    async (agentType: AgentType) => {
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
      await waitForAgentSelection(agentType, meta.serviceConfigId);
      await waitForBalancesReady();
      const eligibilityReady = await waitForEligibilityReady();
      if (!eligibilityReady) return false;
      const eligibility = getSelectedEligibility();
      if (!eligibility.canRun) {
        const reason = formatEligibilityReason(eligibility);
        logMessage(`start: ${agentType} blocked (${reason})`);
        notifySkipOnce(agentType, reason);
        return false;
      }
      for (
        let attempt = 0;
        attempt < RETRY_BACKOFF_SECONDS.length;
        attempt += 1
      ) {
        try {
          logMessage(`starting ${agentType} (attempt ${attempt + 1})`);
          logMessage(`startService -> ${agentType} (begin)`);
          await startService({
            agentType,
            agentConfig: meta.agentConfig,
            service: meta.service,
            stakingProgramId: meta.stakingProgramId,
            createSafeIfNeeded: () => createSafeIfNeeded(meta),
          });
          logMessage(`startService -> ${agentType} (done)`);

          const deployed = await waitForRunningAgent(
            agentType,
            START_TIMEOUT_SECONDS,
          );
          if (deployed) {
            logMessage(`started ${agentType}`);
            onAutoRunAgentStarted?.(agentType);
            return true;
          }
          logMessage(`start timeout for ${agentType} (attempt ${attempt + 1})`);
        } catch (error) {
          logMessage(`start error for ${agentType}: ${error}`);
        }
        await delayInSeconds(RETRY_BACKOFF_SECONDS[attempt]);
      }
      notifyStartFailed(showNotification, agentName);
      logMessage(`start failed for ${agentType}`);
      return false;
    },
    [
      configuredAgents,
      createSafeIfNeeded,
      enabledRef,
      getSelectedEligibility,
      logMessage,
      notifySkipOnce,
      onAutoRunAgentStarted,
      showNotification,
      startService,
      updateAgentType,
      waitForAgentSelection,
      waitForBalancesReady,
      waitForEligibilityReady,
      waitForRunningAgent,
    ],
  );

  // Stop a single agent and wait until it's no longer running.
  const stopAgent = useCallback(
    async (agentType: AgentType, serviceConfigId: string) => {
      try {
        logMessage(`stopping ${serviceConfigId}`);
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
    notifySkipOnce,
    startAgentWithRetries,
    scheduleNextScan,
    logMessage,
  });

  // Stop the current agent, cooldown, then scan for the next candidate.
  const rotateToNext = useCallback(
    async (currentAgentType: AgentType) => {
      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return;

      const stopOk = await stopAgent(
        currentMeta.agentType,
        currentMeta.serviceConfigId,
      );
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
    [configuredAgents, enabledRef, logMessage, scanAndStartNext, stopAgent],
  );

  // Stop whichever agent is currently running.
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

  return {
    getPreferredStartFrom,
    scanAndStartNext,
    startSelectedAgentIfEligible,
    rotateToNext,
    stopRunningAgent,
  };
};
