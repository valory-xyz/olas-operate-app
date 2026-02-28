import { QueryObserverBaseResult, useQuery } from '@tanstack/react-query';
import { message, MessageArgsProps } from 'antd';
import { noop, values } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ACTIVE_AGENTS, AGENT_CONFIG } from '@/config/agents';
import {
  AgentEoa,
  AgentMap,
  AgentSafe,
  AgentType,
  AgentWallet,
  EvmChainId,
  FIFTEEN_SECONDS_INTERVAL,
  FIVE_SECONDS_INTERVAL,
  isTransitioningDeploymentStatus,
  MESSAGE_WIDTH,
  MiddlewareChain,
  MiddlewareDeploymentStatus,
  PAGES,
  REACT_QUERY_KEYS,
  WALLET_OWNER,
  WALLET_TYPE,
} from '@/constants';
import {
  useElectronApi,
  usePageState,
  UsePause,
  usePause,
  useStore,
} from '@/hooks';
import { useDynamicRefetchInterval } from '@/hooks/useDynamicRefetchInterval';
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
  generateAgentName,
  isNilOrEmpty,
  isValidServiceId,
} from '@/utils';

import { OnlineStatusContext } from './OnlineStatusProvider';

const TECHNICAL_ISSUE: MessageArgsProps = {
  type: 'error',
  content:
    "It looks like one of your agents has encountered a technical issue and won't be able to run. You can open a Discord ticket and connect with the community to resolve this.",
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
  getAgentTypeFromService: (serviceConfigId?: string) => Nullable<AgentType>;
  getServiceConfigIdFromAgentType: (agentType: AgentType) => Nullable<string>;
  serviceWallets?: AgentWallet[];
  selectedService?: Service;
  serviceStatusOverrides?: Record<string, Maybe<MiddlewareDeploymentStatus>>;
  isSelectedServiceDeploymentStatusLoading: boolean;
  selectedAgentConfig: AgentConfig;
  selectedAgentType: AgentType;
  selectedAgentName: Nullable<string>;
  selectedAgentNameOrFallback: string;
  deploymentDetails: ServiceDeployment | undefined;
  updateAgentType: (agentType: AgentType) => void;
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
  deploymentDetails: undefined,
  updateAgentType: noop,
  overrideSelectedServiceStatus: noop,
  availableServiceConfigIds: [],
  getServiceConfigIdsOf: () => [],
  getAgentTypeFromService: () => null,
  getServiceConfigIdFromAgentType: () => null,
});

/**
 * Polls for available services via the middleware API globally
 */
