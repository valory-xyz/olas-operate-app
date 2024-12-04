import { useMemo } from 'react';

import {
  MiddlewareBuildingStatuses,
  MiddlewareChain,
  MiddlewareDeploymentStatus,
  MiddlewareRunningStatuses,
  MiddlewareTransitioningStatuses,
} from '@/client';
import { EvmChainId } from '@/enums/Chain';
import {
  AgentEoa,
  AgentSafe,
  AgentWallets,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
import { Address } from '@/types/Address';
import { Service } from '@/types/Service';
import { Optional } from '@/types/Util';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { useServices } from './useServices';

type ServiceChainIdAddressRecord = {
  [evmChainId: number]: {
    agentSafe?: Address;
    agentEoas?: Address[];
  };
};

/**
 * Hook for interacting with a single service.
 */
export const useService = (serviceConfigId?: string) => {
  const { services, isFetched: isLoaded, selectedService } = useServices();
  // const queryClient = useQueryClient();
  // const { wallets } = useMasterWalletContext(); // TODO: implement

  const service = useMemo<Optional<Service>>(() => {
    if (serviceConfigId === selectedService?.service_config_id)
      return selectedService;
    return services?.find(
      (service) => service.service_config_id === serviceConfigId,
    );
  }, [selectedService, serviceConfigId, services]);

  const deploymentStatus = useMemo<Optional<MiddlewareDeploymentStatus>>(() => {
    if (!service) return undefined;
    if (service.deploymentStatus) return service.deploymentStatus;
  }, [service]);

  const serviceNftTokenId = useMemo<Optional<number>>(() => {
    return service?.chain_configs?.[service?.home_chain]?.chain_data.token;
  }, [service?.chain_configs, service?.home_chain]);

  // TODO: quick hack to fix for refactor (only predict), will make it dynamic later
  const serviceWallets: AgentWallets = useMemo(() => {
    if (!service) return [];
    if (!service.chain_configs?.[MiddlewareChain.GNOSIS]) return [];

    const chainConfig = service.chain_configs[MiddlewareChain.GNOSIS];
    if (!chainConfig) return [];

    return [
      ...(chainConfig.chain_data.instances ?? []).map(
        (address) =>
          ({
            address,
            owner: WalletOwnerType.Agent,
            type: WalletType.EOA,
          }) as AgentEoa,
      ),
      ...(chainConfig.chain_data.multisig
        ? [
            {
              address: chainConfig.chain_data.multisig,
              owner: WalletOwnerType.Agent,
              type: WalletType.Safe,
              evmChainId: EvmChainId.Gnosis,
            } as AgentSafe,
          ]
        : []),
    ];
  }, [service]);

  const addresses: ServiceChainIdAddressRecord = useMemo(() => {
    if (!service) return {};
    const chainData = service.chain_configs;

    // group multisigs by chainId
    const addressesByChainId: ServiceChainIdAddressRecord = chainData
      ? Object.keys(chainData).reduce((acc, middlewareChain) => {
          const { multisig, instances } =
            chainData[middlewareChain as keyof typeof chainData].chain_data;

          const evmChainId = asEvmChainId(middlewareChain);

          return {
            ...acc,
            [evmChainId]: {
              agentSafe: multisig,
              agentEoas: instances,
            },
          };
        }, {})
      : {};

    return addressesByChainId;
  }, [service]);

  const flatAddresses = useMemo(() => {
    return Object.values(addresses).reduce((acc, { agentSafe, agentEoas }) => {
      if (agentSafe) acc.push(agentSafe);
      if (agentEoas) acc.push(...agentEoas);
      return acc;
    }, [] as Address[]);
  }, [addresses]);

  const serviceSafes = useMemo(() => {
    return (
      serviceWallets?.filter(
        (wallet): wallet is AgentSafe =>
          flatAddresses.includes(wallet.address) &&
          wallet.owner === WalletOwnerType.Agent &&
          wallet.type === WalletType.Safe,
      ) ?? []
    );
  }, [flatAddresses, serviceWallets]);

  const serviceEoa = useMemo(() => {
    return (
      serviceWallets?.find(
        (wallet): wallet is AgentEoa =>
          flatAddresses.includes(wallet.address) &&
          wallet.owner === WalletOwnerType.Agent &&
          wallet.type === WalletType.EOA,
      ) ?? null
    );
  }, [flatAddresses, serviceWallets]);

  /**
   * Overrides the deployment status of the service in the cache.
   * @note Overwrite is only temporary if ServicesContext is polling
   */
  // const setDeploymentStatus = (
  //   deploymentStatus?: MiddlewareDeploymentStatus,
  // ) => {
  //   // if (!serviceConfigId) throw new Error('Service config ID is required');
  //   // if (!deploymentStatus) throw new Error('Deployment status is required');

  //   queryClient.setQueryData(
  //     REACT_QUERY_KEYS.SERVICE_DEPLOYMENT_STATUS_KEY(serviceConfigId),
  //     deploymentStatus,
  //   );
  // };

  // const deploymentStatus = serviceConfigId
  //   ? queryClient.getQueryData<MiddlewareDeploymentStatus | undefined>(
  //       REACT_QUERY_KEYS.SERVICE_DEPLOYMENT_STATUS_KEY(serviceConfigId),
  //     )
  //   : undefined;

  /** @note deployment is transitioning from stopped to deployed (and vice versa) */
  const isServiceTransitioning = deploymentStatus
    ? MiddlewareTransitioningStatuses.includes(deploymentStatus)
    : false;

  /** @note deployment is running, or transitioning, both assume the deployment is active */
  const isServiceRunning = deploymentStatus
    ? MiddlewareRunningStatuses.includes(deploymentStatus)
    : false;

  /** @note new deployment being created/built */
  const isServiceBuilding = deploymentStatus
    ? MiddlewareBuildingStatuses.includes(deploymentStatus)
    : false;

  return {
    service,
    serviceNftTokenId,
    addresses,
    flatAddresses,
    isLoaded,
    deploymentStatus,
    serviceSafes,
    serviceEoa,
    isServiceTransitioning,
    isServiceRunning,
    isServiceBuilding,
  };
};
