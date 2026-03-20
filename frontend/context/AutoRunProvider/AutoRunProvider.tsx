import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AgentType } from '@/constants';
import { PAGES, Pages } from '@/constants/pages';
import {
  useArchivedAgents,
  useElectronApi,
  usePageState,
  useServices,
} from '@/hooks';

import {
  DISABLE_RACE_STOP_CHECK_INTERVAL_MS,
  DISABLE_RACE_STOP_MAX_CHECKS,
} from './constants';
import { useAutoRunController } from './hooks/useAutoRunController';
import { useAutoRunStore } from './hooks/useAutoRunStore';
import { useConfiguredAgents } from './hooks/useConfiguredAgents';
import { useSafeEligibility } from './hooks/useSafeEligibility';
import { useSelectedEligibility } from './hooks/useSelectedEligibility';
import { AutoRunContextType } from './types';
import {
  appendNewAgents,
  getDecommissionedAgentTypes,
  getEligibleAgentTypes,
  getExcludedAgentTypes,
  getOrderedIncludedAgentTypes,
  normalizeIncludedAgents,
  sortIncludedAgents,
} from './utils/utils';

/**
 * Pages on which auto-run is allowed to call updateAgentType.
 * Agent-specific pages (AgentWallet, AgentStaking, Setup, staking flows,
 * UpdateAgentTemplate, FundPearlWallet) are excluded so visible content is not
 * disrupted by a background rotation. Neutral pages whose content is
 * independent of selectedAgentType are included.
 * New pages are blocked by default (safe); add here only when confirmed neutral.
 *
 * Note: FundPearlWallet is excluded — it reads selectedAgentConfig.evmHomeChainId
 * to derive chain, symbol, and gas requirement, so a switch would change those
 * values mid-flow.
 */
const AGENT_SWITCH_ALLOWED_PAGES = new Set<Pages>([
  PAGES.Main,
  PAGES.Settings,
  PAGES.HelpAndSupport,
  PAGES.ReleaseNotes,
  PAGES.PearlWallet,
]);

const AutoRunContext = createContext<AutoRunContextType>({
  enabled: false,
  includedAgents: [],
  excludedAgents: [],
  isToggling: false,
  eligibilityByAgent: {},
  setEnabled: () => {},
  includeAgent: () => {},
  excludeAgent: () => {},
});

/**
 * - Provider that manages the state and logic for auto-running agents
 * based on the user's configuration and the current eligibility of agents.
 * - It orchestrates the rotation of agents, handles enabling/disabling auto-run,
 * and provides context values for the UI to consume.
 */
