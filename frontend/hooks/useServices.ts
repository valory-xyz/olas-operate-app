import { useContext } from 'react';

import { Service, ServiceHash, ServiceTemplate } from '@/client';
import { ServicesContext } from '@/context/ServicesProvider';
import MulticallService from '@/service/Multicall';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';
import { AddressBooleanRecord } from '@/types/Records';

const checkServiceIsFunded = async (
  service: Service,
  serviceTemplate: ServiceTemplate,
): Promise<boolean> => {
  const {
    chain_data: { instances, multisig },
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
            serviceTemplate.configuration.fund_requirements.agent
          : balances[address] >
            serviceTemplate.configuration.fund_requirements.safe,
      }),
    {},
  );

  return Object.values(fundRequirements).every((f) => f);
};

export const useServices = () => {
  const {
    services,
    updateServicesState,
    hasInitialLoaded,
    setServices,
    serviceStatus,
    setServiceStatus,
    updateServiceStatus,
    setIsPaused,
  } = useContext(ServicesContext);

  // STATE METHODS
  const getServiceFromState = (
    serviceHash: ServiceHash,
  ): Service | undefined => {
    if (!hasInitialLoaded) return;
    if (!services) return;
    return services.find((service) => service.hash === serviceHash);
  };

  const getServicesFromState = (): Service[] | undefined =>
    hasInitialLoaded ? services : [];

  const updateServiceState = (serviceHash: ServiceHash) => {
    ServicesService.getService(serviceHash).then((service: Service) => {
      setServices((prev) => {
        if (!prev) return [service];

        const index = prev.findIndex((s) => s.hash === serviceHash); // findIndex returns -1 if not found
        if (index === -1) return [...prev, service];

        const newServices = [...prev];
        newServices[index] = service;
        return newServices;
      });
    });
  };

  const deleteServiceState = (serviceHash: ServiceHash) =>
    setServices((prev) => prev?.filter((s) => s.hash !== serviceHash));

  return {
    service: services?.[0],
    services,
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
