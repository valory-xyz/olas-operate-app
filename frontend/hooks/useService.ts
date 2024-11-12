import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useState } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { ServicesContext } from '@/context/ServicesProvider';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';
import { Service } from '@/types/Service';

import { usePause } from './usePause';

type ServiceAddresses = {
  master: {
    safe: Address;
    signer: Address;
  };
  agent: {
    safe: Address;
    signer: Address;
  };
};

/**
 * Hook for interacting with a single service.
 */
export const useService = (serviceId?: Service['hash']) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { paused } = usePause();

  const {
    // updateServiceStatus,
    // setIsPaused,
    isLoading,
    services,
  } = useContext(ServicesContext);
  const [status, setStatus] = useState<
    MiddlewareDeploymentStatus | undefined
  >();

  const currentService = useMemo<Service | undefined>(() => {
    if (serviceId) {
      return services?.find((service) => service.hash === serviceId);
    }

    if (!services || services.length === 0) return;
    return services[0];
  }, [serviceId, services]);

  const {
    data: deploymentStatus,
    isLoading: isDeploymentStatusLoading,
    refetch: updateServiceStatus,
  } = useQuery<MiddlewareDeploymentStatus>({
    queryKey: [REACT_QUERY_KEYS.SERVICE_STATUS],
    queryFn: async () => {
      const deployment = await ServicesService.getDeployment(
        currentService?.hash as string,
      );
      return deployment.status;
    },
    enabled: isOnline && !paused && !!currentService?.hash,
    refetchInterval: FIVE_SECONDS_INTERVAL,
  });

  // ChainIds used by the service
  const chainIdsUsed = useMemo<number[]>(() => {
    if (!currentService?.chain_configs) return [];

    return Object.keys(currentService.chain_configs).map(Number);
  }, [currentService?.chain_configs]);

  const addresses = useMemo<{
    [chainId: number]: ServiceAddresses;
  }>(() => {
    if (!currentService?.chain_configs) return {};

    return chainIdsUsed.reduce((acc, chainId) => {
      const chainConfig = currentService.chain_configs[chainId];
      const master = {
        safe: chainConfig.master.safe, // TODO: ask Josh
        signer: chainConfig.master.signer, // TODO: ask Josh
      };
      const agent = {
        safe: chainConfig.chain_data.multisig,
        signer: chainConfig.chain_data.instances?.[0],
      };

      return { ...acc, [chainId]: { master, agent } };
    }, {});
  }, [chainIdsUsed, currentService?.chain_configs]);

  // update services status
  useEffect(() => {
    if (deploymentStatus) {
      setStatus(deploymentStatus);
    }

    if (!currentService) return;

    setStatus(currentService.deploymentStatus);
  }, [deploymentStatus, currentService]);

  return {
    wallets,
    addresses,
    hasInitialLoaded: !isLoading && !!currentService,
    service: currentService,
    serviceStatus: status,
    setServiceStatus: setStatus,
    updateServiceStatus,
    isServiceStatusLoading: isLoading || isDeploymentStatusLoading,
  };
};
