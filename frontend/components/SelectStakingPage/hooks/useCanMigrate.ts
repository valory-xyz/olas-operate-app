import { useMemo } from 'react';

import { isActiveDeploymentStatus, StakingProgramId } from '@/constants';
import {
  useActiveStakingContractDetails,
  useService,
  useServices,
  useStakingContractContext,
} from '@/hooks';
import { isNoStakingProgram, isValidServiceId } from '@/utils';
import { hasFreeServiceSlot } from '@/utils/stakingProgram';

type UseCanMigrateProps = {
  stakingProgramId: StakingProgramId;
  isCurrentStakingProgram: boolean;
};

export enum MigrateButtonText {
  AgentInCooldownPeriod = 'Agent in cooldown period',
  NoSlotsAvailable = 'No slots available',
  SelectContract = 'Select',
  CurrentContract = 'Selected',
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

    const isServiceRunning = isActiveDeploymentStatus(serviceStatus);

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
      // Unstaked has no contract, so it never runs out of slots
      // unknown details count as no slots
      case !isNoStakingProgram(stakingProgramId) &&
        hasFreeServiceSlot(contractDetails) !== true:
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
