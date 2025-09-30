import { useCallback, useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { EvmChainId } from '@/constants';
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
import { asEvmChainId, asMiddlewareChain } from '@/utils/middlewareHelpers';

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
  [evmChainId in EvmChainId]?: {
    agentSafe?: Address;
    agentEoas?: Address[];
  };
};

const getAgentEoas = (addresses?: Address[]) => {
  if (!addresses || addresses.length === 0) return [];

  return addresses.map(
    (address) =>
      ({
        address,
        owner: WalletOwnerType.Agent,
        type: WalletType.EOA,
      }) satisfies AgentEoa,
  );
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

  const serviceWalletsOf = useCallback(
    (chainId: EvmChainId): AgentWallet[] => {
      const chainName = asMiddlewareChain(chainId);
      const service = services?.find((s) => s.home_chain === chainName);

      if (!service) return [];
      if (!service.chain_configs?.[chainName]) return [];

      const chainConfig = service.chain_configs[chainName];
      if (!chainConfig) return [];

      const agentSafe = {
        address: chainConfig.chain_data.multisig as Address,
        owner: WalletOwnerType.Agent,
        type: WalletType.Safe,
        evmChainId: chainId,
      } satisfies AgentSafe;

      return [
        ...getAgentEoas(chainConfig.chain_data.instances),
        ...(chainConfig.chain_data.multisig ? [agentSafe] : []),
      ];
    },
    [services],
  );

  const serviceWallets: AgentWallet[] = useMemo(() => {
    if (!selectedService?.home_chain) return [];
    return serviceWalletsOf(asEvmChainId(selectedService.home_chain));
  }, [selectedService, serviceWalletsOf]);

  const addressesOf = useCallback(
    (chainId: EvmChainId): Nullable<ServiceChainIdAddressRecord> => {
      const service = services?.find(
        ({ home_chain }) => home_chain === asMiddlewareChain(chainId),
      );
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
      ) satisfies ServiceChainIdAddressRecord;

      return addressesByChainId;
    },
    [services],
  );

  const addresses: Nullable<ServiceChainIdAddressRecord> = useMemo(() => {
    if (!selectedService?.home_chain) return null;
    return addressesOf(asEvmChainId(selectedService?.home_chain));
  }, [selectedService?.home_chain, addressesOf]);

  /**
   * Flat list of all addresses associated with the service.
   * ie, all agentSafe and agentEoas
   */
  const allAgentAddressesOf = useCallback(
    (chainId: EvmChainId): Address[] => {
      if (!service) return [];
      const chainAddresses = addressesOf(chainId);
      if (!chainAddresses) return [];

      return Object.values(chainAddresses).reduce(
        (acc, { agentSafe, agentEoas }) => {
          if (agentSafe) acc.push(agentSafe);
          if (agentEoas) acc.push(...agentEoas);
          return acc;
        },
        [] as Address[],
      );
    },
    [service, addressesOf],
  );

  const allAgentAddresses = useMemo(() => {
    if (!service?.home_chain) return [];
    return allAgentAddressesOf(asEvmChainId(service.home_chain));
  }, [allAgentAddressesOf, service]);

  const servicesSafesOf = useCallback(
    (chainId: EvmChainId) =>
      serviceWalletsOf(chainId).filter(
        (wallet): wallet is AgentSafe =>
          allAgentAddressesOf(chainId).includes(wallet.address) &&
          wallet.owner === WalletOwnerType.Agent &&
          wallet.type === WalletType.Safe,
      ),
    [serviceWalletsOf, allAgentAddressesOf],
  );

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

  // agent safe
  const serviceSafeOf = useCallback(
    (chainId: EvmChainId) =>
      servicesSafesOf(chainId)?.find((safe) => safe.evmChainId === chainId),
    [servicesSafesOf],
  );

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
    serviceSafeOf,
  };
};
