import { useContext } from 'react';

import {
  MiddlewareServiceResponse,
  ServiceHash,
  ServiceTemplate,
} from '@/client';
import { GNOSIS_CHAIN_CONFIG } from '@/config/chains';
import { ServicesContext } from '@/context/ServicesProvider';
import { ChainId } from '@/enums/Chain';
import MulticallService from '@/service/Multicall';
import { Address } from '@/types/Address';
import { AddressBooleanRecord } from '@/types/Records';

const checkServiceIsFunded = async (
  service: MiddlewareServiceResponse,
  serviceTemplate: ServiceTemplate,
): Promise<boolean> => {
  const {
    chain_configs: {
      // TODO: remove this hardcoding
      [GNOSIS_CHAIN_CONFIG.chainId]: {
        chain_data: { instances, multisig },
      },
    },
  } = service;

  if (!instances || !multisig) return false;

  const addresses = [...instances, multisig];

  const balances = await MulticallService.getEthBalances(addresses);

  if (!balances) return false;

  const fundRequirements: AddressBooleanRecord = addresses.reduce(
    (acc: AddressBooleanRecord, address: Address) =>
      // TODO: remove this hardcoding

      Object.assign(acc, {
        [address]: instances.includes(address)
          ? balances[address] >
            serviceTemplate.configurations[GNOSIS_CHAIN_CONFIG.chainId]
              .fund_requirements.agent
          : balances[address] >
            serviceTemplate.configurations[GNOSIS_CHAIN_CONFIG.chainId]
              .fund_requirements.safe,
      }),
    {},
  );

  return Object.values(fundRequirements).every((f) => f);
};

export const useServices = () => {
  const { services, isFetched: hasInitialLoaded } = useContext(ServicesContext);

  const serviceId =
    services?.[0]?.chain_configs[ChainId.Optimism].chain_data?.token;

  // STATE METHODS
  const getServiceFromState = (
    serviceHash: ServiceHash,
  ): MiddlewareServiceResponse | undefined => {
    if (!hasInitialLoaded) return;
    if (!services) return;
    return services.find((service) => service.hash === serviceHash);
  };

  return {
    // service: services?.[0],
    services,
    serviceId,
    setServiceStatus,
    getServiceFromState,
    getServicesFromState,
    checkServiceIsFunded,
    refetchServicesState,
    updateServiceState,
    updateServiceStatus,
    hasInitialLoaded,
    setIsServicePollingPaused: setIsPaused,
  };
};
