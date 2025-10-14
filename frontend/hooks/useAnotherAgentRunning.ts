import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FIVE_SECONDS_INTERVAL } from '@/constants';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { ServicesService } from '@/service/Services';

import { useServices } from './useServices';

export const useAnotherAgentRunning = () => {
  const { services, selectedService } = useServices();

  const { data: allDeployments } = useQuery({
    queryKey: REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY,
    queryFn: ({ signal }) => ServicesService.getAllServiceDeployments(signal),
    refetchInterval: FIVE_SECONDS_INTERVAL,
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
      return (
        deployment?.status === MiddlewareDeploymentStatusMap.DEPLOYING ||
        deployment?.status === MiddlewareDeploymentStatusMap.STOPPING
      );
    });
  }, [services, selectedService, allDeployments]);

  return isAnotherAgentRunning;
};
