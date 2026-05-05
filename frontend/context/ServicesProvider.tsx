import { QueryObserverBaseResult, useQuery } from '@tanstack/react-query';
import { message, MessageArgsProps } from 'antd';
import { noop } from 'lodash';
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
  AgentWallet,
  EvmChainId,
  FIFTEEN_SECONDS_INTERVAL,
  FIVE_SECONDS_INTERVAL,
  isActiveDeploymentStatus,
  MESSAGE_WIDTH,
  MiddlewareDeploymentStatus,
  PAGES,
  REACT_QUERY_KEYS,
} from '@/constants';
import {
  useElectronApi,
  usePageState,
  UsePause,
  usePause,
  useStore,
} from '@/hooks';
import { useDynamicRefetchInterval } from '@/hooks/useDynamicRefetchInterval';
import { useServiceWallets } from '@/hooks/useServiceWallets';
import { ServicesService } from '@/service/Services';
import {
  AgentConfig,
  Maybe,
  MiddlewareServiceResponse,
  Nullable,
  Optional,
  Service,
  ServiceDeployment,
  ServiceValidationResponse,
} from '@/types';
import {
  asEvmChainId,
  getServiceInstanceName,
  isNilOrEmpty,
  isServiceOfAgent,
  isValidServiceId,
  sortByCreationTime,
} from '@/utils';

import { migrateIsInitialFunded } from './migrations/isInitialFunded';
import { resolveSelectedServiceConfigId } from './migrations/serviceSelection';
import { OnlineStatusContext } from './OnlineStatusProvider';

const TECHNICAL_ISSUE: MessageArgsProps = {
  type: 'error',
  content:
    "It looks like one of your agents has encountered a technical issue and won't be able to run. You can join the Olas community on Telegram to get help resolving this.",
  key: 'service-error',
  duration: 5,
  style: { maxWidth: MESSAGE_WIDTH, margin: '0 auto' },
};

type ServicesResponse = Pick<
  QueryObserverBaseResult<MiddlewareServiceResponse[]>,
  'isLoading' | 'refetch' | 'isFetched'
>;

type ServicesContextType = {
  services?: MiddlewareServiceResponse[];
  availableServiceConfigIds: {
    configId: string;
    chainId: EvmChainId;
    tokenId: Optional<number>;
  }[];
  getServiceConfigIdsOf: (chainId: EvmChainId) => string[];
  getAgentTypeFromService: (
    serviceConfigId?: Nullable<string>,
  ) => Nullable<AgentType>;
  getServiceConfigIdFromAgentType: (agentType: AgentType) => Nullable<string>;
  getInstancesOfAgentType: (
    agentType: AgentType,
  ) => MiddlewareServiceResponse[];
  serviceWallets?: AgentWallet[];
  selectedService?: Service;
  selectedServiceConfigId: Nullable<string>;
  allDeployments?: Record<string, ServiceDeployment>;
  serviceStatusOverrides?: Record<string, Maybe<MiddlewareDeploymentStatus>>;
  isSelectedServiceDeploymentStatusLoading: boolean;
  selectedAgentConfig: AgentConfig;
  selectedAgentType: AgentType;
  selectedAgentName: Nullable<string>;
  selectedAgentNameOrFallback: string;
  deploymentDetails: ServiceDeployment | undefined;
  updateAgentType: (agentType: AgentType) => void;
  selectAgentTypeForSetup: (agentType: AgentType) => void;
  updateSelectedServiceConfigId: (serviceConfigId: string) => void;
  overrideSelectedServiceStatus: (
    status?: Maybe<MiddlewareDeploymentStatus>,
  ) => void;
} & Partial<ServicesResponse> &
  UsePause;

export const ServicesContext = createContext<ServicesContextType>({
  isFetched: false,
  paused: false,
  setPaused: noop,
  togglePaused: noop,
  isSelectedServiceDeploymentStatusLoading: true,
  selectedAgentConfig: AGENT_CONFIG[AgentMap.PredictTrader],
  selectedAgentType: AgentMap.PredictTrader,
  selectedAgentName: null,
  selectedAgentNameOrFallback: 'My agent',
  selectedServiceConfigId: null,
  deploymentDetails: undefined,
  updateAgentType: noop,
  selectAgentTypeForSetup: noop,
  updateSelectedServiceConfigId: noop,
  overrideSelectedServiceStatus: noop,
  availableServiceConfigIds: [],
  getServiceConfigIdsOf: () => [],
  getAgentTypeFromService: () => null,
  getServiceConfigIdFromAgentType: () => null,
  getInstancesOfAgentType: () => [],
});

