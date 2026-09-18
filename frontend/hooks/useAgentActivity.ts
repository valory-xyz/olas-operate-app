import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';

import { useServices } from './useServices';

export const useAgentActivity = () => {
  const { selectedService, deploymentDetails } = useServices();

  // The deployment status is the middleware's record of the last transition it
  // performed, not a probe of the agent process: an agent that exited (e.g.
  // because its service was evicted on-chain) leaves the service DEPLOYED and
  // `healthcheck.rounds` frozen at the round it died in. Liveness is what tells
  // the two apart. Absent liveness means an older middleware — unknown, not
  // dead — so it keeps today's behaviour.
  const isAgentAlive = deploymentDetails?.agent_liveness?.is_alive !== false;

  const isServiceRunning =
    selectedService?.deploymentStatus ===
      MiddlewareDeploymentStatusMap.DEPLOYED && isAgentAlive;

  const isServiceDeploying =
    selectedService?.deploymentStatus ===
    MiddlewareDeploymentStatusMap.DEPLOYING;

  return { deploymentDetails, isServiceRunning, isServiceDeploying };
};
