import { Button, ButtonProps } from 'antd';
import { isNil, sum } from 'lodash';
import { useCallback, useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { MechType } from '@/config/mechs';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
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
import { delayInSeconds } from '@/utils/delay';

/** Button used to start / deploy the agent */
export const AgentNotRunningButton = () => {
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

  const { isEligibleForStaking, isAgentEvicted, isServiceStaked } =
    useActiveStakingContractInfo();

  const { hasEnoughServiceSlots } = useActiveStakingContractInfo();

  const requiredStakedOlas =
    selectedStakingProgramId &&
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
      selectedStakingProgramId
    ]?.stakingRequirements[TokenSymbol.OLAS];

  const serviceSafeOlasWithStaked = sum([totalStakedOlasBalance]);

  const isDeployable = useMemo(() => {
    if (isServicesLoading) return false;
    if (isServiceRunning) return false;

    if (!isAllStakingContractDetailsRecordLoaded) return false;

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

  /**
   * @note only create a service if `service` does not exist
   */
  const deployAndStartService = useCallback(async () => {
    if (!selectedStakingProgramId) return;

    const serviceTemplate = SERVICE_TEMPLATES.find(
      (template) => template.agentType === selectedAgentType,
    );

    if (!serviceTemplate) {
      throw new Error(`Service template not found for ${selectedAgentType}`);
    }

    // Create a new service if it does not exist
    let middlewareServiceResponse;
    if (!service) {
      try {
        middlewareServiceResponse = await ServicesService.createService({
          stakingProgramId: selectedStakingProgramId,
          serviceTemplate,
          deploy: true,
          useMechMarketplace:
            STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][ // TODO: support multi-agent, during optimus week
              selectedStakingProgramId
            ].mechType === MechType.Marketplace,
        });
      } catch (error) {
        console.error('Error while creating the service:', error);
        showNotification?.('Failed to create service.');
        throw new Error('Failed to create service');
      }
    }

    if (isNil(service) && isNil(middlewareServiceResponse))
      throw new Error('Service not found');

    // Start the service
    try {
      const serviceToStart = service ?? middlewareServiceResponse;
      await ServicesService.startService(serviceToStart!.service_config_id);
    } catch (error) {
      console.error('Error while starting the service:', error);
      showNotification?.('Failed to start service.');
      throw error;
    }
  }, [
    selectedAgentConfig.evmHomeChainId,
    selectedAgentType,
    selectedStakingProgramId,
    service,
    showNotification,
  ]);

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

    pauseAllPolling();
    overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);

    try {
      await createSafeIfNeeded();
      await deployAndStartService();
    } catch (error) {
      console.error('Error while starting the agent:', error);
      showNotification?.('An error occurred. Please try again.');
      overrideSelectedServiceStatus(null); // wipe status
      throw error;
    }

    try {
      await updateStatesSequentially();
    } catch (error) {
      console.error('Error while updating states sequentially:', error);
      showNotification?.('Failed to update app state.');
    }

    overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYED);

    resumeAllPolling();
    await delayInSeconds(5);

    overrideSelectedServiceStatus(null);
  }, [
    masterWallets,
    pauseAllPolling,
    resumeAllPolling,
    overrideSelectedServiceStatus,
    createSafeIfNeeded,
    deployAndStartService,
    showNotification,
    updateStatesSequentially,
  ]);

  const buttonProps: ButtonProps = {
    type: 'primary',
    size: 'large',
    disabled: !isDeployable,
    onClick: isDeployable ? handleStart : undefined,
  };

  const buttonText = `Start agent ${service ? '' : '& stake'}`;

  return <Button {...buttonProps}>{buttonText}</Button>;
};
