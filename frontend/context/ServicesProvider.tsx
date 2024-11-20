import { QueryObserverBaseResult, useQuery } from '@tanstack/react-query';
import { isEmpty, noop } from 'lodash';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { MiddlewareServiceResponse } from '@/client';
import { AGENT_CONFIG } from '@/config/agents';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { AgentType } from '@/enums/Agent';
import { ChainId } from '@/enums/Chain';
import { AgentWallets, WalletOwnerType, WalletType } from '@/enums/Wallet';
import { UsePause, usePause } from '@/hooks/usePause';
import { ServicesService } from '@/service/Services';
import { AgentConfig } from '@/types/Agent';
import { Service } from '@/types/Service';
import { Maybe } from '@/types/Util';

import { OnlineStatusContext } from './OnlineStatusProvider';

type ServicesContextType = {
  services?: MiddlewareServiceResponse[];
  serviceAddresses?: AgentWallets;
  servicesByChain?: Record<number, MiddlewareServiceResponse[]>;
  selectService: (serviceUuid: string) => void;
  selectedService?: Service;
  selectedAgentConfig: AgentConfig;
  updateAgentType: (agentType: AgentType) => void;
} & Partial<QueryObserverBaseResult<MiddlewareServiceResponse[]>> &
  UsePause;

export const ServicesContext = createContext<ServicesContextType>({
  paused: false,
  setPaused: noop,
  togglePaused: noop,
  selectService: noop,
  selectedAgentConfig: AGENT_CONFIG[AgentType.PredictTrader],
  updateAgentType: noop,
});

/**
 * Polls for available services via the middleware API globally
 */
export const ServicesProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { paused, setPaused, togglePaused } = usePause();

  // selected agent type
  const [selectedAgentType, setAgentType] = useState<AgentType>(
    AgentType.PredictTrader,
  );

  // user selected service identifier
  const [selectedServiceConfigId, setSelectedServiceConfigId] =
    useState<string>();

  const {
    data: services,
    isError,
    isFetched,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<MiddlewareServiceResponse[]>({
    queryKey: REACT_QUERY_KEYS.SERVICES_KEY,
    queryFn: ServicesService.getServices,
    enabled: isOnline && !paused,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  const selectedService = useMemo<Service | undefined>(() => {
    if (!services) return;
    return services.find(
      (service) => service.service_config_id === selectedServiceConfigId,
    );
  }, [selectedServiceConfigId, services]);

  const selectService = useCallback((serviceUuid: string) => {
    setSelectedServiceConfigId(serviceUuid);
  }, []);

  const updateAgentType = useCallback((agentType: AgentType) => {
    setAgentType(agentType);
  }, []);

  const selectedAgentConfig = useMemo(() => {
    const config: Maybe<AgentConfig> = AGENT_CONFIG[selectedAgentType];

    if (!config) {
      throw new Error(`Agent config not found for ${selectedAgentType}`);
    }
    return config;
  }, [selectedAgentType]);

  const servicesByChain = useMemo(() => {
    if (!isFetched) return;
    if (!services) return;
    return Object.keys(ChainId).reduce(
      (
        acc: Record<number, MiddlewareServiceResponse[]>,
        chainIdKey: string,
      ) => {
        const chainIdNumber = +chainIdKey;
        acc[chainIdNumber] = services.filter(
          (service: MiddlewareServiceResponse) =>
            service.chain_configs[chainIdNumber],
        );
        return acc;
      },
      {},
    );
  }, [isFetched, services]);

  const serviceAddresses = useMemo(() => {
    if (!isFetched) return;
    if (isEmpty(services)) return [];

    return services?.reduce<AgentWallets>(
      (acc, service: MiddlewareServiceResponse) => {
        return [
          ...acc,
          ...Object.keys(service.chain_configs).reduce(
            (acc: AgentWallets, chainIdKey: string) => {
              const chainId = +chainIdKey;
              const chainConfig = service.chain_configs[chainId];
              if (!chainConfig) return acc;

              const instances = chainConfig.chain_data.instances;
              const multisig = chainConfig.chain_data.multisig;

              if (instances) {
                acc.push(
                  ...instances.map((instance: string) => ({
                    address: instance,
                    type: WalletType.EOA,
                    owner: WalletOwnerType.Agent,
                  })),
                );
              }

              if (multisig) {
                acc.push({
                  address: multisig,
                  type: WalletType.Safe,
                  owner: WalletOwnerType.Agent,
                  chainId,
                });
              }

              return acc;
            },
            [],
          ),
        ];
      },
      [],
    );
  }, [isFetched, services]);

  /**
   * Select the first service by default
   */
  useEffect(() => {
    if (!services) return;
    if (selectedServiceConfigId) return;
    // only select a service by default if services are fetched, but there has been no selection yet
    if (isFetched && services.length > 0 && !selectedServiceConfigId)
      setSelectedServiceConfigId(services[0].service_config_id);
  }, [isFetched, selectedServiceConfigId, services]);

  // const updateServiceStatus = useCallback(async () => {
  //   if (!services?.[0]) return;
  //   const serviceStatus = await ServicesService.getDeployment(services[0].service_config_id);
  //   setServiceStatuses(serviceStatus.status);
  // }, [services]);

  return (
    <ServicesContext.Provider
      value={{
        services,
        serviceAddresses,
        servicesByChain,
        isError,
        isFetched,
        isLoading,
        isFetching,
        refetch,
        paused,
        setPaused,
        togglePaused,
        selectService,
        selectedService,
        selectedAgentConfig,
        updateAgentType,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
};