export const ServicesProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { store } = useElectronApi();
  const { paused, setPaused, togglePaused } = usePause();
  const { storeState } = useStore();
  const { pageState } = usePageState();
  const serviceRefetchInterval = useDynamicRefetchInterval(
    FIVE_SECONDS_INTERVAL,
  );
  const selectedDeploymentFastRefetchInterval = useDynamicRefetchInterval(
    FIVE_SECONDS_INTERVAL,
  );
  const selectedDeploymentSlowRefetchInterval = useDynamicRefetchInterval(
    FIFTEEN_SECONDS_INTERVAL,
  );

  // state to track the services ids message shown
  // so that it is not shown again for the same service
  const [isInvalidMessageShown, setIsInvalidMessageShown] = useState(false);
  const agentTypeFromStore = storeState?.lastSelectedAgentType;

  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>(
    agentTypeFromStore || AgentMap.PredictTrader,
  );

  useEffect(() => {
    // Sync the state when store changes
    if (agentTypeFromStore && agentTypeFromStore !== selectedAgentType) {
      setSelectedAgentType(agentTypeFromStore);
    }
  }, [agentTypeFromStore, selectedAgentType]);

  const updateAgentType = useCallback(
    (agentType: AgentType) => {
      // Only set new value to the store, the state will be updated in useEffect
      store?.set?.('lastSelectedAgentType', agentType);
      setIsInvalidMessageShown(false);
    },
    [store],
  );

  // user selected service identifier
  const [selectedServiceConfigId, setSelectedServiceConfigId] =
    useState<Nullable<string>>(null);

  const {
    data: services,
    isLoading: isServicesLoading,
    refetch,
  } = useQuery<MiddlewareServiceResponse[]>({
    queryKey: REACT_QUERY_KEYS.SERVICES_KEY,
    queryFn: ({ signal }) => ServicesService.getServices(signal),
    enabled: isOnline && !paused,
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
    enabled: isOnline && !paused,
    refetchInterval: FIFTEEN_SECONDS_INTERVAL,
  });

  const {
    data: deploymentDetails,
    isLoading: isSelectedServiceDeploymentStatusLoading,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.SERVICE_DEPLOYMENT_STATUS_KEY(
      selectedServiceConfigId,
    ),
    queryFn: ({ signal }) =>
      ServicesService.getDeployment({
        serviceConfigId: selectedServiceConfigId!,
        signal,
      }),
    enabled: isOnline && !!selectedServiceConfigId,
    refetchInterval: (query) => {
      if (query.state.status !== 'success') return false;

      const status = query.state.data?.status;
      if (isTransitioningDeploymentStatus(status)) {
        return selectedDeploymentFastRefetchInterval;
      }

      return selectedDeploymentSlowRefetchInterval;
    },
    refetchIntervalInBackground: true,
  });

  // Stores temporary overrides for service statuses to avoid UI glitches.
  // Right after updating the status on the backend, initial queries
  // might return outdated or incorrect value
  const [serviceStatusOverrides, setServiceStatusOverrides] = useState<
    Record<string, Maybe<MiddlewareDeploymentStatus>>
  >({});

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

  const selectedAgentConfig = useMemo(() => {
    const config: Maybe<AgentConfig> = AGENT_CONFIG[selectedAgentType];

    if (!config) {
      throw new Error(`Agent config not found for ${selectedAgentType}`);
    }
    return config;
  }, [selectedAgentType]);

  const serviceWallets: Optional<AgentWallet[]> = useMemo(() => {
    if (isServicesLoading) return;
    if (isNilOrEmpty(services)) return [];

    return services.reduce<AgentWallet[]>(
      (acc, service: MiddlewareServiceResponse) => {
        return [
          ...acc,
          ...Object.keys(service.chain_configs).reduce(
            (acc: AgentWallet[], middlewareChain: string) => {
              const chainConfig =
                service.chain_configs[middlewareChain as MiddlewareChain];

              if (!chainConfig) return acc;

              const instances = chainConfig.chain_data.instances;
              const multisig = chainConfig.chain_data.multisig;

              if (instances) {
                acc.push(
                  ...instances.map(
                    (instance: string) =>
                      ({
                        address: instance,
                        type: WALLET_TYPE.EOA,
                        owner: WALLET_OWNER.Agent,
                      }) as AgentEoa,
                  ),
                );
              }

              if (multisig) {
                acc.push({
                  address: multisig,
                  type: WALLET_TYPE.Safe,
                  owner: WALLET_OWNER.Agent,
                  evmChainId: asEvmChainId(middlewareChain),
                } as AgentSafe);
              }

              return acc;
            },
            [],
          ),
        ];
      },
      [],
    );
  }, [isServicesLoading, services]);

  /**
   * Select the first service by default
   */
  useEffect(() => {
    if (!selectedAgentConfig) return;
    if (isNilOrEmpty(services)) return;

    const currentService = services.find(
      ({ service_public_id, home_chain }) =>
        service_public_id === selectedAgentConfig.servicePublicId &&
        home_chain === selectedAgentConfig.middlewareHomeChainId,
    );
    if (!currentService) {
      setSelectedServiceConfigId(null);
      return;
    }

    setSelectedServiceConfigId(currentService.service_config_id);
  }, [selectedServiceConfigId, services, selectedAgentConfig]);

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
      .filter(({ service_public_id, home_chain }) => {
        const currentAgent = values(AGENT_CONFIG).find(
          ({ servicePublicId, evmHomeChainId }) =>
            servicePublicId === service_public_id &&
            evmHomeChainId === asEvmChainId(home_chain),
        );
        return (
          !currentAgent?.isUnderConstruction && !!currentAgent?.isAgentEnabled
        );
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

  const getAgentTypeFromService = (
    serviceConfigId?: string,
  ): AgentType | null => {
    if (!serviceConfigId) return null;

    const service = services?.find(
      (service) => service.service_config_id === serviceConfigId,
    );
    if (!service) return null;

    const agentEntry = ACTIVE_AGENTS.find(
      ([, config]) => config.servicePublicId === service.service_public_id,
    );

    return agentEntry ? agentEntry[0] : null;
  };

  const getServiceConfigIdFromAgentType = (agentType: AgentType) => {
    const serviceConfigId = availableServiceConfigIds.find(
      ({ configId }) => getAgentTypeFromService(configId) === agentType,
    )?.configId;
    return serviceConfigId ?? null;
  };

  // Agent name generated based on the tokenId and chain of the selected service
  const selectedAgentName = useMemo(() => {
    const tokenId =
      selectedService?.chain_configs[selectedService.home_chain].chain_data
        .token;
    const chainId = selectedAgentConfig?.evmHomeChainId;
    if (!chainId || !isValidServiceId(tokenId)) return null;
    return generateAgentName(chainId, tokenId);
  }, [
    selectedAgentConfig?.evmHomeChainId,
    selectedService?.chain_configs,
    selectedService?.home_chain,
  ]);

  const selectedAgentNameOrFallback =
    selectedAgentName ?? `My ${selectedAgentConfig.displayName}`;

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

        // pause
        paused,
        setPaused,
        togglePaused,

        // selected service info
        selectedService: selectedServiceWithStatus,
        isSelectedServiceDeploymentStatusLoading,
        selectedAgentConfig,
        selectedAgentType,
        selectedAgentName,
        selectedAgentNameOrFallback,

        // others
        deploymentDetails,
        serviceStatusOverrides,
        updateAgentType,
        overrideSelectedServiceStatus,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
};