/**
 * Polls for available services via the middleware API globally
 */
export const ServicesProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { store } = useElectronApi();
  const { paused, setPaused, togglePaused } = usePause();
  const { storeState } = useStore();
  const { pageState, isUserLoggedIn } = usePageState();
  const serviceRefetchInterval = useDynamicRefetchInterval(
    FIVE_SECONDS_INTERVAL,
  );
  const allDeploymentsFastRefetchInterval = useDynamicRefetchInterval(
    FIVE_SECONDS_INTERVAL,
  );
  const allDeploymentsSlowRefetchInterval = useDynamicRefetchInterval(
    FIFTEEN_SECONDS_INTERVAL,
  );

  // Stores temporary overrides for service statuses to avoid UI glitches.
  // Right after updating the status on the backend, initial queries
  // might return outdated or incorrect value
  const [serviceStatusOverrides, setServiceStatusOverrides] = useState<
    Record<string, Maybe<MiddlewareDeploymentStatus>>
  >({});

  // state to track the services ids message shown
  // so that it is not shown again for the same service
  const [isInvalidMessageShown, setIsInvalidMessageShown] = useState(false);

  const serviceConfigIdFromStore = storeState?.lastSelectedServiceConfigId;
  const [selectedServiceConfigId, setSelectedServiceConfigId] = useState<
    Nullable<string>
  >(serviceConfigIdFromStore || null);

  // Set when updateAgentType is called for a type with no instances yet
  // (e.g., setup flow for a new agent). Allows selectedAgentType/Config to
  // reflect the user's choice before a service exists.
  const [pendingAgentType, setPendingAgentType] =
    useState<Nullable<AgentType>>(null);

  // Sync from store on first load (store may arrive async)
  const isSelectedInstanceInitiallySyncedRef = useRef(
    !!serviceConfigIdFromStore,
  );
  /** One-time migration: selectedAgentType → selectedConfigId */
  const hasSelectedServiceMigrated = useRef(false);
  /** One-time migration: isInitialFunded boolean → per-service record */
  const hasIsInitialFundedMigratedRef = useRef(false);

  useEffect(() => {
    if (isSelectedInstanceInitiallySyncedRef.current) return;
    if (!serviceConfigIdFromStore) return;

    isSelectedInstanceInitiallySyncedRef.current = true;
    setSelectedServiceConfigId(serviceConfigIdFromStore);
  }, [serviceConfigIdFromStore]);

  const {
    data: services,
    isLoading: isServicesLoading,
    refetch,
  } = useQuery<MiddlewareServiceResponse[]>({
    queryKey: REACT_QUERY_KEYS.SERVICES_KEY,
    queryFn: ({ signal }) => ServicesService.getServices(signal),
    enabled: isOnline && !paused && isUserLoggedIn,
    refetchInterval: serviceRefetchInterval,
    refetchIntervalInBackground: true,
  });

  const {
    data: servicesValidationStatus,
    isLoading: isServicesValidationStatusLoading,
  } = useQuery<ServiceValidationResponse>({
    queryKey: REACT_QUERY_KEYS.SERVICES_VALIDATION_STATUS_KEY,
    queryFn: ({ signal }) =>
      ServicesService.getServicesValidationStatus(signal),
    enabled: isOnline && !paused && isUserLoggedIn,
    refetchInterval: FIFTEEN_SECONDS_INTERVAL,
  });

  const { data: allDeployments, isLoading: isAllDeploymentsLoading } = useQuery(
    {
      queryKey: REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY,
      queryFn: ({ signal }) => ServicesService.getAllServiceDeployments(signal),
      enabled: isOnline && !!services?.length,
      refetchInterval: (query) => {
        if (query.state.status !== 'success') return false;

        const hasActiveBackendDeployment = Object.values(
          query.state.data ?? {},
        ).some((deployment) => isActiveDeploymentStatus(deployment?.status));

        const hasActiveOverride = Object.values(serviceStatusOverrides).some(
          (status) => isActiveDeploymentStatus(status),
        );

        return hasActiveBackendDeployment || hasActiveOverride
          ? allDeploymentsFastRefetchInterval
          : allDeploymentsSlowRefetchInterval;
      },
      refetchIntervalInBackground: true,
    },
  );

  const deploymentDetails = selectedServiceConfigId
    ? allDeployments?.[selectedServiceConfigId]
    : undefined;

  const isSelectedServiceDeploymentStatusLoading = isAllDeploymentsLoading;

  const selectedService = useMemo<Service | undefined>(() => {
    if (!services) return;

    return services.find(
      (service) => service.service_config_id === selectedServiceConfigId,
    );
  }, [selectedServiceConfigId, services]);

  // If the selected service is not valid,
  // show a message to the user only in the main screen.
  useEffect(() => {
    if (isServicesValidationStatusLoading) return;
    if (!servicesValidationStatus) return;
    if (pageState !== PAGES.Main) return;
    if (isInvalidMessageShown) return;

    const isValid = Object.values(servicesValidationStatus).every((x) => !!x);
    if (isValid) return;

    message.error(TECHNICAL_ISSUE);
    setIsInvalidMessageShown(true);
  }, [
    isServicesValidationStatusLoading,
    servicesValidationStatus,
    isInvalidMessageShown,
    pageState,
  ]);

  const selectedServiceWithStatus = useMemo<Service | undefined>(() => {
    if (!selectedService) return;
    return {
      ...selectedService,
      deploymentStatus:
        serviceStatusOverrides[selectedService.service_config_id] ??
        deploymentDetails?.status,
    };
  }, [selectedService, deploymentDetails?.status, serviceStatusOverrides]);

  const serviceWallets = useServiceWallets(services, isServicesLoading);

  const overrideSelectedServiceStatus = useCallback(
    (status: Maybe<MiddlewareDeploymentStatus>) => {
      if (selectedServiceConfigId) {
        setServiceStatusOverrides((prev) => ({
          ...prev,
          [selectedServiceConfigId]: status,
        }));
      }
    },
    [selectedServiceConfigId],
  );

  /**
   * Service config IDs for all non-under-construction agents
   */
  const availableServiceConfigIds = useMemo(() => {
    if (!services) return [];
    return services
      .filter((service) => {
        const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
          isServiceOfAgent(service, config),
        );
        if (!agentEntry) return false;
        const [, config] = agentEntry;
        return !config.isUnderConstruction && !!config.isAgentEnabled;
      })
      .map(({ service_config_id, home_chain, chain_configs }) => ({
        configId: service_config_id,
        tokenId: chain_configs[home_chain].chain_data.token,
        chainId: asEvmChainId(home_chain),
      }));
  }, [services]);

  const getServiceConfigIdsOf = useCallback(
    (chainId: EvmChainId) =>
      availableServiceConfigIds
        .filter(({ chainId: serviceChainId }) => chainId === serviceChainId)
        .map(({ configId }) => configId),
    [availableServiceConfigIds],
  );

  const getAgentTypeFromService = useCallback(
    (serviceConfigId?: Nullable<string>): AgentType | null => {
      if (!serviceConfigId) return null;

      const service = services?.find(
        (service) => service.service_config_id === serviceConfigId,
      );
      if (!service) return null;

      const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
        isServiceOfAgent(service, config),
      );

      return agentEntry ? agentEntry[0] : null;
    },
    [services],
  );

  const getServiceConfigIdFromAgentType = useCallback(
    (agentType: AgentType) => {
      const serviceConfigId = availableServiceConfigIds.find(
        ({ configId }) => getAgentTypeFromService(configId) === agentType,
      )?.configId;
      return serviceConfigId ?? null;
    },
    [availableServiceConfigIds, getAgentTypeFromService],
  );

  const getInstancesOfAgentType = useCallback(
    (agentType: AgentType): MiddlewareServiceResponse[] => {
      if (!services) return [];

      const config = AGENT_CONFIG[agentType];
      if (!config) return [];

      return services
        .filter((service) => isServiceOfAgent(service, config))
        .sort(sortByCreationTime);
    },
    [services],
  );

  useEffect(() => {
    if (pageState !== PAGES.Setup && pendingAgentType) {
      setPendingAgentType(null);
    }
  }, [pageState, pendingAgentType]);

  const selectedAgentType = useMemo<AgentType>(() => {
    return (
      getAgentTypeFromService(selectedServiceConfigId) ??
      pendingAgentType ??
      AgentMap.PredictTrader
    );
  }, [selectedServiceConfigId, getAgentTypeFromService, pendingAgentType]);

  const selectedAgentConfig = useMemo(() => {
    const config: Maybe<AgentConfig> = AGENT_CONFIG[selectedAgentType];
    if (!config) {
      throw new Error(`Agent config not found for ${selectedAgentType}`);
    }
    return config;
  }, [selectedAgentType]);

  const updateSelectedServiceConfigId = useCallback(
    (serviceConfigId: string) => {
      setPendingAgentType(null);
      setSelectedServiceConfigId(serviceConfigId);
      store?.set?.('lastSelectedServiceConfigId', serviceConfigId);
      setIsInvalidMessageShown(false);
    },
    [store],
  );

  const updateAgentType = useCallback(
    (agentType: AgentType) => {
      const instances = getInstancesOfAgentType(agentType);
      if (instances.length > 0) {
        updateSelectedServiceConfigId(instances[0].service_config_id);
      }
    },
    [getInstancesOfAgentType, updateSelectedServiceConfigId],
  );

  /** Setter fn to be used when the service_config_id doesn't exist (eg: Setup flow) */
  const selectAgentTypeForSetup = useCallback((agentType: AgentType) => {
    setPendingAgentType(agentType);
    setSelectedServiceConfigId(null);
  }, []);

  // Sets the `selectedServiceConfigId` basis user's last selection.
  // Also migrates to the new store fields, in case they have the deprecated
  // `lastSelectedAgentType` field in their electron store.
  useEffect(() => {
    if (storeState === undefined) return; // Wait for store hydration
    if (isNilOrEmpty(services)) return;
    if (pendingAgentType) return;

    const result = resolveSelectedServiceConfigId({
      services,
      currentServiceConfigId: selectedServiceConfigId,
      legacyAgentType: storeState?.lastSelectedAgentType,
      hasMigrated: hasSelectedServiceMigrated.current,
    });

    if (result.migrated) {
      hasSelectedServiceMigrated.current = true;
      store?.delete?.('lastSelectedAgentType');
    }

    if (result.serviceConfigId !== selectedServiceConfigId) {
      setSelectedServiceConfigId(result.serviceConfigId);
    }

    if (result.shouldPersist && result.serviceConfigId) {
      store?.set?.('lastSelectedServiceConfigId', result.serviceConfigId);
    }
  }, [
    pendingAgentType,
    services,
    selectedServiceConfigId,
    storeState?.lastSelectedAgentType,
    store,
  ]);

  // Migrates the initial funding statuses of the services from the
  // old `isInitialFunded` data type to the new one.
  useEffect(() => {
    if (hasIsInitialFundedMigratedRef.current) return;
    if (isNilOrEmpty(services)) return;
    if (!storeState) return;

    const writes = migrateIsInitialFunded({ storeState, services });
    for (const { storeKey, value } of writes) {
      store?.set?.(storeKey, value);
    }
    hasIsInitialFundedMigratedRef.current = true;
  }, [services, storeState, store]);

  const selectedAgentNameOrFallback = useMemo(
    () =>
      getServiceInstanceName(
        selectedService,
        selectedAgentConfig.displayName,
        selectedAgentConfig.evmHomeChainId,
      ),
    [selectedService, selectedAgentConfig],
  );

  const selectedAgentName: Nullable<string> = (() => {
    if (!selectedService) return null;
    const tokenId =
      selectedService.chain_configs[selectedService.home_chain]?.chain_data
        ?.token;
    return isValidServiceId(tokenId) ? selectedAgentNameOrFallback : null;
  })();

  return (
    <ServicesContext.Provider
      value={{
        services,
        serviceWallets,
        isFetched: !isServicesLoading,
        isLoading: isServicesLoading,
        refetch,
        availableServiceConfigIds,
        getServiceConfigIdsOf,
        getAgentTypeFromService,
        getServiceConfigIdFromAgentType,
        getInstancesOfAgentType,

        // pause
        paused,
        setPaused,
        togglePaused,

        // selected service info
        selectedService: selectedServiceWithStatus,
        selectedServiceConfigId,
        isSelectedServiceDeploymentStatusLoading,
        selectedAgentConfig,
        selectedAgentType,
        selectedAgentName,
        selectedAgentNameOrFallback,

        // others
        allDeployments,
        deploymentDetails,
        serviceStatusOverrides,
        updateAgentType,
        selectAgentTypeForSetup,
        updateSelectedServiceConfigId,
        overrideSelectedServiceStatus,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
};
