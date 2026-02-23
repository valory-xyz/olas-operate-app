import { useQueries, useQuery } from '@tanstack/react-query';
import { isEmpty, isNil, sortBy } from 'lodash';
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

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import {
  AgentMap,
  AgentType,
  EvmChainId,
  FIVE_SECONDS_INTERVAL,
  GEO_ELIGIBILITY_API_URL,
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
  REACT_QUERY_KEYS,
  StakingProgramId,
} from '@/constants';
import {
  useAgentRunning,
  useBalanceAndRefillRequirementsContext,
  useElectronApi,
  useMasterWalletContext,
  useOnlineStatusContext,
  useServices,
  useStore,
} from '@/hooks';
import { createStakingRewardsQuery } from '@/hooks/useAgentStakingRewardsDetails';
import { useMultisigs } from '@/hooks/useMultisig';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import {
  Address,
  Service,
  ServiceConfigId,
  ServiceStakingDetails,
  StakingContractDetails,
  StakingState,
} from '@/types';
import { delayInSeconds } from '@/utils/delay';
import { updateServiceIfNeeded } from '@/utils/service';

/**
 * Auto-run configuration saved in Electron store.
 */
export type IncludedAgent = {
  agentType: AgentType;
  order: number;
};

export type Eligibility = {
  canRun: boolean;
  reason?: string;
  isEligibleForRewards?: boolean;
};

export type AutoRunContextType = {
  enabled: boolean;
  includedAgents: IncludedAgent[];
  excludedAgents: AgentType[];
  currentAgent: AgentType | null;
  eligibilityByAgent: Partial<Record<AgentType, Eligibility>>;
  setEnabled: (enabled: boolean) => void;
  includeAgent: (agentType: AgentType) => void;
  excludeAgent: (agentType: AgentType) => void;
};

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

type AgentMeta = {
  agentType: AgentType;
  agentConfig: (typeof AGENT_CONFIG)[AgentType];
  service: Service;
  serviceConfigId: ServiceConfigId;
  chainId: EvmChainId;
  stakingProgramId: StakingProgramId;
  multisig?: Address;
  serviceNftTokenId?: number;
};

type GeoEligibilityResponse = {
  eligibility: {
    [key: string]: {
      status: 'allowed' | 'restricted';
    };
  };
};

const AUTO_RUN_LOG_PREFIX = 'autorun:';
const START_TIMEOUT_SECONDS = 120;
const COOLDOWN_SECONDS = 30;
const RETRY_BACKOFF_SECONDS = [15, 30, 60];

const logAutoRun = (
  logEvent: ((message: string) => void) | undefined,
  message: string,
) => {
  logEvent?.(`${AUTO_RUN_LOG_PREFIX} ${message}`);
};

const notifySkipped = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentName: string,
  reason?: string,
) => {
  showNotification?.(`Agent ${agentName} was skipped`, reason);
};

const notifyStartFailed = (
  showNotification: ((title: string, body?: string) => void) | undefined,
  agentName: string,
) => {
  showNotification?.(`Failed to start ${agentName}`, 'Moving to next agent.');
};

