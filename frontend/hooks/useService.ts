import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { Address } from '@/types/Address';

import { useServices } from './useServices';

type ServiceChainIdAddressRecord = {
  [chainId: number]: {
    agentSafe?: Address;
    agentEoas?: Address[];
  };
};

/**
 * Hook for interacting with a single service.
 */
export const useService = ({
  serviceConfigId = '',
}: {
  serviceConfigId?: string;
}) => {
  const { services, isFetched: isLoaded } = useServices();
  const queryClient = useQueryClient();

  const service = useMemo(() => {
    return services?.find(
      (service) => service.service_config_id === serviceConfigId,
    );
  }, [serviceConfigId, services]);

  const addresses: ServiceChainIdAddressRecord = useMemo(() => {
    if (!service) return {};
    const chainData = service.chain_configs;

    // group multisigs by chainId
    const addressesByChainId: ServiceChainIdAddressRecord = Object.keys(
      chainData,
    ).reduce((acc, chainIdKey) => {
      const chainId = +chainIdKey;

      const chain = chainData[chainId];
      if (!chain) return acc;

      const { multisig, instances } = chain.chain_data;

      return {
        ...acc,
        [chainId]: {
          agentSafe: multisig,
          agentEoas: instances,
        },
      };
    }, {});

    return addressesByChainId;
  }, [service]);

  /**
   * Overrides the deployment status of the service in the cache.
   * @note Overwrite is only temporary if ServicesContext is polling
   */
  const setDeploymentStatus = (deploymentStatus?: MiddlewareDeploymentStatus) =>
    queryClient.setQueryData(
      REACT_QUERY_KEYS.SERVICE_DEPLOYMENT_STATUS_KEY(serviceConfigId),
      deploymentStatus,
    );

  const deploymentStatus = queryClient.getQueryData<
    MiddlewareDeploymentStatus | undefined
  >(REACT_QUERY_KEYS.SERVICE_DEPLOYMENT_STATUS_KEY(serviceConfigId));

  return {
    service,
    addresses,
    isLoaded,
    deploymentStatus,
    setDeploymentStatus,
  };
};

// TODO: support multiple services
/**
 *  Hook to get service id
 */
export const useServiceId = () => {
  const {
    selectedService,
    selectedAgentConfig,
    isFetched: isLoaded,
  } = useServices();
  const { homeChainId } = selectedAgentConfig;
  const serviceConfigId =
    isLoaded && selectedService ? selectedService?.service_config_id : '';
  const { service } = useService({ serviceConfigId });
  const serviceId = service?.chain_configs[homeChainId].chain_data?.token;

  return serviceId;
};
