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
import { asEvmChainId } from '@/utils/middlewareHelpers';

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
  } = useServices();

  const { service, setDeploymentStatus, isServiceRunning } = useService(
    selectedService?.service_config_id,
  );

  const {
    setIsPaused: setIsBalancePollingPaused,
    totalStakedOlasBalance,
    updateBalances,
  } = useBalanceContext();

  const { serviceSafeBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );

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

  const serviceSafeOlasBalance = serviceSafeBalances?.find(
    (walletBalanceResult) =>
      walletBalanceResult.symbol === TokenSymbol.OLAS &&
      walletBalanceResult.evmChainId === asEvmChainId(service?.home_chain),
  )?.balance;

  const serviceSafeOlasWithStaked = sum([
    serviceSafeOlasBalance,
    totalStakedOlasBalance,
  ]);

  const isDeployable = useMemo(() => {
    if (isServicesLoading) return false;
    if (isServiceRunning) return false;

    if (!isAllStakingContractDetailsRecordLoaded) return false;

    if (isNil(requiredStakedOlas)) return false;

    if (!hasEnoughServiceSlots && !isServiceStaked) return false;

    if (service && storeState?.isInitialFunded) {
      return (serviceSafeOlasWithStaked ?? 0) >= requiredStakedOlas;
    }

    if (isEligibleForStaking && isAgentEvicted) return true;

    if (isServiceStaked) {
      const hasEnoughOlas =
        (serviceSafeOlasWithStaked ?? 0) >= requiredStakedOlas;
      const hasEnoughNativeGas =
        (masterSafeNativeGasBalance ?? 0) > LOW_MASTER_SAFE_BALANCE;
      return hasEnoughOlas && hasEnoughNativeGas;
    }

    const masterSafeOlasBalance = masterSafeBalances?.find(
      (walletBalanceResult) =>
        walletBalanceResult.symbol === TokenSymbol.OLAS &&
        walletBalanceResult.evmChainId === selectedAgentConfig.evmHomeChainId,
    )?.balance;

    const hasEnoughForInitialDeployment =
      (masterSafeOlasBalance ?? 0) > requiredStakedOlas &&
      (masterSafeNativeGasBalance ?? 0) > LOW_MASTER_SAFE_BALANCE;

    return hasEnoughForInitialDeployment;
  }, [
    isServicesLoading,
    isServiceRunning,
    isAllStakingContractDetailsRecordLoaded,
    requiredStakedOlas,
    hasEnoughServiceSlots,
    isServiceStaked,
    service,
    storeState?.isInitialFunded,
    isEligibleForStaking,
    isAgentEvicted,
    masterSafeBalances,
    masterSafeNativeGasBalance,
    serviceSafeOlasWithStaked,
    selectedAgentConfig.evmHomeChainId,
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

  const deployAndStartService = useCallback(async () => {
    if (!selectedStakingProgramId) return;

    const serviceTemplate = SERVICE_TEMPLATES.find(
      (template) => template.agentType === selectedAgentType,
    );

    if (!serviceTemplate) {
      throw new Error(`Service template not found for ${selectedAgentType}`);
    }

    let middlewareServiceResponse;
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
      throw error;
    }

    try {
      ServicesService.startService(middlewareServiceResponse.service_config_id);
    } catch (error) {
      console.error('Error while starting the service:', error);
      showNotification?.('Failed to start service.');
      throw error;
    }
  }, [
    selectedAgentConfig.evmHomeChainId,
    selectedAgentType,
    selectedStakingProgramId,
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
    setDeploymentStatus(MiddlewareDeploymentStatus.DEPLOYING);

    try {
      await createSafeIfNeeded();
      await deployAndStartService();
      showNotification?.(`Your agent is running!`);
      setDeploymentStatus(MiddlewareDeploymentStatus.DEPLOYED);

      await delayInSeconds(5);

      await updateStatesSequentially();
    } catch (error) {
      console.error('Error while starting the agent:', error);
      showNotification?.('Some error occurred. Please try again.');
    } finally {
      resumeAllPolling();
    }
  }, [
    masterWallets,
    pauseAllPolling,
    resumeAllPolling,
    setDeploymentStatus,
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
