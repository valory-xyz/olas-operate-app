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

import { MiddlewareServiceResponse } from '@/client';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { UsePause, usePause } from '@/hooks/usePause';
import { ServicesService } from '@/service/Services';
import { Service } from '@/types/Service';

import { OnlineStatusContext } from './OnlineStatusProvider';

type ServicesContextType = {
  services?: MiddlewareServiceResponse[];
  selectService: (serviceUuid: string) => void;
  selectedService?: Service;
} & Partial<QueryObserverBaseResult<MiddlewareServiceResponse[]>> &
  UsePause;

export const ServicesContext = createContext<ServicesContextType>({
  paused: false,
  setPaused: noop,
  togglePaused: noop,
  selectService: noop,
});

/**
 * Polls for available services via the middleware API globally
 */
export const ServicesProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { paused, setPaused, togglePaused } = usePause();

  // user selected service identifier
  const [selectedServiceUuid, setSelectedServiceUuid] = useState<string>();

  const {
    data: services,
    isError,
    isFetched,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<MiddlewareServiceResponse[]>({
    queryKey: REACT_QUERY_KEYS.SERVICES,
    queryFn: ServicesService.getServices,
    enabled: isOnline && !paused,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  const selectedService = useMemo<Service | undefined>(() => {
    if (!services) return;
    return services.find(
      (service) => service.service_config_id === selectedServiceUuid,
    );
  }, [selectedServiceUuid, services]);

  const selectService = useCallback((serviceUuid: string) => {
    setSelectedServiceUuid(serviceUuid);
  }, []);

  useEffect(() => {
    if (!services) return;
    setSelectedServiceUuid(services[0]?.service_config_id);
  }, [services]);

  // const serviceAddresses = useMemo(
  //   () =>
  //     services?.reduce<Address[]>((acc, service: MiddlewareServiceResponse) => {
  //       const instances =
  //         service.chain_configs[CHAINS.OPTIMISM.chainId].chain_data.instances;
  //       if (instances) {
  //         acc.push(...instances);
  //       }

  //       const multisig =
  //         service.chain_configs[CHAINS.OPTIMISM.chainId].chain_data.multisig;
  //       if (multisig) {
  //         acc.push(multisig);
  //       }
  //       return acc;
  //     }, []),
  //   [services],
  // );

  // const updateServicesState = useCallback(
  //   async (): Promise<void> =>
  //     ServicesService.getServices()
  //       .then((data: MiddlewareServiceResponse[]) => {
  //         if (!Array.isArray(data)) return;
  //         setServices(data);
  //         setHasInitialLoaded(true);
  //       })
  //       .catch((e) => {
  //         console.error(e);
  //         // message.error(e.message); Commented out to avoid showing error message; need to handle "isAuthenticated" in a better way
  //       }),
  //   [],
  // );

  // const updateServiceStatus = useCallback(async () => {
  //   if (!services?.[0]) return;
  //   const serviceStatus = await ServicesService.getDeployment(services[0].service_config_id);
  //   setServiceStatuses(serviceStatus.status);
  // }, [services]);

  // Update service state
  // useInterval(
  //   () =>
  //     updateServicesState()
  //       .then(() => updateServiceStatus())
  //       .catch((e) => message.error(e.message)),
  //   isOnline && !isPaused ? FIVE_SECONDS_INTERVAL : null,
  // );

  return (
    <ServicesContext.Provider
      value={{
        services,
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
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
};
