import { useMemo } from 'react';

import { MiddlewareDeploymentStatusMap, StakingProgramId } from '@/constants';
import {
  useActiveStakingContractDetails,
  useService,
  useServices,
  useStakingContractContext,
} from '@/hooks';
import { isValidServiceId } from '@/utils';

type UseCanMigrateProps = {
  stakingProgramId: StakingProgramId;
  isCurrentStakingProgram: boolean;
};

export enum MigrateButtonText {
  AgentInCooldownPeriod = 'Agent in cooldown period',
  NoSlotsAvailable = 'No slots available',
  SelectContract = 'Select',
  CurrentContract = 'Current',
  CurrentlyRunning = 'Agent is currently running',
}

export const useCanMigrate = ({
  stakingProgramId,
  isCurrentStakingProgram,
}: UseCanMigrateProps) => {
  const { selectedService } = useServices();
  const { allStakingContractDetailsRecord } = useStakingContractContext();
  const { isServiceStakedForMinimumDuration } =
    useActiveStakingContractDetails();
  const serviceConfigId = selectedService?.service_config_id;
  const { deploymentStatus: serviceStatus, serviceNftTokenId } =
    useService(serviceConfigId);

  const { buttonText, canMigrate } = useMemo(() => {
    const contractDetails = allStakingContractDetailsRecord?.[stakingProgramId];
    const maxSlots = Number(contractDetails?.maxNumServices ?? 0);
    const slotsTaken = Number(contractDetails?.serviceIds?.length ?? 0);

    const isServiceRunning = [
      MiddlewareDeploymentStatusMap.DEPLOYED,
      MiddlewareDeploymentStatusMap.DEPLOYING,
      MiddlewareDeploymentStatusMap.STOPPING,
    ].some((status) => status === serviceStatus);

    switch (true) {
      case isCurrentStakingProgram:
        return {
          buttonText: MigrateButtonText.CurrentContract,
          canMigrate: false,
        };
      case isServiceRunning:
        return {
          buttonText: MigrateButtonText.CurrentlyRunning,
          canMigrate: false,
        };
      // If service is valid (not dummy), check if it was staked for min-duration
      case !isServiceStakedForMinimumDuration &&
        isValidServiceId(serviceNftTokenId):
        return {
          buttonText: MigrateButtonText.AgentInCooldownPeriod,
          canMigrate: false,
        };
      case slotsTaken >= maxSlots:
        return {
          buttonText: MigrateButtonText.NoSlotsAvailable,
          canMigrate: false,
        };
      default:
        return {
          buttonText: MigrateButtonText.SelectContract,
          canMigrate: true,
        };
    }
  }, [
    allStakingContractDetailsRecord,
    stakingProgramId,
    serviceStatus,
    isCurrentStakingProgram,
    isServiceStakedForMinimumDuration,
    serviceNftTokenId,
  ]);

  return { buttonText, canMigrate };
};
