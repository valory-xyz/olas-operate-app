import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useServices } from '@/hooks/useServices';

import { AgentBusyButton } from './AgentBusyButton';
import { AgentNotRunningButton } from './AgentNotRunningButton';
import { AgentRunningButton } from './AgentRunningButton';

export const AgentRunButton = () => {
  const { selectedService } = useServices();
  const selectedServiceStatus = selectedService?.deploymentStatus;

  if (selectedServiceStatus === MiddlewareDeploymentStatusMap.STOPPING) {
    return <AgentBusyButton text="Stopping" />;
  }
  if (selectedServiceStatus === MiddlewareDeploymentStatusMap.DEPLOYING) {
    return <AgentBusyButton text="Starting" />;
  }
  if (selectedServiceStatus === MiddlewareDeploymentStatusMap.DEPLOYED) {
    return <AgentRunningButton />;
  }
  return <AgentNotRunningButton />;
};
