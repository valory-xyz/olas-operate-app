import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  FIVE_SECONDS_INTERVAL,
  MiddlewareDeploymentStatusMap,
  REACT_QUERY_KEYS,
} from '@/constants';
import { ServicesService } from '@/service/Services';

import { useServices } from './useServices';

export const useAnotherAgentRunning = () => {
  const { services, selectedService, serviceStatusOverrides } = useServices();

  const { data: allDeployments } = useQuery({
    queryKey: REACT_QUERY_KEYS.ALL_SERVICE_DEPLOYMENTS_KEY,
    queryFn: ({ signal }) => ServicesService.getAllServiceDeployments(signal),
    refetchInterval: (query) => {
      return query?.state?.status === 'success' ? FIVE_SECONDS_INTERVAL : false;
    },
  });

  const isAnotherAgentRunning = useMemo(() => {
    if (!services || !selectedService || !allDeployments) return false;

    // Get all other services (excluding the currently selected one)
    return services.some((service) => {
      if (service.service_config_id === selectedService.service_config_id) {
        return false;
      }

      const deployment = allDeployments[service.service_config_id];
      const serviceStatus = deployment?.status;

      // Check if either the backend status or the override status
      // indicates an active or in-progress. Overrides might represent
      // the intended status while the real one is transitioning.
      return [
        MiddlewareDeploymentStatusMap.DEPLOYED,
        MiddlewareDeploymentStatusMap.DEPLOYING,
        MiddlewareDeploymentStatusMap.STOPPING,
      ].some(
        (status) =>
          status === serviceStatus ||
          status === serviceStatusOverrides?.[service.service_config_id],
      );
    });
  }, [services, selectedService, allDeployments, serviceStatusOverrides]);

  return isAnotherAgentRunning;
};
