import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatusMap, REACT_QUERY_KEYS } from '@/constants';
import { ServicesService } from '@/service/Services';

import { useServices } from './useServices';

export const useAnotherAgentRunning = () => {
  const { services, selectedService } = useServices();

  const { data: allDeployments } = useQuery({
    queryKey: REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY,
    queryFn: ({ signal }) => ServicesService.getAllServiceDeployments(signal),
    refetchInterval: 5000,
  });

  const isAnotherAgentRunning = useMemo(() => {
    if (!services || !selectedService || !allDeployments) return false;

    // Get all other services (excluding the currently selected one)
    const otherServices = services.filter(
      (service) =>
        service.service_config_id !== selectedService.service_config_id,
    );

    return otherServices.some((service) => {
      const deployment = allDeployments[service.service_config_id];
      return deployment?.status === MiddlewareDeploymentStatusMap.DEPLOYED;
    });
  }, [services, selectedService, allDeployments]);

  return isAnotherAgentRunning;
};
