import { useMemo } from 'react';

import { ACTIVE_AGENTS } from '@/config/agents';
import { isActiveDeploymentStatus } from '@/constants';
import { isServiceOfAgent } from '@/utils/service';

import { useServices } from './useServices';

export const useAgentRunning = () => {
  const { services, selectedService, allDeployments, serviceStatusOverrides } =
    useServices();

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
   * Determine which service instance is currently active
   * (deployed, deploying, or stopping) and its agent type.
   */
  const { runningAgentType, runningServiceConfigId } = useMemo(() => {
    if (!allDeployments || !services)
      return { runningAgentType: null, runningServiceConfigId: null };

    for (const service of services) {
      const overrideStatus =
        serviceStatusOverrides?.[service.service_config_id];
      const backendStatus = allDeployments[service.service_config_id]?.status;
      const status = overrideStatus ?? backendStatus;

      if (!isActiveDeploymentStatus(status)) {
        continue;
      }

      const agentEntry = ACTIVE_AGENTS.find(([, config]) =>
        isServiceOfAgent(service, config),
      );

      if (agentEntry) {
        return {
          runningAgentType: agentEntry[0],
          runningServiceConfigId: service.service_config_id,
        };
      }
    }

    return { runningAgentType: null, runningServiceConfigId: null };
  }, [allDeployments, services, serviceStatusOverrides]);

  return { isAnotherAgentRunning, runningAgentType, runningServiceConfigId };
};
