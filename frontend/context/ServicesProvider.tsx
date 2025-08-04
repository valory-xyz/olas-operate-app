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
  useState,
} from 'react';

import {
  Deployment,
  MiddlewareChain,
  MiddlewareDeploymentStatus,
  MiddlewareServiceResponse,
  ServiceValidationResponse,
} from '@/client';
import { AGENT_CONFIG } from '@/config/agents';
import {
  FIFTEEN_SECONDS_INTERVAL,
  FIVE_SECONDS_INTERVAL,
} from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { MESSAGE_WIDTH } from '@/constants/width';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import {
  AgentEoa,
  AgentSafe,
  AgentWallet,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
import { useElectronApi } from '@/hooks/useElectronApi';
import { usePageState } from '@/hooks/usePageState';
import { UsePause, usePause } from '@/hooks/usePause';
import { useStore } from '@/hooks/useStore';
import { ServicesService } from '@/service/Services';
import { AgentConfig } from '@/types/Agent';
import { Service } from '@/types/Service';
import { Maybe, Nullable, Optional } from '@/types/Util';
import { isNilOrEmpty } from '@/utils/lodashExtensions';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { OnlineStatusContext } from './OnlineStatusProvider';

const TECHNICAL_ISSUE: MessageArgsProps = {
  type: 'error',
  content:
    "It looks like one of your agents has encountered a technical issue and might won't be able to run. You can open a Discord ticket and connect with the community to resolve this.",
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
  serviceWallets?: AgentWallet[];
  selectedService?: Service;
  selectedServiceStatusOverride?: Maybe<MiddlewareDeploymentStatus>;
  isSelectedServiceDeploymentStatusLoading: boolean;
  selectedAgentConfig: AgentConfig;
  selectedAgentType: AgentType;
  deploymentDetails: Deployment | undefined;
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
  selectedAgentConfig: AGENT_CONFIG[AgentType.PredictTrader],
  selectedAgentType: AgentType.PredictTrader,
  deploymentDetails: undefined,
  updateAgentType: noop,
  overrideSelectedServiceStatus: noop,
});

/**
 * Polls for available services via the middleware API globally
 */
export const ServicesProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { store } = useElectronApi();
  const { storeState } = useStore();
  const { pageState } = usePageState();
  const { paused, setPaused, togglePaused } = usePause();

  // state to track the services ids message shown
  // so that it is not shown again for the same service
  const [isInvalidMessageShown, setIsInvalidMessageShown] = useState(false);
  const agentTypeFromStore = storeState?.lastSelectedAgentType;

  // set the agent type from the store on load
  const selectedAgentType = useMemo(() => {
    if (!agentTypeFromStore) return AgentType.PredictTrader;
    return agentTypeFromStore;
  }, [agentTypeFromStore]);

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
    refetchInterval: FIVE_SECONDS_INTERVAL,
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
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  const [selectedServiceStatusOverride, setSelectedServiceStatusOverride] =
    useState<Maybe<MiddlewareDeploymentStatus>>();

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
    if (pageState !== Pages.Main) return;
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
        selectedServiceStatusOverride ?? deploymentDetails?.status,
    };
  }, [
    selectedService,
    deploymentDetails?.status,
    selectedServiceStatusOverride,
  ]);

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
                        type: WalletType.EOA,
                        owner: WalletOwnerType.Agent,
                      }) as AgentEoa,
                  ),
                );
              }

              if (multisig) {
                acc.push({
                  address: multisig,
                  type: WalletType.Safe,
                  owner: WalletOwnerType.Agent,
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

  const updateAgentType = useCallback(
    (agentType: AgentType) => {
      store?.set?.('lastSelectedAgentType', agentType);
      setIsInvalidMessageShown(false);
    },
    [store],
  );

  /**
   * Select the first service by default
   */
  useEffect(() => {
    if (!selectedAgentConfig) return;
    if (isNilOrEmpty(services)) return;

    const currentService = services.find(
      ({ home_chain }) =>
        home_chain === selectedAgentConfig.middlewareHomeChainId,
    );
    if (!currentService) {
      setSelectedServiceConfigId(null);
      return;
    }

    setSelectedServiceConfigId(currentService.service_config_id);
  }, [selectedServiceConfigId, services, selectedAgentConfig]);

  return (
    <ServicesContext.Provider
      value={{
        services,
        serviceWallets,
        isFetched: !isServicesLoading,
        isLoading: isServicesLoading,
        refetch,

        // pause
        paused,
        setPaused,
        togglePaused,

        // selected service info
        selectedService: selectedServiceWithStatus,
        selectedServiceStatusOverride,
        isSelectedServiceDeploymentStatusLoading,
        selectedAgentConfig,
        selectedAgentType,

        // others
        deploymentDetails,
        updateAgentType,
        overrideSelectedServiceStatus: (
          status: Maybe<MiddlewareDeploymentStatus>,
        ) => {
          setSelectedServiceStatusOverride(status);
        },
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
};
