import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { ChainId } from '@/enums/Chain';
import {
  AgentEoa,
  AgentSafe,
  AgentWallets,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
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
  // const { wallets } = useMasterWalletContext();

  const service = useMemo(() => {
    return services?.find(
      (service) => service.service_config_id === serviceConfigId,
    );
  }, [serviceConfigId, services]);

  // TODO: quick hack to fix for refactor (only predict), will make it dynamic later
  const serviceWallets: AgentWallets = useMemo(() => {
    if (!service?.chain_configs[ChainId.Gnosis]) return [];

    const chainConfig = service?.chain_configs[ChainId.Gnosis];

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
              chainId: ChainId.Gnosis,
            } as AgentSafe,
          ]
        : []),
    ];
  }, [service]);

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
    flatAddresses,
    isLoaded,
    deploymentStatus,
    setDeploymentStatus,
    serviceSafes,
    serviceEoa,
  };
};
