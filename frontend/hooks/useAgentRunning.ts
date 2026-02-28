import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import {
  FIVE_SECONDS_INTERVAL,
  MiddlewareDeploymentStatus,
  MiddlewareDeploymentStatusMap,
  REACT_QUERY_KEYS,
} from '@/constants';
import { ServicesService } from '@/service/Services';

import { useServices } from './useServices';

const ACTIVE_STATUSES: MiddlewareDeploymentStatus[] = [
  MiddlewareDeploymentStatusMap.DEPLOYED,
  MiddlewareDeploymentStatusMap.DEPLOYING,
  MiddlewareDeploymentStatusMap.STOPPING,
];

export const useAgentRunning = () => {
  const {
    services,
    selectedService,
    serviceStatusOverrides,
    getServiceConfigIdFromAgentType,
  } = useServices();

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
      return ACTIVE_STATUSES.some(
        (status) =>
          status === serviceStatus ||
          status === serviceStatusOverrides?.[service.service_config_id],
      );
    });
  }, [services, selectedService, allDeployments, serviceStatusOverrides]);

  /**
   * Determine which agent type is currently active
   * (deployed, deploying, or stopping).
   */
  const runningAgentType = useMemo(() => {
    if (!allDeployments || !services) return null;

    for (const service of services) {
      const status = allDeployments[service.service_config_id]?.status;
      if (status === undefined || !ACTIVE_STATUSES.includes(status)) continue;

      const agentEntry = ACTIVE_AGENTS.find(
        ([, agentConfig]) =>
          agentConfig.servicePublicId === service.service_public_id &&
          agentConfig.middlewareHomeChainId === service.home_chain,
      );

      if (agentEntry) {
        return agentEntry[0];
      }
    }

    return null;
  }, [allDeployments, services]);

  const runningServiceConfigId = useMemo(() => {
    if (!runningAgentType) return null;

    return getServiceConfigIdFromAgentType(runningAgentType);
  }, [getServiceConfigIdFromAgentType, runningAgentType]);

  return { isAnotherAgentRunning, runningAgentType, runningServiceConfigId };
};
