import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';

import { useServices } from './useServices';

export const useAgentActivity = () => {
  const { selectedService, deploymentDetails } = useServices();
  const isServiceRunning =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYED;

  const isServiceDeploying =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYING;

  return { deploymentDetails, isServiceRunning, isServiceDeploying };
};
