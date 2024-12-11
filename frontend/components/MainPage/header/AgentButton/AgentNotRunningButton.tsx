// Same file, above the AgentNotRunningButton component

import { Button } from 'antd';
import { isNil, sum } from 'lodash';
import { useCallback, useMemo } from 'react';

import {
  MiddlewareDeploymentStatus,
  MiddlewareServiceResponse,
  ServiceTemplate,
} from '@/client';
import { MechType } from '@/config/mechs';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
import { StakingProgramId } from '@/enums/StakingProgram';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useMasterBalances,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractInfo,
  useStakingContractContext,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useStore } from '@/hooks/useStore';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import { Service } from '@/types/Service';
import { delayInSeconds } from '@/utils/delay';

export function useServiceDeployment() {
  const { storeState } = useStore();
  const { showNotification } = useElectronApi();

  const { masterWallets, masterSafes } = useMasterWalletContext();
  const {
    selectedService,
    setPaused: setIsServicePollingPaused,
    refetch: updateServicesState,
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedAgentType,
    overrideSelectedServiceStatus,
  } = useServices();

  const { service, isServiceRunning } = useService(
    selectedService?.service_config_id,
  );

  const {
    setIsPaused: setIsBalancePollingPaused,
    totalStakedOlasBalance,
    updateBalances,
  } = useBalanceContext();

  const { serviceStakedBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );

  const serviceStakedOlasBalanceOnHomeChain = serviceStakedBalances?.find(
    (stakedBalance) =>
      stakedBalance.evmChainId === selectedAgentConfig.evmHomeChainId,
  );

  const serviceTotalStakedOlas = sum([
    serviceStakedOlasBalanceOnHomeChain?.olasBondBalance,
    serviceStakedOlasBalanceOnHomeChain?.olasDepositBalance,
  ]);

  const { masterSafeBalances } = useMasterBalances();
  const masterSafeNativeGasBalance = masterSafeBalances?.find(
    (walletBalanceResult) =>
      walletBalanceResult.isNative &&
      walletBalanceResult.evmChainId === selectedAgentConfig.evmHomeChainId,
  )?.balance;

  const {
    isAllStakingContractDetailsRecordLoaded,
    setIsPaused: setIsStakingContractInfoPollingPaused,
    refetchSelectedStakingContractDetails: refetchActiveStakingContractDetails,
  } = useStakingContractContext();

  const { selectedStakingProgramId } = useStakingProgram();

  const {
    isEligibleForStaking,
    isAgentEvicted,
    isServiceStaked,
    hasEnoughServiceSlots,
  } = useActiveStakingContractInfo();

  const requiredStakedOlas =
    selectedStakingProgramId &&
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
      selectedStakingProgramId
    ]?.stakingRequirements[TokenSymbol.OLAS];

  const serviceSafeOlasWithStaked = sum([totalStakedOlasBalance]);

  const isDeployable = useMemo(() => {
    if (
      isServicesLoading ||
      isServiceRunning ||
      !isAllStakingContractDetailsRecordLoaded
    )
      return false;

    if (isNil(requiredStakedOlas)) return false;

    if (
      !isNil(hasEnoughServiceSlots) &&
      !hasEnoughServiceSlots &&
      !isServiceStaked
    )
      return false;

    const masterSafeOlasBalance = masterSafeBalances?.find(
      (walletBalanceResult) =>
        walletBalanceResult.symbol === TokenSymbol.OLAS &&
        walletBalanceResult.evmChainId === selectedAgentConfig.evmHomeChainId,
    )?.balance;

    if (service && storeState?.isInitialFunded && isServiceStaked) {
      return (serviceTotalStakedOlas ?? 0) >= requiredStakedOlas;
    }

    if (isEligibleForStaking && isAgentEvicted) return true;

    if (isServiceStaked) {
      const hasEnoughOlas =
        (serviceSafeOlasWithStaked ?? 0) >= requiredStakedOlas;
      const hasEnoughNativeGas =
        (masterSafeNativeGasBalance ?? 0) > LOW_MASTER_SAFE_BALANCE;
      return hasEnoughOlas && hasEnoughNativeGas;
    }

    const hasEnoughForInitialDeployment =
      (masterSafeOlasBalance ?? 0) >= requiredStakedOlas &&
      (masterSafeNativeGasBalance ?? 0) >= LOW_MASTER_SAFE_BALANCE;

    return hasEnoughForInitialDeployment;
  }, [
    isServicesLoading,
    isServiceRunning,
    isAllStakingContractDetailsRecordLoaded,
    requiredStakedOlas,
    hasEnoughServiceSlots,
    isServiceStaked,
    masterSafeBalances,
    service,
    storeState?.isInitialFunded,
    isEligibleForStaking,
    isAgentEvicted,
    masterSafeNativeGasBalance,
    selectedAgentConfig.evmHomeChainId,
    serviceTotalStakedOlas,
    serviceSafeOlasWithStaked,
  ]);

  const pauseAllPolling = useCallback(() => {
    setIsServicePollingPaused(true);
    setIsBalancePollingPaused(true);
    setIsStakingContractInfoPollingPaused(true);
  }, [
    setIsServicePollingPaused,
    setIsBalancePollingPaused,
    setIsStakingContractInfoPollingPaused,
  ]);

  const resumeAllPolling = useCallback(() => {
    setIsServicePollingPaused(false);
    setIsBalancePollingPaused(false);
    setIsStakingContractInfoPollingPaused(false);
  }, [
    setIsServicePollingPaused,
    setIsBalancePollingPaused,
    setIsStakingContractInfoPollingPaused,
  ]);

  const createSafeIfNeeded = useCallback(async () => {
    if (
      !masterSafes?.find(
        (masterSafe) =>
          masterSafe.evmChainId === selectedAgentConfig.evmHomeChainId,
      )
    ) {
      await WalletService.createSafe(selectedAgentConfig.middlewareHomeChainId);
    }
  }, [
    masterSafes,
    selectedAgentConfig.evmHomeChainId,
    selectedAgentConfig.middlewareHomeChainId,
  ]);

  const createService = useCallback(
    async (
      selectedStakingProgramId: StakingProgramId,
      serviceTemplate: ServiceTemplate,
    ): Promise<MiddlewareServiceResponse> => {
      try {
        return ServicesService.createService({
          stakingProgramId: selectedStakingProgramId,
          serviceTemplate,
          deploy: false, // TODO: deprecated will remove
          useMechMarketplace:
            STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
              selectedStakingProgramId
            ].mechType === MechType.Marketplace,
        });
      } catch (error) {
        console.error('Failed to create service:', error);
        showNotification?.('Failed to create service.');
        throw error;
      }
    },
    [selectedAgentConfig.evmHomeChainId, showNotification],
  );

  const startService = useCallback(
    async (service: Service) => {
      try {
        return ServicesService.startService(service.service_config_id);
      } catch (error) {
        console.error('Failed to start service:', error);
        showNotification?.('Failed to start service.');
        throw error;
      }
    },
    [showNotification],
  );

  const updateService = useCallback(
    async (
      service: Service,
      serviceTemplate: ServiceTemplate,
      selectedStakingProgramId: StakingProgramId,
    ) => {
      if (service.hash !== serviceTemplate.hash) {
        return ServicesService.updateService({
          serviceConfigId: service.service_config_id,
          stakingProgramId: selectedStakingProgramId,
          chainId: selectedAgentConfig.evmHomeChainId,
          serviceTemplate,
          deploy: false, // TODO: deprecated will remove
          useMechMarketplace:
            STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
              selectedStakingProgramId
            ].mechType === MechType.Marketplace,
        });
      }
      return service;
    },
    [selectedAgentConfig.evmHomeChainId],
  );

  const updateStatesSequentially = useCallback(async () => {
    await updateServicesState?.();
    await refetchActiveStakingContractDetails();
    await updateBalances();
  }, [
    updateServicesState,
    refetchActiveStakingContractDetails,
    updateBalances,
  ]);

  const handleStart = useCallback(async () => {
    if (!masterWallets?.[0]) return;
    if (!selectedStakingProgramId)
      throw new Error('Staking program ID required');

    const selectedServiceTemplate = SERVICE_TEMPLATES.find(
      (template) => template.agentType === selectedAgentType,
    );
    if (!selectedServiceTemplate) throw new Error('Service template required');

    pauseAllPolling();
    overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);

    try {
      await createSafeIfNeeded();

      let tempService: Service | undefined = service;

      if (tempService) {
        tempService = await updateService(
          tempService,
          selectedServiceTemplate,
          selectedStakingProgramId,
        );
      } else {
        tempService = await createService(
          selectedStakingProgramId,
          selectedServiceTemplate,
        );
      }

      if (!tempService) throw new Error('Failed to create/update service');

      await startService(tempService);
    } catch (error) {
      console.error('Error during start:', error);
      showNotification?.('An error occurred while starting. Please try again.');
      overrideSelectedServiceStatus(null);
      resumeAllPolling();
      throw error;
    }

    try {
      await updateStatesSequentially();
    } catch (error) {
      console.error('Failed to update states:', error);
      showNotification?.('Failed to update state.');
    }

    overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYED);
    resumeAllPolling();
    await delayInSeconds(5);
    overrideSelectedServiceStatus(null);
  }, [
    masterWallets,
    selectedStakingProgramId,
    pauseAllPolling,
    overrideSelectedServiceStatus,
    resumeAllPolling,
    selectedAgentType,
    createSafeIfNeeded,
    service,
    startService,
    updateService,
    createService,
    showNotification,
    updateStatesSequentially,
  ]);

  const buttonText = `Start agent ${service ? '' : '& stake'}`;

  return { isDeployable, handleStart, buttonText };
}

// Original component, now simplified
export const AgentNotRunningButton = () => {
  const { isDeployable, handleStart, buttonText } = useServiceDeployment();

  return (
    <Button
      type="primary"
      size="large"
      disabled={!isDeployable}
      onClick={isDeployable ? handleStart : undefined}
    >
      {buttonText}
    </Button>
  );
};
