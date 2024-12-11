import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useMasterBalances,
} from '@/hooks/useBalanceContext';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractDetails,
  useStakingContractContext,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';

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

export const useMigrate = (migrateToStakingProgramId: StakingProgramId) => {
  const {
    isFetched: isServicesLoaded,
    selectedAgentConfig,
    selectedService,
    selectedAgentType,
  } = useServices();
  const { evmHomeChainId: homeChainId } = selectedAgentConfig;
  const serviceConfigId = selectedService?.service_config_id;
  const { deploymentStatus: serviceStatus } = useService(serviceConfigId);

  const {
    isLoaded: isBalanceLoaded,
    totalStakedOlasBalance,
    isLowBalance,
  } = useBalanceContext();
  const { masterSafeBalances } = useMasterBalances();
  const { needsInitialFunding, hasEnoughEthForInitialFunding } = useNeedsFunds(
    migrateToStakingProgramId,
  );

  const { activeStakingProgramId } = useStakingProgram();
  const {
    allStakingContractDetailsRecord,
    isAllStakingContractDetailsRecordLoaded,
  } = useStakingContractContext();
  const { isServiceStaked, isServiceStakedForMinimumDuration } =
    useActiveStakingContractDetails();
  const { stakingContractInfo, hasEnoughServiceSlots } =
    useStakingContractDetails(migrateToStakingProgramId);

  const safeOlasBalance = useMemo(() => {
    if (!isBalanceLoaded) return 0;
    if (isNil(masterSafeBalances) || isEmpty(masterSafeBalances)) return 0;
    return masterSafeBalances.reduce(
      (acc, { evmChainId: chainId, symbol, balance }) => {
        if (chainId === homeChainId && symbol === TokenSymbol.OLAS)
          return acc + balance;
        return acc;
      },
      0,
    );
  }, [homeChainId, isBalanceLoaded, masterSafeBalances]);

  const minimumOlasRequiredToMigrate = useMemo(
    () =>
      STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
        migrateToStakingProgramId
      ]?.stakingRequirements[TokenSymbol.OLAS],
    [selectedAgentConfig.evmHomeChainId, migrateToStakingProgramId],
  );

  const hasEnoughOlasToMigrate = useMemo(() => {
    if (!isBalanceLoaded) return false;
    if (isNil(safeOlasBalance)) return false;
    if (isNil(totalStakedOlasBalance)) return false;
    if (isNil(minimumOlasRequiredToMigrate)) return false;

    const balanceForMigration = safeOlasBalance + totalStakedOlasBalance;
    return balanceForMigration >= minimumOlasRequiredToMigrate;
  }, [
    isBalanceLoaded,
    minimumOlasRequiredToMigrate,
    safeOlasBalance,
    totalStakedOlasBalance,
  ]);

  const hasEnoughOlasForFirstRun = useMemo(() => {
    if (!isBalanceLoaded) return false;
    if (isNil(safeOlasBalance)) return false;
    if (isNil(minimumOlasRequiredToMigrate)) return false;

    return safeOlasBalance >= minimumOlasRequiredToMigrate;
  }, [isBalanceLoaded, minimumOlasRequiredToMigrate, safeOlasBalance]);

  const migrateValidation = useMemo<MigrateValidation>(() => {
    if (!isServicesLoaded) {
      return { canMigrate: false, reason: CantMigrateReason.LoadingServices };
    }

    // Services must be not be running or in a transitional state
    if (
      [
        MiddlewareDeploymentStatus.DEPLOYED,
        MiddlewareDeploymentStatus.DEPLOYING,
        MiddlewareDeploymentStatus.STOPPING,
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

    if (!isAllStakingContractDetailsRecordLoaded) {
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
    if (activeStakingProgramId === migrateToStakingProgramId) {
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

    // user is staked from hereon

    const { deprecated: isDeprecated, agentsSupported } =
      STAKING_PROGRAMS[homeChainId][migrateToStakingProgramId];

    if (isDeprecated || !agentsSupported.includes(selectedAgentType)) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.MigrationNotSupported,
      };
    }

    if (!isServiceStakedForMinimumDuration) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.NotStakedForMinimumDuration,
      };
    }

    return { canMigrate: true };
  }, [
    isServicesLoaded,
    isBalanceLoaded,
    isAllStakingContractDetailsRecordLoaded,
    stakingContractInfo,
    activeStakingProgramId,
    migrateToStakingProgramId,
    hasEnoughOlasToMigrate,
    isServiceStaked,
    homeChainId,
    selectedAgentType,
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
        MiddlewareDeploymentStatus.DEPLOYED,
        MiddlewareDeploymentStatus.DEPLOYING,
        MiddlewareDeploymentStatus.STOPPING,
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

    if (!isAllStakingContractDetailsRecordLoaded) {
      return {
        canMigrate: false,
        reason: CantMigrateReason.LoadingStakingContractInfo,
      };
    }

    const stakingContractInfo =
      allStakingContractDetailsRecord?.[migrateToStakingProgramId];

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
    isAllStakingContractDetailsRecordLoaded,
    allStakingContractDetailsRecord,
    migrateToStakingProgramId,
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
