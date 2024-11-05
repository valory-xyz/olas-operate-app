import { isNil } from 'lodash';
import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { getMinimumStakedAmountRequired } from '@/utils/service';

export enum CantMigrateReason {
  ContractAlreadySelected = 'This staking program is already selected',
  LoadingBalance = 'Loading balance...',
  LoadingStakingContractInfo = 'Loading staking contract information...',
  InsufficientOlasToMigrate = 'Insufficient OLAS to switch',
  MigrationNotSupported = 'Switching to this program is not currently supported',
  NoAvailableRewards = 'This program has no rewards available',
  NoAvailableStakingSlots = 'The program has no more available slots',
  NotStakedForMinimumDuration = 'Pearl has not been staked for the required minimum duration',
  PearlCurrentlyRunning = 'Unable to switch while Pearl is running',
  LoadingServices = 'Loading services...',
  CannotFindStakingContractInfo = 'Cannot obtain staking contract information',
}

type MigrateValidation =
  | {
      canMigrate: true;
    }
  | {
      canMigrate: false;
      reason: CantMigrateReason;
    };

export const useMigrate = (stakingProgramId: StakingProgramId) => {
  const { serviceStatus } = useServices();
  const { serviceTemplate } = useServiceTemplates();
  const {
    isBalanceLoaded,
    masterSafeBalance: safeBalance,
    totalOlasStakedBalance,
    isLowBalance,
  } = useBalance();
  const { activeStakingProgramId, activeStakingProgramMeta } =
    useStakingProgram();
  const { needsInitialFunding } = useNeedsFunds();

  const {
    activeStakingContractInfo,
    isServiceStaked,
    isServiceStakedForMinimumDuration,
    isStakingContractInfoLoaded,
    stakingContractInfoRecord,
    hasEnoughServiceSlots,
  } = useStakingContractInfo();

  const stakingContractInfo = stakingContractInfoRecord?.[stakingProgramId];

  const { hasInitialLoaded: isServicesLoaded } = useServices();

  const minimumOlasRequiredToMigrate = useMemo(
    () => getMinimumStakedAmountRequired(serviceTemplate, stakingProgramId),
    [serviceTemplate, stakingProgramId],
  );

  const hasEnoughOlasToMigrate = useMemo(() => {
    if (!isBalanceLoaded) return false;
    if (isNil(safeBalance?.OLAS)) return false;
    if (isNil(totalOlasStakedBalance)) return false;
    if (isNil(minimumOlasRequiredToMigrate)) return false;

    const balanceForMigration = safeBalance.OLAS + totalOlasStakedBalance;

    return balanceForMigration >= minimumOlasRequiredToMigrate;
  }, [
    isBalanceLoaded,
    minimumOlasRequiredToMigrate,
    safeBalance,
    totalOlasStakedBalance,
  ]);

  const hasEnoughOlasForFirstRun = useMemo(() => {
    if (!isBalanceLoaded) return false;
    if (isNil(safeBalance?.OLAS)) return false;
    if (isNil(minimumOlasRequiredToMigrate)) return false;

    return safeBalance.OLAS >= minimumOlasRequiredToMigrate;
  }, [isBalanceLoaded, minimumOlasRequiredToMigrate, safeBalance]);

  const migrateValidation = useMemo<MigrateValidation>(() => {
    if (!isServicesLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingServices };
    }

    if (!isBalanceLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingBalance };
    }

    if (isServicesLoaded && !isStakingContractInfoLoaded) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.LoadingStakingContractInfo,
      };
    }

    if (!stakingContractInfo) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.CannotFindStakingContractInfo,
      };
    }

    // general requirements
    if (activeStakingProgramId === stakingProgramId) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.ContractAlreadySelected,
      };
    }

    if ((stakingContractInfo.availableRewards ?? 0) <= 0) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NoAvailableRewards,
      };
    }

    if (
      (stakingContractInfo.serviceIds ?? []).length >=
      (stakingContractInfo.maxNumServices ?? 0)
    ) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NoAvailableStakingSlots,
      };
    }

    if (!hasEnoughOlasToMigrate) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.InsufficientOlasToMigrate,
      };
    }

    // Services must be not be running or in a transitional state
    if (
      [
        DeploymentStatus.DEPLOYED,
        DeploymentStatus.DEPLOYING,
        DeploymentStatus.STOPPING,
      ].some((status) => status === serviceStatus)
    ) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.PearlCurrentlyRunning,
      };
    }

    if (activeStakingProgramId === null && !isServiceStaked) {
      return { canMigrate: true };
    }

    // user must be staked from hereon

    if (!activeStakingProgramMeta?.canMigrateTo.includes(stakingProgramId)) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.MigrationNotSupported,
      };
    }

    if (activeStakingContractInfo && !isServiceStakedForMinimumDuration) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NotStakedForMinimumDuration,
      };
    }

    return { canMigrate: true };
  }, [
    isServicesLoaded,
    isBalanceLoaded,
    isStakingContractInfoLoaded,
    stakingContractInfo,
    activeStakingProgramId,
    stakingProgramId,
    hasEnoughOlasToMigrate,
    isServiceStaked,
    activeStakingProgramMeta?.canMigrateTo,
    activeStakingContractInfo,
    isServiceStakedForMinimumDuration,
    serviceStatus,
  ]);

  const firstDeployValidation = useMemo<MigrateValidation>(() => {
    if (!isServicesLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingServices };
    }

    if (!isBalanceLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingBalance };
    }

    if (!hasEnoughOlasForFirstRun) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.InsufficientOlasToMigrate,
      };
    }

    const stakingContractInfo = stakingContractInfoRecord?.[stakingProgramId];

    if ((stakingContractInfo?.availableRewards ?? 0) <= 0) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NoAvailableRewards,
      };
    }

    if (!stakingContractInfo?.maxNumServices) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NoAvailableStakingSlots,
      };
    }

    return { canMigrate: true };
  }, [
    isServicesLoaded,
    isBalanceLoaded,
    hasEnoughOlasForFirstRun,
    stakingContractInfoRecord,
    stakingProgramId,
  ]);

  const canUpdateStakingContract = useMemo(() => {
    if (!isBalanceLoaded) return false;
    if (isLowBalance) return false;
    if (needsInitialFunding) return false;
    if (!hasEnoughServiceSlots) return false;
    return true;
  }, [
    isBalanceLoaded,
    isLowBalance,
    needsInitialFunding,
    hasEnoughServiceSlots,
  ]);

  return {
    migrateValidation,
    firstDeployValidation,
    canUpdateStakingContract,
  };
};
