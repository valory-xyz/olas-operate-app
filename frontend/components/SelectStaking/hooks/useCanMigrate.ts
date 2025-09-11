import { useMemo } from 'react';

import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractDetails,
  useStakingContractContext,
} from '@/hooks/useStakingContractDetails';

type UseCanMigrateProps = {
  stakingProgramId: StakingProgramId;
  isCurrentStakingProgram: boolean;
};

export enum MigrateButtonText {
  AgentInCooldownPeriod = 'Agent in cooldown period',
  NoSlotsAvailable = 'No slots available',
  SwitchStakingContract = 'Switch Staking Contract',
  CurrentContract = 'Current Contract',
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
  const { deploymentStatus: serviceStatus } = useService(serviceConfigId);

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
      case !isServiceStakedForMinimumDuration:
        return {
          buttonText: MigrateButtonText.AgentInCooldownPeriod,
          canMigrate: false,
        };
      case isServiceRunning:
        return {
          buttonText: MigrateButtonText.CurrentlyRunning,
          canMigrate: false,
        };
      case slotsTaken >= maxSlots:
        return {
          buttonText: MigrateButtonText.NoSlotsAvailable,
          canMigrate: false,
        };
      default:
        return {
          buttonText: MigrateButtonText.SwitchStakingContract,
          canMigrate: true,
        };
    }
  }, [
    allStakingContractDetailsRecord,
    stakingProgramId,
    serviceStatus,
    isCurrentStakingProgram,
    isServiceStakedForMinimumDuration,
  ]);

  return { buttonText, canMigrate };
};