const fetchGeoEligibility = async (
  signal: AbortSignal,
): Promise<GeoEligibilityResponse> => {
  const response = await fetch(GEO_ELIGIBILITY_API_URL, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch geo eligibility: ${response.status}`);
  }
  return response.json();
};

const getAgentFromService = (service: Service) => {
  return ACTIVE_AGENTS.find(
    ([, agentConfig]) =>
      agentConfig.servicePublicId === service.service_public_id &&
      agentConfig.middlewareHomeChainId === service.home_chain,
  );
};

const getServiceStakingEligibility = ({
  stakingDetails,
  contractDetails,
}: {
  stakingDetails?: ServiceStakingDetails | null;
  contractDetails?: Partial<StakingContractDetails> | null;
}) => {
  const serviceStakingState = stakingDetails?.serviceStakingState;
  const serviceStakingStartTime = stakingDetails?.serviceStakingStartTime;
  const minimumStakingDuration = contractDetails?.minimumStakingDuration;
  const serviceIds = contractDetails?.serviceIds;
  const maxNumServices = contractDetails?.maxNumServices;

  const isAgentEvicted = serviceStakingState === StakingState.Evicted;
  const isServiceStaked = serviceStakingState === StakingState.Staked;
  const isServiceStakedForMinimumDuration =
    !isNil(serviceStakingStartTime) &&
    !isNil(minimumStakingDuration) &&
    Math.round(Date.now() / 1000) - serviceStakingStartTime >=
      minimumStakingDuration;

  const isEligibleForStaking =
    !isAgentEvicted || isServiceStakedForMinimumDuration;

  const hasEnoughServiceSlots =
    isNil(serviceIds) || isNil(maxNumServices)
      ? null
      : serviceIds.length < maxNumServices;

  return {
    isAgentEvicted,
    isEligibleForStaking,
    isServiceStaked,
    hasEnoughServiceSlots,
  };
};

const isAgentsFunFieldUpdateRequired = (service: Service) => {
  const areFieldsUpdated = [
    'TWEEPY_CONSUMER_API_KEY',
    'TWEEPY_CONSUMER_API_KEY_SECRET',
    'TWEEPY_BEARER_TOKEN',
    'TWEEPY_ACCESS_TOKEN',
    'TWEEPY_ACCESS_TOKEN_SECRET',
  ].every((key) => service.env_variables?.[key]?.value);

  return !areFieldsUpdated;
};

const sortIncludedAgents = (
  includedAgents: IncludedAgent[],
  allowedAgents: AgentType[],
) => {
  if (isEmpty(includedAgents)) return [] as IncludedAgent[];
  const allowed = new Set(allowedAgents);
  return sortBy(
    includedAgents.filter((agent) => allowed.has(agent.agentType)),
    (item) => item.order,
  );
};

const buildIncludedAgentsFromOrder = (agentTypes: AgentType[]) =>
  agentTypes.map((agentType, index) => ({ agentType, order: index }));

const appendNewAgents = (existing: IncludedAgent[], newAgents: AgentType[]) => {
  const maxOrder =
    existing.length > 0 ? Math.max(...existing.map((item) => item.order)) : -1;
  const appended = newAgents.map((agentType, index) => ({
    agentType,
    order: maxOrder + index + 1,
  }));
  return [...existing, ...appended];
};

const useAutoRunStore = () => {
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const autoRun = storeState?.autoRun;
  const enabled = !!autoRun?.enabled;
  const includedAgents = autoRun?.includedAgents ?? [];
  const currentAgent = autoRun?.currentAgent ?? null;

  const updateAutoRun = useCallback(
    (partial: Partial<NonNullable<typeof autoRun>>) => {
      if (!store?.set) return;
      store.set('autoRun', {
        enabled: autoRun?.enabled ?? false,
        currentAgent: autoRun?.currentAgent ?? null,
        includedAgents: autoRun?.includedAgents ?? [],
        ...partial,
      });
    },
    [autoRun?.currentAgent, autoRun?.enabled, autoRun?.includedAgents, store],
  );

  return { enabled, includedAgents, currentAgent, updateAutoRun };
};

const useConfiguredAgents = (services?: Service[]) => {
  return useMemo(() => {
    if (!services) return [] as AgentMeta[];

    return services.reduce<AgentMeta[]>((acc, service) => {
      const agentEntry = getAgentFromService(service);
      if (!agentEntry) return acc;

      const [agentType, agentConfig] = agentEntry;
      const chainConfig = service.chain_configs?.[service.home_chain];
      if (!chainConfig) return acc;

      const stakingProgramId =
        chainConfig.chain_data.user_params.staking_program_id ||
        agentConfig.defaultStakingProgramId;

      acc.push({
        agentType,
        agentConfig,
        service,
        serviceConfigId: service.service_config_id,
        chainId: agentConfig.evmHomeChainId,
        stakingProgramId,
        multisig: chainConfig.chain_data.multisig,
        serviceNftTokenId: chainConfig.chain_data.token,
      });
      return acc;
    }, []);
  }, [services]);
};

const useGeoEligibility = (isOnline: boolean) => {
  return useQuery({
    queryKey: ['geoEligibility', 'autorun'],
    queryFn: ({ signal }) => fetchGeoEligibility(signal),
    enabled: isOnline,
    staleTime: 1000 * 60 * 60,
  });
};

const useRewardsQueries = (configuredAgents: AgentMeta[], isOnline: boolean) =>
  useQueries({
    queries: configuredAgents.map((meta) =>
      createStakingRewardsQuery({
        chainId: meta.chainId,
        serviceConfigId: meta.serviceConfigId,
        stakingProgramId: meta.stakingProgramId,
        multisig: meta.multisig,
        serviceNftTokenId: meta.serviceNftTokenId,
        agentConfig: meta.agentConfig,
        isOnline,
        refetchInterval: FIVE_SECONDS_INTERVAL,
      }),
    ),
  });

const useStakingDetailsQueries = (
  configuredAgents: AgentMeta[],
  isOnline: boolean,
) =>
  useQueries({
    queries: configuredAgents.map((meta) => ({
      queryKey: [
        'autorun',
        'serviceStakingDetails',
        meta.chainId,
        meta.serviceConfigId,
        meta.stakingProgramId,
      ] as const,
      queryFn: async () =>
        meta.agentConfig.serviceApi.getServiceStakingDetails(
          meta.serviceNftTokenId!,
          meta.stakingProgramId,
          meta.chainId,
        ),
      enabled:
        !!meta.serviceConfigId &&
        !!meta.stakingProgramId &&
        !!meta.serviceNftTokenId,
      refetchInterval: isOnline ? FIVE_SECONDS_INTERVAL : false,
    })),
  });

const useStakingContractQueries = (configuredAgents: AgentMeta[]) =>
  useQueries({
    queries: configuredAgents.map((meta) => ({
      queryKey: REACT_QUERY_KEYS.ALL_STAKING_CONTRACT_DETAILS(
        meta.chainId,
        meta.stakingProgramId,
      ),
      queryFn: async () =>
        meta.agentConfig.serviceApi.getStakingContractDetails(
          meta.stakingProgramId,
          meta.chainId,
        ),
      enabled: !!meta.stakingProgramId,
      staleTime: 1000 * 60 * 5,
    })),
  });

const useSafeEligibility = () => {
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { masterSafesOwners } = useMultisigs(masterSafes);

  const canCreateSafeForChain = useCallback(
    (chainId: EvmChainId) => {
      if (!masterSafes || !masterSafesOwners) {
        return { ok: false, reason: 'Safe data loading' };
      }

      const selectedChainHasMasterSafe = masterSafes.some(
        ({ evmChainId }) => evmChainId === chainId,
      );

      if (selectedChainHasMasterSafe) return { ok: true };

      const otherChainOwners = new Set(
        masterSafesOwners
          ?.filter(({ evmChainId }) => evmChainId !== chainId)
          .map((safe) => safe.owners)
          .flat(),
      );

      if (masterEoa) otherChainOwners.delete(masterEoa.address);

      if (otherChainOwners.size <= 0) {
        return { ok: false, reason: 'Backup signer required' };
      }

      if (otherChainOwners.size !== 1) {
        return { ok: false, reason: 'Multiple backup signers detected' };
      }

      return { ok: true };
    },
    [masterEoa, masterSafes, masterSafesOwners],
  );

  const createSafeIfNeeded = useCallback(
    async (meta: AgentMeta) => {
      const { agentConfig } = meta;

      if (!masterSafes || !masterSafesOwners) {
        throw new Error('Safe data not loaded');
      }

      const selectedChainHasMasterSafe = masterSafes.some(
        ({ evmChainId }) => evmChainId === agentConfig.evmHomeChainId,
      );

      if (selectedChainHasMasterSafe) return;

      const otherChainOwners = new Set(
        masterSafesOwners
          ?.filter(
            ({ evmChainId }) => evmChainId !== agentConfig.evmHomeChainId,
          )
          .map((masterSafe) => masterSafe.owners)
          .flat(),
      );

      if (masterEoa) otherChainOwners.delete(masterEoa.address);

      if (otherChainOwners.size <= 0) {
        throw new Error('Backup signer required');
      }

      if (otherChainOwners.size !== 1) {
        throw new Error('Multiple backup signers found');
      }

      await WalletService.createSafe(
        agentConfig.middlewareHomeChainId,
        [...otherChainOwners][0],
      );
    },
    [masterEoa, masterSafes, masterSafesOwners],
  );

  return { canCreateSafeForChain, createSafeIfNeeded };
};

const useEligibilityByAgent = ({
  configuredAgents,
  rewardsQueries,
  stakingDetailsQueries,
  stakingContractQueries,
  geoEligibility,
  allowStartAgentByServiceConfigId,
  isBalancesAndFundingRequirementsLoadingForAllServices,
  canCreateSafeForChain,
}: {
  configuredAgents: AgentMeta[];
  rewardsQueries: ReturnType<typeof useRewardsQueries>;
  stakingDetailsQueries: ReturnType<typeof useStakingDetailsQueries>;
  stakingContractQueries: ReturnType<typeof useStakingContractQueries>;
  geoEligibility?: GeoEligibilityResponse;
  allowStartAgentByServiceConfigId: (serviceConfigId?: string) => boolean;
  isBalancesAndFundingRequirementsLoadingForAllServices: boolean;
  canCreateSafeForChain: (chainId: EvmChainId) => {
    ok: boolean;
    reason?: string;
  };
}) => {
  return useMemo(() => {
    return configuredAgents.reduce<Partial<Record<AgentType, Eligibility>>>(
      (acc, meta, index) => {
        const { agentConfig, agentType, service, chainId, serviceConfigId } =
          meta;

        const rewardsDetails = rewardsQueries[index]?.data;
        const stakingDetails = stakingDetailsQueries[index]?.data;
        const contractDetails = stakingContractQueries[index]?.data;

        const {
          isAgentEvicted,
          isEligibleForStaking,
          isServiceStaked,
          hasEnoughServiceSlots,
        } = getServiceStakingEligibility({
          stakingDetails,
          contractDetails,
        });

        const hasSlot = !isNil(hasEnoughServiceSlots) && !hasEnoughServiceSlots;

        const isEligibleForRewards = rewardsDetails?.isEligibleForRewards;

        const isGeoRestricted =
          agentConfig.isGeoLocationRestricted &&
          geoEligibility?.eligibility?.[agentType]?.status !== 'allowed';

        const allowStart = allowStartAgentByServiceConfigId(serviceConfigId);

        const needsAgentsFunUpdate =
          agentType === AgentMap.AgentsFun &&
          isAgentsFunFieldUpdateRequired(service);

        const safeEligibility = canCreateSafeForChain(chainId);

        if (agentConfig.isUnderConstruction) {
          acc[agentType] = {
            canRun: false,
            reason: 'Under construction',
            isEligibleForRewards,
          };
          return acc;
        }

        if (isGeoRestricted) {
          acc[agentType] = {
            canRun: false,
            reason: 'Region restricted',
            isEligibleForRewards,
          };
          return acc;
        }

        if (isAgentEvicted && !isEligibleForStaking) {
          acc[agentType] = {
            canRun: false,
            reason: 'Evicted',
            isEligibleForRewards,
          };
          return acc;
        }

        if (hasSlot && !isServiceStaked) {
          acc[agentType] = {
            canRun: false,
            reason: 'No available slots',
            isEligibleForRewards,
          };
          return acc;
        }

        if (!safeEligibility.ok) {
          acc[agentType] = {
            canRun: false,
            reason: safeEligibility.reason,
            isEligibleForRewards,
          };
          return acc;
        }

        if (needsAgentsFunUpdate) {
          acc[agentType] = {
            canRun: false,
            reason: 'Update required',
            isEligibleForRewards,
          };
          return acc;
        }

        if (!allowStart) {
          acc[agentType] = {
            canRun: false,
            reason: isBalancesAndFundingRequirementsLoadingForAllServices
              ? 'Requirements loading'
              : 'Low balance',
            isEligibleForRewards,
          };
          return acc;
        }

        acc[agentType] = {
          canRun: true,
          isEligibleForRewards,
        };
        return acc;
      },
      {},
    );
  }, [
    allowStartAgentByServiceConfigId,
    canCreateSafeForChain,
    configuredAgents,
    geoEligibility,
    isBalancesAndFundingRequirementsLoadingForAllServices,
    rewardsQueries,
    stakingContractQueries,
    stakingDetailsQueries,
  ]);
};

export const AutoRunProvider = ({ children }: PropsWithChildren) => {
  const { showNotification, logEvent } = useElectronApi();
  const { services, updateAgentType, selectedAgentType } = useServices();
  const { runningAgentType } = useAgentRunning();
  const { isOnline } = useOnlineStatusContext();
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
  const rewardsQueries = useRewardsQueries(configuredAgents, isOnline);
  const stakingDetailsQueries = useStakingDetailsQueries(
    configuredAgents,
    isOnline,
  );
  const stakingContractQueries = useStakingContractQueries(configuredAgents);
  const { canCreateSafeForChain, createSafeIfNeeded } = useSafeEligibility();

  const eligibilityByAgent = useEligibilityByAgent({
    configuredAgents,
    rewardsQueries,
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
   * Sync sidebar selection with current auto-run agent when enabled.
   */
  useEffect(() => {
    if (!enabled) return;
    if (!currentAgent) return;
    if (!configuredAgentTypes.includes(currentAgent)) return;
    if (selectedAgentType === currentAgent) return;
    updateAgentType(currentAgent);
  }, [
    configuredAgentTypes,
    currentAgent,
    enabled,
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
    logAutoRun(logEvent, `current agent set to ${runningAgentType}`);
  }, [currentAgent, enabled, logEvent, runningAgentType, updateAutoRun]);

  const notifySkipOnce = useCallback(
    (agentType: AgentType, reason?: string) => {
      if (!reason) return;
      if (skipNotifiedRef.current[agentType] === reason) return;
      skipNotifiedRef.current[agentType] = reason;
      const agentName = AGENT_CONFIG[agentType]?.displayName ?? agentType;
      notifySkipped(showNotification, agentName, reason);
      logAutoRun(logEvent, `skip ${agentType}: ${reason}`);
    },
    [logEvent, showNotification],
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

        const eligibility = eligibilityByAgent[candidate];
        if (!eligibility?.canRun) {
          notifySkipOnce(candidate, eligibility?.reason);
          continue;
        }
        if (eligibility?.isEligibleForRewards === true) continue;
        return candidate;
      }

      return null;
    },
    [eligibilityByAgent, notifySkipOnce, orderedIncludedAgentTypes],
  );

  const waitForDeploymentStatus = useCallback(
    async (
      serviceConfigId: ServiceConfigId,
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
          logAutoRun(logEvent, `deployment status check failed: ${error}`);
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
            logAutoRun(logEvent, `started ${agentType}`);
            return true;
          }

          logAutoRun(
            logEvent,
            `start timeout for ${agentType} (attempt ${attempt + 1})`,
          );
        } catch (error) {
          logAutoRun(logEvent, `start error for ${agentType}: ${error}`);
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
    async (serviceConfigId: ServiceConfigId) => {
      try {
        logAutoRun(logEvent, `stopping ${serviceConfigId}`);
        await ServicesService.stopDeployment(serviceConfigId);
      } catch (error) {
        logAutoRun(logEvent, `stop failed for ${serviceConfigId}: ${error}`);
      }

      return waitForDeploymentStatus(
        serviceConfigId,
        MiddlewareDeploymentStatusMap.STOPPED,
        START_TIMEOUT_SECONDS,
      );
    },
    [logEvent, waitForDeploymentStatus],
  );

  const rotateToNext = useCallback(
    async (currentAgentType: AgentType, nextAgentType: AgentType) => {
      const currentMeta = configuredAgents.find(
        (agent) => agent.agentType === currentAgentType,
      );
      if (!currentMeta) return;

      const stopOk = await stopAgent(currentMeta.serviceConfigId);
      if (!stopOk) {
        logAutoRun(
          logEvent,
          `stop timeout for ${currentAgentType}, aborting rotation`,
        );
        return;
      }

      logAutoRun(logEvent, `cooldown ${COOLDOWN_SECONDS}s`);
      await delayInSeconds(COOLDOWN_SECONDS);

      const started = await startAgentWithRetries(nextAgentType);
      if (!started) {
        const nextCandidate = findNextEligibleAgent(nextAgentType);
        if (nextCandidate) {
          await rotateToNext(nextAgentType, nextCandidate);
        }
      }
    },
    [
      configuredAgents,
      findNextEligibleAgent,
      logEvent,
      startAgentWithRetries,
      stopAgent,
    ],
  );

  /**
   * Main rotation loop: when the current agent becomes eligible for rewards,
   * attempt to rotate to the next eligible candidate.
   */
  useEffect(() => {
    if (!enabled || !hasActivated) return;
    if (isRotatingRef.current) return;

    const currentType = currentAgent || runningAgentType;
    if (!currentType) return;

    const currentEligibility = eligibilityByAgent[currentType];
    if (runningAgentType && currentEligibility?.isEligibleForRewards !== true) {
      return;
    }

    const nextAgent = findNextEligibleAgent(currentType);
    if (!nextAgent) return;

    isRotatingRef.current = true;
    rotateToNext(currentType, nextAgent)
      .catch((error) => {
        logAutoRun(logEvent, `rotation error: ${error}`);
      })
      .finally(() => {
        isRotatingRef.current = false;
      });
  }, [
    currentAgent,
    eligibilityByAgent,
    enabled,
    findNextEligibleAgent,
    hasActivated,
    logEvent,
    rotateToNext,
    runningAgentType,
  ]);

  /**
   * Manual stop: if auto-run is enabled and no agent is running,
   * try to start the next eligible agent after cooldown.
   */
  useEffect(() => {
    if (!enabled || !hasActivated) return;
    if (runningAgentType) return;
    if (isRotatingRef.current) return;

    const nextAgent = findNextEligibleAgent(currentAgent);
    if (!nextAgent) return;

    isRotatingRef.current = true;
    delayInSeconds(COOLDOWN_SECONDS)
      .then(() => startAgentWithRetries(nextAgent))
      .catch((error) =>
        logAutoRun(logEvent, `manual stop start error: ${error}`),
      )
      .finally(() => {
        isRotatingRef.current = false;
      });
  }, [
    currentAgent,
    enabled,
    findNextEligibleAgent,
    hasActivated,
    logEvent,
    runningAgentType,
    startAgentWithRetries,
  ]);

  const setEnabled = useCallback(
    (value: boolean) => {
      updateAutoRun({ enabled: value });
      logAutoRun(logEvent, `enabled set to ${value}`);
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
      logAutoRun(logEvent, `included ${agentType}`);
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
      logAutoRun(logEvent, `excluded ${agentType}`);
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
