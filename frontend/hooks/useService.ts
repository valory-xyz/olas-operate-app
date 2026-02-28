import { useCallback, useMemo } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import {
  EvmChainId,
  isActiveDeploymentStatus,
  isTransitioningDeploymentStatus,
  type MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
} from '@/constants';
import {
  AgentEoa,
  AgentSafe,
  AgentWallet,
  WALLET_OWNER,
  WALLET_TYPE,
} from '@/constants';
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
        owner: WALLET_OWNER.Agent,
        type: WALLET_TYPE.EOA,
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

  const getServiceWalletsOf = useCallback(
    (chainId: EvmChainId, configId?: string): AgentWallet[] => {
      if (!configId) return [];

      const chainName = asMiddlewareChain(chainId);
      const service = services?.find(
        (s) => s.home_chain === chainName && s.service_config_id === configId,
      );

      if (!service) return [];
      if (!service.chain_configs?.[chainName]) return [];

      const chainConfig = service.chain_configs[chainName];
      if (!chainConfig) return [];

      const agentSafe = {
        address: chainConfig.chain_data.multisig as Address,
        owner: WALLET_OWNER.Agent,
        type: WALLET_TYPE.Safe,
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
    return getServiceWalletsOf(
      asEvmChainId(selectedService.home_chain),
      selectedService.service_config_id,
    );
  }, [selectedService, getServiceWalletsOf]);

  const getAddressesOf = useCallback(
    (
      chainId: EvmChainId,
      configId?: string,
    ): Nullable<ServiceChainIdAddressRecord> => {
      if (!configId) return null;

      const chainName = asMiddlewareChain(chainId);
      const service = services?.find(
        (s) => s.home_chain === chainName && s.service_config_id === configId,
      );
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
    (chainId: EvmChainId, configId?: string): Address[] => {
      if (!configId) return [];

      if (!service) return [];
      const chainAddresses = getAddressesOf(chainId, configId);

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
    return getAgentAddressesOf(
      asEvmChainId(service.home_chain),
      service.service_config_id,
    );
  }, [getAgentAddressesOf, service]);

  const getServicesSafesOf = useCallback(
    (chainId: EvmChainId, configId?: string) =>
      getServiceWalletsOf(chainId, configId).filter(
        (wallet): wallet is AgentSafe =>
          getAgentAddressesOf(chainId, configId).includes(wallet.address) &&
          wallet.owner === WALLET_OWNER.Agent &&
          wallet.type === WALLET_TYPE.Safe,
      ),
    [getServiceWalletsOf, getAgentAddressesOf],
  );

  const serviceSafes = useMemo(() => {
    if (!serviceWallets) return [];
    return serviceWallets.filter(
      (wallet): wallet is AgentSafe =>
        agentAddresses.includes(wallet.address) &&
        wallet.owner === WALLET_OWNER.Agent &&
        wallet.type === WALLET_TYPE.Safe,
    );
  }, [agentAddresses, serviceWallets]);

  const serviceEoa = useMemo(() => {
    if (!serviceWallets) return null;
    return serviceWallets.find(
      (wallet): wallet is AgentEoa =>
        agentAddresses.includes(wallet.address) &&
        wallet.owner === WALLET_OWNER.Agent &&
        wallet.type === WALLET_TYPE.EOA,
    );
  }, [agentAddresses, serviceWallets]);

  // agent safe
  const getServiceSafeOf = useCallback(
    (chainId: EvmChainId, configId?: string) =>
      getServicesSafesOf(chainId, configId)?.find(
        (safe) => safe.evmChainId === chainId,
      ),
    [getServicesSafesOf],
  );

  const getAgentTypeOf = useCallback(
    (chainId: EvmChainId, configId: string) => {
      const service = services?.find(
        (service) =>
          service.service_config_id === configId &&
          service.home_chain === asMiddlewareChain(chainId),
      );
      if (!service) return null;
      const agent = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.servicePublicId === service.service_public_id &&
          agentConfig.middlewareHomeChainId === service.home_chain,
      );
      return agent ? agent[0] : null;
    },
    [services],
  );

  /**
   * @note statuses where middleware deployment is moving from stopped to
   * deployed, or vice versa, used for loading fallbacks
   */
  const isServiceTransitioning =
    isTransitioningDeploymentStatus(deploymentStatus);

  /** @note deployment is running, or transitioning, both assume the deployment is active */
  const isServiceRunning = isActiveDeploymentStatus(deploymentStatus);

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
    getAgentTypeOf,

    // service status
    isServiceRunning,
    isServiceActive,
    isServiceBuilding,
    serviceNftTokenId,
  };
};
