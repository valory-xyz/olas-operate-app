import { Button } from 'antd';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { useServices } from '@/hooks/useServices';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import {
  CannotStartAgentDueToUnexpectedError,
  CannotStartAgentPopover,
} from '../CannotStartAgentPopover';
import { AgentNotRunningButton } from './AgentNotRunningButton';
import { AgentRunningButton } from './AgentRunningButton';
import { AgentStartingButton } from './AgentStartingButton';
import { AgentStoppingButton } from './AgentStoppingButton';

// TODO: add better error handling
const ErrorComponent = () => {
  return <strong>Something went wrong</strong>;
};

export const AgentButton = () => {
  const {
    isLoading: isServicesLoading,
    isSelectedServiceDeploymentStatusLoading,
    selectedService,
    selectedServiceStatusOverride,
  } = useServices();
  const { selectedStakingProgramId } = useStakingProgram();

  const {
    isEligibleForStaking,
    isAgentEvicted,
    isSelectedStakingContractDetailsLoading,
  } = useActiveStakingContractDetails();

  const selectedServiceStatus =
    selectedServiceStatusOverride ?? selectedService?.deploymentStatus;

  const button = useMemo(() => {
    if (
      isServicesLoading ||
      isSelectedStakingContractDetailsLoading ||
      isSelectedServiceDeploymentStatusLoading ||
      !selectedStakingProgramId // Staking program not yet loaded
    ) {
      return (
        <Button type="primary" size="large" disabled loading>
          Loading...
        </Button>
      );
    }

    if (selectedServiceStatus === MiddlewareDeploymentStatus.STOPPING) {
      return <AgentStoppingButton />;
    }

    if (selectedServiceStatus === MiddlewareDeploymentStatus.DEPLOYING) {
      return <AgentStartingButton />;
    }

    if (selectedServiceStatus === MiddlewareDeploymentStatus.DEPLOYED) {
      return <AgentRunningButton />;
    }

    if (!isEligibleForStaking && isAgentEvicted)
      return <CannotStartAgentPopover />;

    if (
      !selectedService ||
      selectedServiceStatus === MiddlewareDeploymentStatus.STOPPED ||
      selectedServiceStatus === MiddlewareDeploymentStatus.CREATED ||
      selectedServiceStatus === MiddlewareDeploymentStatus.BUILT ||
      selectedServiceStatus === MiddlewareDeploymentStatus.DELETED
    ) {
      return <AgentNotRunningButton />;
    }

    return <CannotStartAgentDueToUnexpectedError />;
  }, [
    selectedStakingProgramId,
    isServicesLoading,
    isSelectedStakingContractDetailsLoading,
    isSelectedServiceDeploymentStatusLoading,
    selectedServiceStatus,
    selectedService,
    isEligibleForStaking,
    isAgentEvicted,
  ]);

  return (
    <ErrorBoundary errorComponent={ErrorComponent}>{button}</ErrorBoundary>
  );
};
