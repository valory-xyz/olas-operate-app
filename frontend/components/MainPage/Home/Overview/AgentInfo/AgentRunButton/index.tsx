import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { usePrestartCheck } from '@/hooks/usePrestartCheck';
import { useServices } from '@/hooks/useServices';

import { AgentBusyButton } from './AgentBusyButton';
import { AgentNotRunningButton } from './AgentNotRunningButton';
import { AgentRunningButton } from './AgentRunningButton';

export const AgentRunButton = () => {
  const { selectedService } = useServices();
  const selectedServiceStatus = selectedService?.deploymentStatus;
  const { isChecking } = usePrestartCheck(selectedService?.service_config_id);

  if (selectedServiceStatus === MiddlewareDeploymentStatusMap.STOPPING) {
    return <AgentBusyButton text="Stopping" />;
  }
  if (selectedServiceStatus === MiddlewareDeploymentStatusMap.DEPLOYING) {
    return <AgentBusyButton text={isChecking ? 'Checking' : 'Starting'} />;
  }
  if (selectedServiceStatus === MiddlewareDeploymentStatusMap.DEPLOYED) {
    return <AgentRunningButton />;
  }
  return <AgentNotRunningButton />;
};
