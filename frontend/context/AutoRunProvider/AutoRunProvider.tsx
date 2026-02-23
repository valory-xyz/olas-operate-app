import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AgentType,
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '@/constants';
import {
  useAgentRunning,
  useBalanceAndRefillRequirementsContext,
  useElectronApi,
  useOnlineStatusContext,
  useRewardContext,
  useServices,
} from '@/hooks';
import { ServicesService } from '@/service/Services';
import { delayInSeconds } from '@/utils/delay';
import { updateServiceIfNeeded } from '@/utils/service';

import {
  AUTO_RUN_LOG_PREFIX,
  COOLDOWN_SECONDS,
  RETRY_BACKOFF_SECONDS,
  START_TIMEOUT_SECONDS,
} from './constants';
import { useAutoRunStore } from './hooks/useAutoRunStore';
import { useConfiguredAgents } from './hooks/useConfiguredAgents';
import { useEligibilityByAgent } from './hooks/useEligibilityByAgent';
import { useGeoEligibility } from './hooks/useGeoEligibility';
import { useSafeEligibility } from './hooks/useSafeEligibility';
import { useStakingContractQueries } from './hooks/useStakingContractQueries';
import { useStakingDetailsQueries } from './hooks/useStakingDetailsQueries';
import { AutoRunContextType } from './types';
import {
  appendNewAgents,
  buildIncludedAgentsFromOrder,
  getAgentDisplayName,
  logAutoRun,
  notifySkipped,
  notifyStartFailed,
  sortIncludedAgents,
} from './utils';

const AutoRunContext = createContext<AutoRunContextType>({
  enabled: false,
  includedAgents: [],
  excludedAgents: [],
  currentAgent: null,
  eligibilityByAgent: {},
  setEnabled: () => {},
  includeAgent: () => {},
  excludeAgent: () => {},
});

const SCAN_BLOCKED_DELAY_SECONDS = 10 * 60;
const SCAN_ELIGIBLE_DELAY_SECONDS = 30 * 60;
const CANDIDATE_ELIGIBILITY_TIMEOUT_SECONDS = 30;

