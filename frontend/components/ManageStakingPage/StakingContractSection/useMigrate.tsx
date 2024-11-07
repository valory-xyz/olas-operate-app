import { isNil } from 'lodash';
import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import {
  useActiveStakingContractInfo,
  useStakingContractContext,
  useStakingContractInfo,
} from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { getMinimumStakedAmountRequired } from '@/utils/service';

export enum CantMigrateReason {
  ContractAlreadySelected = 'This staking program is already selected',
  LoadingBalance = 'Loading balance...',
  LoadingStakingContractInfo = 'Loading staking contract information...',
  InsufficientOlasToMigrate = 'Insufficient OLAS to switch',
  InsufficientGasToMigrate = 'Insufficient XDAI to switch', // TODO: make chain agnostic
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

  const { stakingContractInfoRecord, isStakingContractInfoRecordLoaded } =
    useStakingContractContext();

  const { isServiceStaked, isServiceStakedForMinimumDuration } =
    useActiveStakingContractInfo();

  const { stakingContractInfo, hasEnoughServiceSlots } =
    useStakingContractInfo(stakingProgramId);

  const { hasInitialLoaded: isServicesLoaded } = useServices();

  const { hasEnoughEthForInitialFunding } = useNeedsFunds();

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

    if (!isBalanceLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingBalance };
    }

    if (!isStakingContractInfoRecordLoaded) {
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

    if (
      (stakingContractInfo.serviceIds ?? [])?.length >=
      (stakingContractInfo.maxNumServices ?? 0)
    ) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NoAvailableStakingSlots,
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

    if (stakingContractInfo && !isServiceStakedForMinimumDuration) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NotStakedForMinimumDuration,
      };
    }

    return { canMigrate: true };
  }, [
    isServicesLoaded,
    isBalanceLoaded,
    isStakingContractInfoRecordLoaded,
    stakingContractInfo,
    activeStakingProgramId,
    stakingProgramId,
    hasEnoughOlasToMigrate,
    isServiceStaked,
    activeStakingProgramMeta?.canMigrateTo,
    isServiceStakedForMinimumDuration,
    serviceStatus,
  ]);

  const firstDeployValidation = useMemo<MigrateValidation>(() => {
    /**
     * @todo fix temporary check for xDai balance on first deploy (same as initial funding requirement)
     */

    if (!isServicesLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingServices };
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

    if (!isBalanceLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingBalance };
    }

    // staking contract requirements

    if (!isStakingContractInfoRecordLoaded) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.LoadingStakingContractInfo,
      };
    }

    const stakingContractInfo = stakingContractInfoRecord?.[stakingProgramId];

    if (!stakingContractInfo) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.CannotFindStakingContractInfo,
      };
    }

    if (
      (stakingContractInfo.serviceIds ?? [])?.length >=
      (stakingContractInfo.maxNumServices ?? 0)
    ) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NoAvailableStakingSlots,
      };
    }

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

    if (!hasEnoughOlasForFirstRun) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.InsufficientOlasToMigrate,
      };
    }

    if (!hasEnoughEthForInitialFunding) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.InsufficientGasToMigrate,
      };
    }

    return { canMigrate: true };
  }, [
    isServicesLoaded,
    isBalanceLoaded,
    hasEnoughEthForInitialFunding,
    isStakingContractInfoRecordLoaded,
    stakingContractInfoRecord,
    stakingProgramId,
    hasEnoughOlasForFirstRun,
    serviceStatus,
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
