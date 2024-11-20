import { Button } from 'antd';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { assertRequired } from '@/types/Util';

import {
  CannotStartAgentDueToUnexpectedError,
  CannotStartAgentPopover,
} from '../CannotStartAgentPopover';
import { AgentNotRunningButton } from './AgentNotRunningButton';
import { AgentRunningButton } from './AgentRunningButton';
import { AgentStartingButton } from './AgentStartingButton';
import { AgentStoppingButton } from './AgentStoppingButton';

export const AgentButton = () => {
  const { selectedService } = useServices();
  const { activeStakingProgramId } = useStakingProgram();

  const {
    service,
    deploymentStatus: serviceStatus,
    isLoaded,
  } = useService({ serviceConfigId: selectedService?.service_config_id });

  assertRequired(
    activeStakingProgramId,
    'Active staking program ID is required',
  );

  const { isEligibleForStaking, isAgentEvicted } = useStakingContractDetails(
    activeStakingProgramId,
  );

  return useMemo(() => {
    if (!isLoaded) {
      return <Button type="primary" size="large" disabled loading />;
    }

    if (serviceStatus === MiddlewareDeploymentStatus.STOPPING) {
      return <AgentStoppingButton />;
    }

    if (serviceStatus === MiddlewareDeploymentStatus.DEPLOYING) {
      return <AgentStartingButton />;
    }

    if (serviceStatus === MiddlewareDeploymentStatus.DEPLOYED) {
      return <AgentRunningButton />;
    }

    if (!isEligibleForStaking && isAgentEvicted)
      return <CannotStartAgentPopover />;

    if (
      !service ||
      serviceStatus === MiddlewareDeploymentStatus.STOPPED ||
      serviceStatus === MiddlewareDeploymentStatus.CREATED ||
      serviceStatus === MiddlewareDeploymentStatus.BUILT ||
      serviceStatus === MiddlewareDeploymentStatus.DELETED
    ) {
      return <AgentNotRunningButton />;
    }

    return <CannotStartAgentDueToUnexpectedError />;
  }, [isLoaded, serviceStatus, isEligibleForStaking, isAgentEvicted, service]);
};