export const AutoRunProvider = ({ children }: PropsWithChildren) => {
  const { showNotification, logEvent } = useElectronApi();
  const { services, updateAgentType, selectedAgentType } = useServices();
  const { runningAgentType } = useAgentRunning();
  const { isOnline } = useOnlineStatusContext();
  const { isEligibleForRewards } = useRewardContext();
  const {
    allowStartAgentByServiceConfigId,
    isBalancesAndFundingRequirementsLoadingForAllServices,
  } = useBalanceAndRefillRequirementsContext();

  const { enabled, includedAgents, currentAgent, updateAutoRun } =
    useAutoRunStore();

  const configuredAgents = useConfiguredAgents(services);
  const configuredAgentTypes = useMemo(
    () => configuredAgents.map((agent) => agent.agentType),
    [configuredAgents],
  );

  const includedAgentsSorted = useMemo(
    () => sortIncludedAgents(includedAgents, configuredAgentTypes),
    [configuredAgentTypes, includedAgents],
  );

  const orderedIncludedAgentTypes = useMemo(() => {
    if (includedAgentsSorted.length > 0) {
      return includedAgentsSorted.map((agent) => agent.agentType);
    }
    return configuredAgentTypes;
  }, [configuredAgentTypes, includedAgentsSorted]);

  const excludedAgents = useMemo(() => {
    const includedSet = new Set(orderedIncludedAgentTypes);
    return configuredAgentTypes.filter(
      (agentType) => !includedSet.has(agentType),
    );
  }, [configuredAgentTypes, orderedIncludedAgentTypes]);

  const geoEligibilityQuery = useGeoEligibility(isOnline);
  const stakingDetailsQueries = useStakingDetailsQueries(
    configuredAgents,
    isOnline,
  );
  const stakingContractQueries = useStakingContractQueries(configuredAgents);
  const { canCreateSafeForChain, createSafeIfNeeded } = useSafeEligibility();

  const eligibilityByAgent = useEligibilityByAgent({
    configuredAgents,
    stakingDetailsQueries,
    stakingContractQueries,
    geoEligibility: geoEligibilityQuery.data,
    allowStartAgentByServiceConfigId,
    isBalancesAndFundingRequirementsLoadingForAllServices,
    canCreateSafeForChain,
  });

  const [hasActivated, setHasActivated] = useState(false);
  const isRotatingRef = useRef(false);
  const skipNotifiedRef = useRef<Partial<Record<AgentType, string>>>({});
  const rewardSnapshotRef = useRef<
    Partial<Record<AgentType, boolean | undefined>>
  >({});
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [scanTick, setScanTick] = useState(0);

  /**
   * Seed the included list using the services order when auto-run has no
   * stored list yet (first run or reset).
   */
  useEffect(() => {
    if (!services) return;
    if (includedAgents.length > 0) return;
    if (configuredAgentTypes.length === 0) return;

    updateAutoRun({
      includedAgents: buildIncludedAgentsFromOrder(configuredAgentTypes),
    });
  }, [configuredAgentTypes, includedAgents.length, services, updateAutoRun]);

  /**
   * Append any newly detected agents to the end of the included list.
   */
  useEffect(() => {
    if (!services) return;
    if (configuredAgentTypes.length === 0) return;

    const includedSet = new Set(includedAgents.map((item) => item.agentType));
    const newAgents = configuredAgentTypes.filter(
      (agentType) => !includedSet.has(agentType),
    );

    if (newAgents.length === 0) return;

    updateAutoRun({
      includedAgents: appendNewAgents(includedAgents, newAgents),
    });
  }, [configuredAgentTypes, includedAgents, services, updateAutoRun]);

  /**
   * Sync sidebar selection with current auto-run agent after activation.
   * This avoids forcing selection before the user manually starts an agent.
   */
  useEffect(() => {
    if (!enabled) return;
    if (!currentAgent) return;
    if (!hasActivated && !runningAgentType) return;
    if (!configuredAgentTypes.includes(currentAgent)) return;
    if (selectedAgentType === currentAgent) return;
    updateAgentType(currentAgent);
  }, [
    configuredAgentTypes,
    currentAgent,
    enabled,
    hasActivated,
    runningAgentType,
    selectedAgentType,
    updateAgentType,
  ]);

  /**
   * Auto-run only activates once the user manually starts any agent.
   */
  useEffect(() => {
    if (!enabled) {
      setHasActivated(false);
      return;
    }
    if (runningAgentType) setHasActivated(true);
  }, [enabled, runningAgentType]);

  /**
   * When a running agent is detected, keep currentAgent in sync.
   */
  useEffect(() => {
    if (!enabled) return;
    if (!runningAgentType) return;
    if (currentAgent === runningAgentType) return;
    updateAutoRun({ currentAgent: runningAgentType });
    logAutoRun(
      logEvent,
      AUTO_RUN_LOG_PREFIX,
      `current agent set to ${runningAgentType}`,
    );
  }, [currentAgent, enabled, logEvent, runningAgentType, updateAutoRun]);

  /**
   * Track latest reward eligibility for the currently selected agent.
   */
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

  const notifySkipOnce = useCallback(
    (agentType: AgentType, reason?: string) => {
      if (!reason) return;
      if (skipNotifiedRef.current[agentType] === reason) return;
      skipNotifiedRef.current[agentType] = reason;
      notifySkipped(showNotification, getAgentDisplayName(agentType), reason);
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `skip ${agentType}: ${reason}`);
    },
    [logEvent, showNotification],
  );

  const waitForRewardsEligibility = useCallback(
    async (agentType: AgentType) => {
      const startedAt = Date.now();
      while (
        Date.now() - startedAt <
        CANDIDATE_ELIGIBILITY_TIMEOUT_SECONDS * 1000
      ) {
        const snapshot = rewardSnapshotRef.current[agentType];
        if (snapshot !== undefined) return snapshot;
        await delayInSeconds(2);
      }
      return undefined;
    },
    [],
  );

  const findNextEligibleAgent = useCallback(
    (currentAgentType?: AgentType | null) => {
      if (orderedIncludedAgentTypes.length === 0) return null;

      const startIndex = currentAgentType
        ? orderedIncludedAgentTypes.indexOf(currentAgentType)
        : -1;

      for (let i = 1; i <= orderedIncludedAgentTypes.length; i += 1) {
        const candidate =
          orderedIncludedAgentTypes[
            (startIndex + i) % orderedIncludedAgentTypes.length
          ];
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
          logAutoRun(
            logEvent,
            AUTO_RUN_LOG_PREFIX,
            `deployment status check failed: ${error}`,
          );
        }
        await delayInSeconds(5);
      }
      return false;
    },
    [logEvent],
  );

  const startAgentWithRetries = useCallback(
    async (agentType: AgentType) => {
      const meta = configuredAgents.find(
        (agent) => agent.agentType === agentType,
      );
      if (!meta) return false;

      const agentName = meta.agentConfig.displayName;
      const eligibility = eligibilityByAgent[agentType];
      if (!eligibility?.canRun) {
        notifySkipOnce(agentType, eligibility?.reason);
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
          logAutoRun(
            logEvent,
            AUTO_RUN_LOG_PREFIX,
            `starting ${agentType} (attempt ${attempt + 1})`,
          );
          await createSafeIfNeeded(meta);
          await updateServiceIfNeeded(meta.service, agentType);
          await ServicesService.startService(meta.serviceConfigId);

          const deployed = await waitForDeploymentStatus(
            meta.serviceConfigId,
            MiddlewareDeploymentStatusMap.DEPLOYED,
            START_TIMEOUT_SECONDS,
          );

          if (deployed) {
            logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `started ${agentType}`);
            return true;
          }

          logAutoRun(
            logEvent,
            AUTO_RUN_LOG_PREFIX,
            `start timeout for ${agentType} (attempt ${attempt + 1})`,
          );
        } catch (error) {
          logAutoRun(
            logEvent,
            AUTO_RUN_LOG_PREFIX,
            `start error for ${agentType}: ${error}`,
          );
        }

        await delayInSeconds(RETRY_BACKOFF_SECONDS[attempt]);
      }

      notifyStartFailed(showNotification, agentName);
      return false;
    },
    [
      configuredAgents,
      createSafeIfNeeded,
      eligibilityByAgent,
      logEvent,
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
        logAutoRun(
          logEvent,
          AUTO_RUN_LOG_PREFIX,
          `stopping ${serviceConfigId}`,
        );
        await ServicesService.stopDeployment(serviceConfigId);
      } catch (error) {
        logAutoRun(
          logEvent,
          AUTO_RUN_LOG_PREFIX,
          `stop failed for ${serviceConfigId}: ${error}`,
        );
      }

      return waitForDeploymentStatus(
        serviceConfigId,
        MiddlewareDeploymentStatusMap.STOPPED,
        START_TIMEOUT_SECONDS,
      );
    },
    [logEvent, waitForDeploymentStatus],
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
      let candidate = findNextEligibleAgent(startFrom);
      const visited = new Set<AgentType>();

      while (candidate && !visited.has(candidate)) {
        visited.add(candidate);

        const eligibility = eligibilityByAgent[candidate];
        if (!eligibility?.canRun) {
          notifySkipOnce(candidate, eligibility?.reason);
          hasBlocked = true;
          candidate = findNextEligibleAgent(candidate);
          continue;
        }

        updateAgentType(candidate);
        rewardSnapshotRef.current[candidate] = undefined;
        const candidateEligibility = await waitForRewardsEligibility(candidate);

        if (candidateEligibility === undefined) {
          notifySkipOnce(candidate, 'Rewards status unavailable');
          hasBlocked = true;
          candidate = findNextEligibleAgent(candidate);
          continue;
        }

        if (candidateEligibility === true) {
          hasEligible = true;
          candidate = findNextEligibleAgent(candidate);
          continue;
        }

        const started = await startAgentWithRetries(candidate);
        if (started) return { started: true };

        hasBlocked = true;
        candidate = findNextEligibleAgent(candidate);
      }

      const delay = hasBlocked
        ? SCAN_BLOCKED_DELAY_SECONDS
        : hasEligible
          ? SCAN_ELIGIBLE_DELAY_SECONDS
          : SCAN_BLOCKED_DELAY_SECONDS;

      logAutoRun(
        logEvent,
        AUTO_RUN_LOG_PREFIX,
        `scan complete; scheduling next scan in ${delay}s`,
      );
      scheduleNextScan(delay);

      return { started: false };
    },
    [
      eligibilityByAgent,
      findNextEligibleAgent,
      logEvent,
      notifySkipOnce,
      scheduleNextScan,
      startAgentWithRetries,
      updateAgentType,
      waitForRewardsEligibility,
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
        logAutoRun(
          logEvent,
          AUTO_RUN_LOG_PREFIX,
          `stop timeout for ${currentAgentType}, aborting rotation`,
        );
        return;
      }

      logAutoRun(
        logEvent,
        AUTO_RUN_LOG_PREFIX,
        `cooldown ${COOLDOWN_SECONDS}s`,
      );
      await delayInSeconds(COOLDOWN_SECONDS);

      await scanAndStartNext(currentAgentType);
    },
    [configuredAgents, logEvent, scanAndStartNext, stopAgent],
  );

  /**
   * Main rotation loop: when the current agent becomes eligible for rewards,
   * stop it, cooldown, then scan for the next candidate.
   */
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
        logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `rotation error: ${error}`);
      })
      .finally(() => {
        isRotatingRef.current = false;
      });
  }, [
    currentAgent,
    enabled,
    hasActivated,
    isEligibleForRewards,
    logEvent,
    rotateToNext,
    runningAgentType,
    selectedAgentType,
    scanTick,
  ]);

  /**
   * Manual stop: if auto-run is enabled and no agent is running,
   * try to start the next eligible agent after cooldown.
   */
  useEffect(() => {
    if (!enabled || !hasActivated) return;
    if (runningAgentType) return;
    if (isRotatingRef.current) return;

    isRotatingRef.current = true;
    delayInSeconds(COOLDOWN_SECONDS)
      .then(() => scanAndStartNext(currentAgent))
      .catch((error) =>
        logAutoRun(
          logEvent,
          AUTO_RUN_LOG_PREFIX,
          `manual stop start error: ${error}`,
        ),
      )
      .finally(() => {
        isRotatingRef.current = false;
      });
  }, [
    currentAgent,
    enabled,
    hasActivated,
    logEvent,
    runningAgentType,
    scanAndStartNext,
    scanTick,
  ]);

  const setEnabled = useCallback(
    (value: boolean) => {
      updateAutoRun({ enabled: value });
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `enabled set to ${value}`);
    },
    [logEvent, updateAutoRun],
  );

  const includeAgent = useCallback(
    (agentType: AgentType) => {
      if (!configuredAgentTypes.includes(agentType)) return;
      const existing = includedAgents.find(
        (item) => item.agentType === agentType,
      );
      if (existing) return;

      updateAutoRun({
        includedAgents: appendNewAgents(includedAgents, [agentType]),
      });
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `included ${agentType}`);
    },
    [configuredAgentTypes, includedAgents, logEvent, updateAutoRun],
  );

  const excludeAgent = useCallback(
    (agentType: AgentType) => {
      if (!includedAgents.length) return;
      const nextIncluded = includedAgents.filter(
        (item) => item.agentType !== agentType,
      );
      updateAutoRun({ includedAgents: nextIncluded });
      logAutoRun(logEvent, AUTO_RUN_LOG_PREFIX, `excluded ${agentType}`);
    },
    [includedAgents, logEvent, updateAutoRun],
  );

  const value = useMemo(
    () => ({
      enabled,
      includedAgents: includedAgentsSorted,
      excludedAgents,
      currentAgent,
      eligibilityByAgent,
      setEnabled,
      includeAgent,
      excludeAgent,
    }),
    [
      currentAgent,
      enabled,
      excludedAgents,
      eligibilityByAgent,
      excludeAgent,
      includeAgent,
      includedAgentsSorted,
      setEnabled,
    ],
  );

  return (
    <AutoRunContext.Provider value={value}>{children}</AutoRunContext.Provider>
  );
};

export const useAutoRunContext = () => useContext(AutoRunContext);
