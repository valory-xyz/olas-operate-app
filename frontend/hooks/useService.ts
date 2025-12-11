import { useCallback, useMemo } from 'react';

import {
  EvmChainId,
  type MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '@/constants';
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

  // TODO: update this logic to support multiple agents per chain
  const getServiceWalletsOf = useCallback(
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
    return getServiceWalletsOf(asEvmChainId(selectedService.home_chain));
  }, [selectedService, getServiceWalletsOf]);

  const getAddressesOf = useCallback(
    (chainId: EvmChainId): Nullable<ServiceChainIdAddressRecord> => {
      const chainName = asMiddlewareChain(chainId);
      const service = services?.find((s) => s.home_chain === chainName);
      const chainData = service?.chain_configs;

      if (!chainData) return null;

      // group multisigs by chainId
      return Object.keys(chainData).reduce((acc, middlewareChain) => {
        const { multisig, instances } =
          chainData[middlewareChain as keyof typeof chainData].chain_data;
        const evmChainId = asEvmChainId(middlewareChain);
        return {
          ...acc,
          [evmChainId]: { agentSafe: multisig, agentEoas: instances },
        };
      }, {}) satisfies ServiceChainIdAddressRecord;
    },
    [services],
  );

  /**
   * Flat list of all addresses associated with the service.
   * ie, all agentSafe and agentEoas
   */
  const getAgentAddressesOf = useCallback(
    (chainId: EvmChainId): Address[] => {
      if (!service) return [];
      const chainAddresses = getAddressesOf(chainId);

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
    [service, getAddressesOf],
  );

  const agentAddresses = useMemo(() => {
    if (!service?.home_chain) return [];
    return getAgentAddressesOf(asEvmChainId(service.home_chain));
  }, [getAgentAddressesOf, service]);

  const getServicesSafesOf = useCallback(
    (chainId: EvmChainId) =>
      getServiceWalletsOf(chainId).filter(
        (wallet): wallet is AgentSafe =>
          getAgentAddressesOf(chainId).includes(wallet.address) &&
          wallet.owner === WalletOwnerType.Agent &&
          wallet.type === WalletType.Safe,
      ),
    [getServiceWalletsOf, getAgentAddressesOf],
  );

  const serviceSafes = useMemo(() => {
    if (!serviceWallets) return [];
    return serviceWallets.filter(
      (wallet): wallet is AgentSafe =>
        agentAddresses.includes(wallet.address) &&
        wallet.owner === WalletOwnerType.Agent &&
        wallet.type === WalletType.Safe,
    );
  }, [agentAddresses, serviceWallets]);

  const serviceEoa = useMemo(() => {
    if (!serviceWallets) return null;
    return serviceWallets.find(
      (wallet): wallet is AgentEoa =>
        agentAddresses.includes(wallet.address) &&
        wallet.owner === WalletOwnerType.Agent &&
        wallet.type === WalletType.EOA,
    );
  }, [agentAddresses, serviceWallets]);

  // agent safe
  const getServiceSafeOf = useCallback(
    (chainId: EvmChainId) =>
      getServicesSafesOf(chainId)?.find((safe) => safe.evmChainId === chainId),
    [getServicesSafesOf],
  );

  /**
   * @note statuses where middleware deployment is moving from stopped to
   * deployed, or vice versa, used for loading fallbacks
   */
  const isServiceTransitioning =
    deploymentStatus === MiddlewareDeploymentStatusMap.DEPLOYING ||
    deploymentStatus === MiddlewareDeploymentStatusMap.STOPPING;

  /** @note deployment is running, or transitioning, both assume the deployment is active */
  const isServiceRunning =
    deploymentStatus === MiddlewareDeploymentStatusMap.DEPLOYING ||
    deploymentStatus === MiddlewareDeploymentStatusMap.STOPPING ||
    deploymentStatus === MiddlewareDeploymentStatusMap.DEPLOYED;

  /** @note deployment is running and agent is active */
  const isServiceActive =
    deploymentStatus === MiddlewareDeploymentStatusMap.DEPLOYED;

  /** @note statuses where middleware is in the process of building/creating a new deployment */
  const isServiceBuilding =
    deploymentStatus === MiddlewareDeploymentStatusMap.BUILT ||
    deploymentStatus === MiddlewareDeploymentStatusMap.CREATED;

  return {
    isLoaded,
    isServiceTransitioning,

    agentAddresses,
    deploymentStatus,
    serviceWallets,
    serviceSafes,
    serviceEoa,
    service,
    getServiceSafeOf,

    // service status
    isServiceRunning,
    isServiceActive,
    isServiceBuilding,
    serviceNftTokenId,
  };
};
