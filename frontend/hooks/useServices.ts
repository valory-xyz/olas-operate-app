import { useContext } from 'react';

import {
  MiddlewareServiceResponse,
  ServiceHash,
  ServiceTemplate,
} from '@/client';
import { CHAIN_CONFIG } from '@/config/chains';
import { ServicesContext } from '@/context/ServicesProvider';
import MulticallService from '@/service/Multicall';
import { Address } from '@/types/Address';
import { AddressBooleanRecord } from '@/types/Records';

const checkServiceIsFunded = async (
  service: MiddlewareServiceResponse,
  serviceTemplate: ServiceTemplate,
): Promise<boolean> => {
  const {
    chain_configs: {
      [CHAIN_CONFIG.OPTIMISM.chainId]: {
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
      Object.assign(acc, {
        [address]: instances.includes(address)
          ? balances[address] >
            serviceTemplate.configurations[CHAIN_CONFIG.OPTIMISM.chainId]
              .fund_requirements.agent
          : balances[address] >
            serviceTemplate.configurations[CHAIN_CONFIG.OPTIMISM.chainId]
              .fund_requirements.safe,
      }),
    {},
  );

  return Object.values(fundRequirements).every((f) => f);
};

export const useServices = () => {
  const { services, isFetched: hasInitialLoaded } = useContext(ServicesContext);

  const serviceId =
    services?.[0]?.chain_configs[CHAIN_CONFIG.OPTIMISM.chainId].chain_data
      ?.token;

  // STATE METHODS
  const getServiceFromState = (
    serviceUuid: ServiceHash,
  ): MiddlewareServiceResponse | undefined => {
    if (!hasInitialLoaded) return;
    if (!services) return;
    return services.find(
      (service) => service.service_config_id === serviceUuid,
    );
  };

  return {
    // service: services?.[0],
    services,
    serviceId,
    serviceStatus,
    setServiceStatus,
    getServiceFromState,
    getServicesFromState,
    checkServiceIsFunded,
    updateServicesState,
    updateServiceState,
    updateServiceStatus,
    deleteServiceState,
    hasInitialLoaded,
    setIsServicePollingPaused: setIsPaused,
  };
};
