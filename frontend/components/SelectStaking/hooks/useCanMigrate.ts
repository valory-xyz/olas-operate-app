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

export enum CantMigrateReason {
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

  const contractDetails = allStakingContractDetailsRecord?.[stakingProgramId];
  const maxSlots = Number(contractDetails?.maxNumServices ?? 0);
  const slotsTaken = Number(contractDetails?.serviceIds?.length ?? 0);
  const serviceConfigId = selectedService?.service_config_id;
  const { deploymentStatus: serviceStatus } = useService(serviceConfigId);

  const isServiceRunning = [
    MiddlewareDeploymentStatusMap.DEPLOYED,
    MiddlewareDeploymentStatusMap.DEPLOYING,
    MiddlewareDeploymentStatusMap.STOPPING,
  ].some((status) => status === serviceStatus);

  const { buttonText, canMigrate } = useMemo(() => {
    switch (true) {
      case isCurrentStakingProgram:
        return {
          buttonText: CantMigrateReason.CurrentContract,
          canMigrate: false,
        };
      case !isServiceStakedForMinimumDuration:
        return {
          buttonText: CantMigrateReason.AgentInCooldownPeriod,
          canMigrate: false,
        };
      case isServiceRunning:
        return {
          buttonText: CantMigrateReason.CurrentlyRunning,
          canMigrate: false,
        };
      case slotsTaken >= maxSlots:
        return {
          buttonText: CantMigrateReason.NoSlotsAvailable,
          canMigrate: false,
        };
      default:
        return {
          buttonText: CantMigrateReason.SwitchStakingContract,
          canMigrate: true,
        };
    }
  }, [
    isCurrentStakingProgram,
    isServiceStakedForMinimumDuration,
    isServiceRunning,
    slotsTaken,
    maxSlots,
  ]);

  return { buttonText, canMigrate };
};
