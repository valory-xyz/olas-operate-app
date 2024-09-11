import { isNil } from 'lodash';
import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { getMinimumStakedAmountRequired } from '@/utils/service';

export enum CantMigrateReason {
  ContractAlreadySelected = 'Contract is already selected',
  LoadingBalance = 'Loading balance...',
  LoadingStakingContractInfo = 'Loading staking contract information...',
  InsufficientOlasToMigrate = 'Insufficient OLAS to migrate',
  MigrationNotSupported = 'Migration not supported from your current contract',
  NoAvailableRewards = 'No available rewards',
  NoAvailableStakingSlots = 'No available staking slots',
  NotStakedForMinimumDuration = 'Pearl has not been staked for the minimum duration',
  PearlCurrentlyRunning = 'Pearl is currently running',
}

export const useMigrate = (stakingProgramId: StakingProgramId) => {
  const { serviceStatus } = useServices();
  const { serviceTemplate } = useServiceTemplates();
  const { isBalanceLoaded, safeBalance, totalOlasStakedBalance } = useBalance();
  const { activeStakingProgramId, activeStakingProgramMeta } =
    useStakingProgram();
  const {
    activeStakingContractInfo,
    isServiceStaked,
    isServiceStakedForMinimumDuration,
    isStakingContractInfoLoaded,
    isRewardsAvailable,
    hasEnoughServiceSlots,
  } = useStakingContractInfo();

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

  const migrateValidation = useMemo<{
    canMigrate: boolean;
    reason?: CantMigrateReason;
  }>(() => {
    // loading requirements
    if (!isBalanceLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingBalance };
    }

    if (!isStakingContractInfoLoaded) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.LoadingStakingContractInfo,
      };
    }

    // general requirements
    if (activeStakingProgramId === stakingProgramId) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.ContractAlreadySelected,
      };
    }

    if (!isRewardsAvailable) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NoAvailableRewards,
      };
    }

    if (!hasEnoughServiceSlots) {
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

    // user is not actively staked, allow migration
    if (activeStakingProgramId === null) {
      return { canMigrate: true };
    }

    if (!isServiceStaked) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NotStakedForMinimumDuration,
      };
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
    isBalanceLoaded,
    isStakingContractInfoLoaded,
    activeStakingProgramId,
    stakingProgramId,
    isRewardsAvailable,
    hasEnoughServiceSlots,
    hasEnoughOlasToMigrate,
    isServiceStaked,
    activeStakingProgramMeta?.canMigrateTo,
    activeStakingContractInfo,
    isServiceStakedForMinimumDuration,
    serviceStatus,
  ]);

  return {
    migrateValidation,
  };
};
