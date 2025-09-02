import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { EvmChainId } from '@/enums/Chain';
import {
  AgentEoa,
  AgentSafe,
  AgentWallet,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
import { Address } from '@/types/Address';
import { Service } from '@/types/Service';
import { Nullable, Optional } from '@/types/Util';
import { asEvmChainId } from '@/utils/middlewareHelpers';

import { useServices } from './useServices';

/** @note statuses where middleware deployment is moving from stopped to deployed, or vice versa, used for loading fallbacks */
const MiddlewareTransitioningStatuses = [
  MiddlewareDeploymentStatus.DEPLOYING,
  MiddlewareDeploymentStatus.STOPPING,
];

/** @note statuses where middleware deployment is running */
const MiddlewareRunningStatuses = [
  MiddlewareDeploymentStatus.DEPLOYED,
  ...MiddlewareTransitioningStatuses,
];

/** @note statuses where middleware is in the process of building/creating a new deployment */
const MiddlewareBuildingStatuses = [
  MiddlewareDeploymentStatus.BUILT,
  MiddlewareDeploymentStatus.CREATED,
];

type ServiceChainIdAddressRecord = {
  [evmChainId in EvmChainId]: {
    agentSafe?: Address;
    agentEoas?: Address[];
  };
};

/**
 * Hook for interacting with a single service.
 */
export const useService = (serviceConfigId?: string) => {
  const { services, isFetched: isLoaded, selectedService } = useServices();

  const service = useMemo<Optional<Service>>(() => {
    if (serviceConfigId === selectedService?.service_config_id) {
      return selectedService;
    }

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

  const serviceWallets: AgentWallet[] = useMemo(() => {
    if (!service) return [];
    if (!selectedService?.home_chain) return [];
    if (!service.chain_configs?.[selectedService?.home_chain]) return [];

    const chainConfig = service.chain_configs[selectedService?.home_chain];
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
              evmChainId: asEvmChainId(selectedService?.home_chain),
            } as AgentSafe,
          ]
        : []),
    ];
  }, [service, selectedService]);

  const addresses: Nullable<ServiceChainIdAddressRecord> = useMemo(() => {
    const chainData = service?.chain_configs;

    if (!chainData) return null;

    // group multisigs by chainId
    const addressesByChainId = Object.keys(chainData).reduce(
      (acc, middlewareChain) => {
        const { multisig, instances } =
          chainData[middlewareChain as keyof typeof chainData].chain_data;
        const evmChainId = asEvmChainId(middlewareChain);

        return {
          ...acc,
          [evmChainId]: { agentSafe: multisig, agentEoas: instances },
        };
      },
      {},
    ) as ServiceChainIdAddressRecord;

    return addressesByChainId;
  }, [service]);

  /**
   * Flat list of all addresses associated with the service.
   * ie, all agentSafe and agentEoas
   */
  const allAgentAddresses = useMemo(() => {
    if (!service) return [];
    if (!addresses) return [];

    return Object.values(addresses).reduce((acc, { agentSafe, agentEoas }) => {
      if (agentSafe) acc.push(agentSafe);
      if (agentEoas) acc.push(...agentEoas);
      return acc;
    }, [] as Address[]);
  }, [addresses, service]);

  const serviceSafes = useMemo(() => {
    if (!serviceWallets) return [];
    return serviceWallets.filter(
      (wallet): wallet is AgentSafe =>
        allAgentAddresses.includes(wallet.address) &&
        wallet.owner === WalletOwnerType.Agent &&
        wallet.type === WalletType.Safe,
    );
  }, [allAgentAddresses, serviceWallets]);

  const serviceEoa = useMemo(() => {
    if (!serviceWallets) return null;
    return serviceWallets.find(
      (wallet): wallet is AgentEoa =>
        allAgentAddresses.includes(wallet.address) &&
        wallet.owner === WalletOwnerType.Agent &&
        wallet.type === WalletType.EOA,
    );
  }, [allAgentAddresses, serviceWallets]);

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
    isLoaded,
    isServiceTransitioning,
    isServiceRunning,
    isServiceBuilding,
    serviceNftTokenId,
    addresses,
    allAgentAddresses,
    deploymentStatus,
    serviceSafes,
    serviceEoa,
    service,
  };
};
