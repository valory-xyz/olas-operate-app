import { QueryObserverBaseResult, useQuery } from '@tanstack/react-query';
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
} from '@/client';
import { AGENT_CONFIG } from '@/config/agents';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { AgentType } from '@/enums/Agent';
import {
  AgentEoa,
  AgentSafe,
  AgentWallets,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
import { useElectronApi } from '@/hooks/useElectronApi';
import { UsePause, usePause } from '@/hooks/usePause';
import { useStore } from '@/hooks/useStore';
import { ServicesService } from '@/service/Services';
import { AgentConfig } from '@/types/Agent';
import { Service } from '@/types/Service';
import { Maybe, Nullable, Optional } from '@/types/Util';
import { isNilOrEmpty } from '@/utils/lodashExtensions';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { OnlineStatusContext } from './OnlineStatusProvider';

type ServicesResponse = Pick<
  QueryObserverBaseResult<MiddlewareServiceResponse[]>,
  'isLoading' | 'refetch' | 'isFetched'
>;

type ServicesContextType = {
  services?: MiddlewareServiceResponse[];
  serviceWallets?: AgentWallets;
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
  const { paused, setPaused, togglePaused } = usePause();
  const { storeState } = useStore();

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
    queryFn: ServicesService.getServices,
    enabled: isOnline && !paused,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  const {
    data: deploymentDetails,
    isLoading: isSelectedServiceDeploymentStatusLoading,
  } = useQuery({
    queryKey: REACT_QUERY_KEYS.SERVICE_DEPLOYMENT_STATUS_KEY(
      selectedServiceConfigId,
    ),
    queryFn: () =>
      ServicesService.getDeployment(selectedServiceConfigId as string),
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

  const updateAgentType = useCallback(
    (agentType: AgentType) => {
      store?.set?.('lastSelectedAgentType', agentType);
    },
    [store],
  );

  const selectedAgentConfig = useMemo(() => {
    const config: Maybe<AgentConfig> = AGENT_CONFIG[selectedAgentType];

    if (!config) {
      throw new Error(`Agent config not found for ${selectedAgentType}`);
    }
    return config;
  }, [selectedAgentType]);

  const serviceWallets: Optional<AgentWallets> = useMemo(() => {
    if (isServicesLoading) return;
    if (isNilOrEmpty(services)) return [];

    return services.reduce<AgentWallets>(
      (acc, service: MiddlewareServiceResponse) => {
        return [
          ...acc,
          ...Object.keys(service.chain_configs).reduce(
            (acc: AgentWallets, middlewareChain: string) => {
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

  /**
   * Select the first service by default
   */
  useEffect(() => {
    if (!selectedAgentConfig) return;
    if (isSelectedServiceDeploymentStatusLoading) return;
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
  }, [
    isSelectedServiceDeploymentStatusLoading,
    selectedServiceConfigId,
    services,
    selectedAgentConfig,
  ]);

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
