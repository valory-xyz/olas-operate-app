import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useServices } from '@/hooks/useServices';

import { AgentBusyButton } from './AgentBusyButton';
import { AgentNotRunningButton } from './AgentNotRunningButton';
import { AgentRunningButton } from './AgentRunningButton';

// TODO: add better error handling
const ErrorComponent = () => {
  return <strong>Something went wrong</strong>;
};

export const AgentRunButton = () => {
  const { selectedService } = useServices();
  const selectedServiceStatus = selectedService?.deploymentStatus;

  const button = useMemo(() => {
    switch (selectedServiceStatus) {
      case MiddlewareDeploymentStatusMap.STOPPING: {
        return <AgentBusyButton text="Stopping" />;
      }
      case MiddlewareDeploymentStatusMap.DEPLOYING: {
        return <AgentBusyButton text="Starting" />;
      }
      case MiddlewareDeploymentStatusMap.DEPLOYED: {
        return <AgentRunningButton />;
      }
      default: {
        return <AgentNotRunningButton />;
      }
    }
  }, [selectedServiceStatus]);

  return (
    <ErrorBoundary errorComponent={ErrorComponent}>{button}</ErrorBoundary>
  );
};