export const AutoRunProvider = ({ children }: PropsWithChildren) => {
  const { services, selectedAgentType, selectedService, updateAgentType } =
    useServices();
  const { showNotification } = useElectronApi();
  const {
    enabled,
    includedAgents,
    isInitialized,
    userExcludedAgents,
    updateAutoRun,
  } = useAutoRunStore();

  // Derived agent lists used for UI and rotation ordering.
  const configuredAgents = useConfiguredAgents(services);
  const configuredAgentTypes = useMemo(
    () => configuredAgents.map((agent) => agent.agentType),
    [configuredAgents],
  );
  const decommissionedAgentTypes = useMemo(
    () => getDecommissionedAgentTypes(configuredAgents),
    [configuredAgents],
  );
  const { archivedAgents } = useArchivedAgents();
  const eligibleAgentTypes = useMemo(
    () =>
      getEligibleAgentTypes(configuredAgentTypes, [
        ...decommissionedAgentTypes,
        ...archivedAgents,
      ]),
    [configuredAgentTypes, decommissionedAgentTypes, archivedAgents],
  );
  const includedAgentsSorted = useMemo(
    () =>
      sortIncludedAgents(
        normalizeIncludedAgents(includedAgents),
        eligibleAgentTypes,
      ),
    [eligibleAgentTypes, includedAgents],
  );
  const orderedIncludedAgentTypes = useMemo(
    () =>
      getOrderedIncludedAgentTypes(includedAgentsSorted, eligibleAgentTypes),
    [eligibleAgentTypes, includedAgentsSorted],
  );
  const includedAgentTypesForUi = useMemo(
    () => includedAgentsSorted.map((agent) => agent.agentType),
    [includedAgentsSorted],
  );
  const excludedAgents = useMemo(
    () => getExcludedAgentTypes(configuredAgentTypes, includedAgentTypesForUi),
    [configuredAgentTypes, includedAgentTypesForUi],
  );

  // Eligibility for the currently selected agent.
  const { canCreateSafeForChain, createSafeIfNeeded } = useSafeEligibility();
  const { isSelectedAgentDetailsLoading, getSelectedEligibility } =
    useSelectedEligibility({ canCreateSafeForChain });

  // Block auto-run from switching agents when the user is not on the Main page
  // (e.g. Setup/FundYourAgent, PearlWallet, AgentWallet, staking flows, etc.).
  // Scans will reschedule themselves in SCAN_LOADING_RETRY_SECONDS when blocked.
  // useLayoutEffect (not useEffect) so the ref is updated inside React's
  // synchronous commit phase — before the browser returns control to the event
  // loop. This guarantees no setTimeout/setInterval scan tick can fire with a
  // stale value between pageState changing and the ref being written.
  const { pageState } = usePageState();
  const canSwitchAgentRef = useRef(AGENT_SWITCH_ALLOWED_PAGES.has(pageState));
  useLayoutEffect(() => {
    canSwitchAgentRef.current = AGENT_SWITCH_ALLOWED_PAGES.has(pageState);
  }, [pageState]);

  // Auto-run controller runs the orchestration loop.
  const { stopRunningAgent, runningAgentType } = useAutoRunController({
    enabled,
    orderedIncludedAgentTypes,
    configuredAgents,
    updateAgentType,
    selectedAgentType,
    selectedServiceConfigId: selectedService?.service_config_id ?? null,
    isSelectedAgentDetailsLoading,
    getSelectedEligibility,
    createSafeIfNeeded,
    canSwitchAgentRef,
    showNotification,
    onAutoRunAgentStarted: (agentType) => {
      if (!configuredAgentTypes.includes(agentType)) return;
      updateAgentType(agentType);
    },
    onAutoRunStartStateChange: (isStarting) => {
      setIsStarting(isStarting);
    },
  });

  // Local state to track whether we're in the middle of a start/stop operation,
  // which is used to disable UI controls and prevent concurrent operations.
  const [isStopping, setIsStopping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [disableRaceStopChecksLeft, setDisableRaceStopChecksLeft] = useState(0);
  const isToggling = isStopping || isStarting;

  // Reset the starting flag if auto-run is turned off mid-start.
  useEffect(() => {
    if (!enabled && isStarting) {
      setIsStarting(false);
    }
  }, [enabled, isStarting]);

  // Guard against the narrow race where auto-run is disabled while a start
  // operation is still in-flight: runningAgentType can still be null at disable
  // time, and only appears a few seconds later via polling. In that case we do
  // bounded follow-up checks and stop once if the agent appears.
  useEffect(() => {
    if (enabled) {
      if (disableRaceStopChecksLeft !== 0) {
        setDisableRaceStopChecksLeft(0);
      }
      return;
    }
    if (disableRaceStopChecksLeft <= 0) return;
    if (isStopping) return;

    if (runningAgentType) {
      setIsStopping(true);
      stopRunningAgent()
        .finally(() => setIsStopping(false))
        .finally(() => setDisableRaceStopChecksLeft(0));
      return;
    }

    const timeoutId = setTimeout(() => {
      setDisableRaceStopChecksLeft((value) => Math.max(value - 1, 0));
    }, DISABLE_RACE_STOP_CHECK_INTERVAL_MS);

    return () => clearTimeout(timeoutId);
  }, [
    enabled,
    disableRaceStopChecksLeft,
    isStopping,
    runningAgentType,
    stopRunningAgent,
  ]);

  // Seed the included list once from eligible agents. After that, empty is intentional.
  useEffect(() => {
    if (!services) return;
    if (isInitialized) return;
    if (eligibleAgentTypes.length === 0) return;

    const includedAgents = eligibleAgentTypes.map((agentType, index) => ({
      agentType,
      order: index,
    }));
    updateAutoRun({ includedAgents, isInitialized: true });
  }, [eligibleAgentTypes, isInitialized, services, updateAutoRun]);

  // Auto-append newly onboarded agents unless explicitly excluded by the user.
  useEffect(() => {
    if (!services) return;
    if (!isInitialized) return;
    if (eligibleAgentTypes.length === 0) return;

    const includedSet = new Set(includedAgents.map((item) => item.agentType));
    const excludedSet = new Set(userExcludedAgents);
    const newAgents = eligibleAgentTypes.filter(
      (agentType) => !includedSet.has(agentType) && !excludedSet.has(agentType),
    );

    if (newAgents.length === 0) return;

    updateAutoRun({
      includedAgents: appendNewAgents(includedAgents, newAgents),
    });
  }, [
    eligibleAgentTypes,
    includedAgents,
    isInitialized,
    services,
    updateAutoRun,
    userExcludedAgents,
  ]);

  // Keep included list normalized and drop excluded or decommissioned agents.
  useEffect(() => {
    if (includedAgents.length === 0) return;
    const excludedSet = new Set(userExcludedAgents);
    const normalized = normalizeIncludedAgents(includedAgents).filter(
      (item) =>
        eligibleAgentTypes.includes(item.agentType) &&
        !excludedSet.has(item.agentType),
    );
    const hasChanges =
      normalized.length !== includedAgents.length ||
      normalized.some(
        (item, index) =>
          includedAgents[index]?.agentType !== item.agentType ||
          includedAgents[index]?.order !== item.order,
      );

    if (!hasChanges) return;
    updateAutoRun({ includedAgents: normalized });
  }, [eligibleAgentTypes, includedAgents, updateAutoRun, userExcludedAgents]);

  const setEnabled = useCallback(
    (value: boolean) => {
      // If enabling, update the state and useEffect in `useAutoRunController`
      // will handle starting the first agent.
      if (value) {
        setDisableRaceStopChecksLeft(0);
        updateAutoRun({ enabled: true });
        return;
      }

      if (!enabled) return;

      // If disabling, we need to stop the currently running agent immediately.
      if (isStarting && !runningAgentType) {
        setDisableRaceStopChecksLeft(DISABLE_RACE_STOP_MAX_CHECKS);
      } else {
        setDisableRaceStopChecksLeft(0);
      }
      updateAutoRun({ enabled: false });
      if (isStopping) return;

      setIsStopping(true);
      stopRunningAgent().finally(() => setIsStopping(false));
    },
    [
      enabled,
      isStarting,
      isStopping,
      runningAgentType,
      stopRunningAgent,
      updateAutoRun,
    ],
  );

  /**
   * Include an agent in the auto-run rotation.
   */
  const includeAgent = useCallback(
    (agentType: AgentType) => {
      if (!eligibleAgentTypes.includes(agentType)) return;
      const nextExcluded = userExcludedAgents.filter(
        (item) => item !== agentType,
      );
      const existing = includedAgents.find(
        (item) => item.agentType === agentType,
      );
      if (existing) {
        if (nextExcluded.length !== userExcludedAgents.length) {
          updateAutoRun({ userExcludedAgents: nextExcluded });
        }
        return;
      }

      updateAutoRun({
        includedAgents: appendNewAgents(includedAgents, [agentType]),
        userExcludedAgents: nextExcluded,
      });
    },
    [eligibleAgentTypes, includedAgents, updateAutoRun, userExcludedAgents],
  );

  /**
   * Exclude an agent from the auto-run rotation.
   */
  const excludeAgent = useCallback(
    (agentType: AgentType) => {
      const isLastIncluded =
        includedAgentTypesForUi.length <= 1 &&
        includedAgentTypesForUi.includes(agentType);
      if (isLastIncluded) return;
      const nextIncluded = includedAgents.filter(
        (item) => item.agentType !== agentType,
      );
      const nextExcluded = userExcludedAgents.includes(agentType)
        ? userExcludedAgents
        : [...userExcludedAgents, agentType];

      updateAutoRun({
        includedAgents: nextIncluded,
        userExcludedAgents: nextExcluded,
      });
    },
    [
      includedAgentTypesForUi,
      includedAgents,
      updateAutoRun,
      userExcludedAgents,
    ],
  );

  // Provide UI eligibility; non-selected agents default to permissive.
  const eligibilityByAgent = useMemo(() => {
    // Seed all configured agents with a permissive default so the "+" button
    // is enabled by default. We only have live eligibility data for the
    // currently selected agent; for the rest we fall back to canRun: true and
    // let the execution-time checks (in useAutoRunController) handle skipping.
    const base: AutoRunContextType['eligibilityByAgent'] = {};
    for (const { agentType } of configuredAgents) {
      base[agentType] = { canRun: true };
    }
    for (const agentType of decommissionedAgentTypes) {
      base[agentType] = { canRun: false, reason: 'Decommissioned' };
    }
    base[selectedAgentType] = getSelectedEligibility();
    return base;
  }, [
    configuredAgents,
    decommissionedAgentTypes,
    getSelectedEligibility,
    selectedAgentType,
  ]);

  const value = useMemo(
    () => ({
      enabled,
      includedAgents: includedAgentsSorted,
      excludedAgents,
      isToggling,
      eligibilityByAgent,
      setEnabled,
      includeAgent,
      excludeAgent,
    }),
    [
      enabled,
      excludedAgents,
      eligibilityByAgent,
      excludeAgent,
      includeAgent,
      includedAgentsSorted,
      isToggling,
      setEnabled,
    ],
  );

  return (
    <AutoRunContext.Provider value={value}>{children}</AutoRunContext.Provider>
  );
};

export const useAutoRunContext = () => useContext(AutoRunContext);
