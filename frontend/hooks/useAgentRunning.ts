import { useMemo } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { isActiveDeploymentStatus } from '@/constants';

import { useServices } from './useServices';

export const useAgentRunning = () => {
  const {
    services,
    selectedService,
    allDeployments,
    serviceStatusOverrides,
    getServiceConfigIdFromAgentType,
  } = useServices();

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
      return (
        isActiveDeploymentStatus(serviceStatus) ||
        isActiveDeploymentStatus(
          serviceStatusOverrides?.[service.service_config_id],
        )
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
      const overrideStatus =
        serviceStatusOverrides?.[service.service_config_id];
      const backendStatus = allDeployments[service.service_config_id]?.status;
      const status = overrideStatus ?? backendStatus;

      if (!isActiveDeploymentStatus(status)) {
        continue;
      }

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
  }, [allDeployments, services, serviceStatusOverrides]);

  const runningServiceConfigId = useMemo(() => {
    if (!runningAgentType) return null;

    return getServiceConfigIdFromAgentType(runningAgentType);
  }, [getServiceConfigIdFromAgentType, runningAgentType]);

  return { isAnotherAgentRunning, runningAgentType, runningServiceConfigId };
};
