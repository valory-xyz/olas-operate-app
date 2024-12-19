import { Button, message } from 'antd';
import { isNil, sum } from 'lodash';
import { useCallback, useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { CHAIN_CONFIG } from '@/config/chains';
import { MechType } from '@/config/mechs';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { Pages } from '@/enums/Pages';
import { TokenSymbol } from '@/enums/Token';
import {
  MasterEoa,
  MasterSafe,
  WalletOwnerType,
  WalletType,
} from '@/enums/Wallet';
import {
  useBalanceContext,
  useMasterBalances,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { MultisigOwners, useMultisigs } from '@/hooks/useMultisig';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import {
  useActiveStakingContractDetails,
  useStakingContractContext,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useStore } from '@/hooks/useStore';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import { AgentConfig } from '@/types/Agent';
import { delayInSeconds } from '@/utils/delay';

const useServiceDeployment = () => {
  const { storeState } = useStore();
  const { showNotification } = useElectronApi();

  const { goto: gotoPage } = usePageState();

  const { masterWallets, masterSafes, masterEoa } = useMasterWalletContext();
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

  const { setIsPaused: setIsBalancePollingPaused, updateBalances } =
    useBalanceContext();

  const { serviceStakedBalances, serviceSafeBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );

  const serviceStakedOlasBalancesOnHomeChain = serviceStakedBalances?.find(
    (stakedBalance) =>
      stakedBalance.evmChainId === selectedAgentConfig.evmHomeChainId,
  );

  const serviceTotalStakedOlas = sum([
    serviceStakedOlasBalancesOnHomeChain?.olasBondBalance,
    serviceStakedOlasBalancesOnHomeChain?.olasDepositBalance,
  ]);

  const serviceOlasBalanceOnHomeChain = serviceSafeBalances?.find(
    (balance) => balance.evmChainId === selectedAgentConfig.evmHomeChainId,
  )?.balance;

  const { masterSafeBalances, masterSafeNativeGasBalance } =
    useMasterBalances();

  const {
    isAllStakingContractDetailsRecordLoaded,
    setIsPaused: setIsStakingContractInfoPollingPaused,
    refetchSelectedStakingContractDetails: refetchActiveStakingContractDetails,
  } = useStakingContractContext();

  const { selectedStakingProgramId } = useStakingProgram();

  const { isEligibleForStaking, isAgentEvicted, isServiceStaked } =
    useActiveStakingContractDetails();

  const { hasEnoughServiceSlots } = useActiveStakingContractDetails();

  const { masterSafesOwners } = useMultisigs(masterSafes);

  const requiredStakedOlas =
    selectedStakingProgramId &&
    STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
      selectedStakingProgramId
    ]?.stakingRequirements[TokenSymbol.OLAS];

  const serviceSafeOlasWithStaked = sum([
    serviceOlasBalanceOnHomeChain,
    serviceTotalStakedOlas,
  ]);

  const isDeployable = useMemo(() => {
    if (
      isServicesLoading ||
      isServiceRunning ||
      !isAllStakingContractDetailsRecordLoaded
    ) {
      return false;
    }

    if (isNil(requiredStakedOlas)) return false;

    if (
      !isNil(hasEnoughServiceSlots) &&
      !hasEnoughServiceSlots &&
      !isServiceStaked
    ) {
      return false;
    }

    const masterSafeOlasBalance = masterSafeBalances?.find(
      (walletBalanceResult) =>
        walletBalanceResult.symbol === TokenSymbol.OLAS &&
        walletBalanceResult.evmChainId === selectedAgentConfig.evmHomeChainId,
    )?.balance;

    const isInitialFunded = storeState?.[selectedAgentType]?.isInitialFunded;
    if (service && isInitialFunded && isServiceStaked) {
      return (serviceTotalStakedOlas ?? 0) >= requiredStakedOlas;
    }

    // If was evicted, but can re-stake - unlock the button
    if (isAgentEvicted && isEligibleForStaking) return true;

    // threshold check
    const masterThresholds =
      selectedAgentConfig.operatingThresholds[WalletOwnerType.Master];
    const tokenSymbol =
      CHAIN_CONFIG[selectedAgentConfig.evmHomeChainId].nativeToken.symbol;

    const safeThreshold = masterThresholds[WalletType.Safe][tokenSymbol];

    // SERVICE IS STAKED, AND STARTING AGAIN
    if (isServiceStaked) {
      const hasEnoughOlas = serviceSafeOlasWithStaked >= requiredStakedOlas;

      const hasEnoughNativeGas =
        (masterSafeNativeGasBalance ?? 0) > safeThreshold;
      return hasEnoughNativeGas && hasEnoughOlas;
    }

    // SERVICE IS NOT STAKED AND/OR IS STARTING FOR THE FIRST TIME
    const totalOlasStakedAndInSafes = sum([
      serviceOlasBalanceOnHomeChain,
      serviceTotalStakedOlas,
      masterSafeOlasBalance,
    ]);

    const hasEnoughForInitialDeployment =
      (totalOlasStakedAndInSafes ?? 0) >= requiredStakedOlas &&
      (masterSafeNativeGasBalance ?? 0) >= safeThreshold;

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
    storeState,
    selectedAgentType,
    isAgentEvicted,
    isEligibleForStaking,
    selectedAgentConfig.operatingThresholds,
    selectedAgentConfig.evmHomeChainId,
    serviceOlasBalanceOnHomeChain,
    serviceTotalStakedOlas,
    masterSafeNativeGasBalance,
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
    }

    // Update the service if the hash is different
    if (!middlewareServiceResponse && service) {
      if (service.hash !== serviceTemplate.hash) {
        await ServicesService.updateService({
          serviceConfigId: service.service_config_id,
          stakingProgramId: selectedStakingProgramId,
          // chainId: selectedAgentConfig.evmHomeChainId,
          serviceTemplate,
          deploy: false, // TODO: deprecated will remove
          useMechMarketplace:
            STAKING_PROGRAMS[selectedAgentConfig.evmHomeChainId][
              selectedStakingProgramId
            ].mechType === MechType.Marketplace,
        });
      }
    }

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
    if (!selectedStakingProgramId) {
      throw new Error('Staking program ID required');
    }

    const selectedServiceTemplate = SERVICE_TEMPLATES.find(
      (template) => template.agentType === selectedAgentType,
    );
    if (!selectedServiceTemplate) throw new Error('Service template required');

    pauseAllPolling();
    overrideSelectedServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);

    try {
      await createSafeIfNeeded({
        masterSafes,
        masterSafesOwners,
        masterEoa,
        selectedAgentConfig,
        gotoSettings: () => gotoPage(Pages.Settings),
      });
      await deployAndStartService();
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
    masterSafes,
    masterSafesOwners,
    masterEoa,
    selectedAgentConfig,
    deployAndStartService,
    gotoPage,
    showNotification,
    updateStatesSequentially,
    selectedAgentType,
  ]);

  const buttonText = `Start agent ${service ? '' : '& stake'}`;

  return { isDeployable, handleStart, buttonText };
};

const createSafeIfNeeded = async ({
  masterSafes,
  masterSafesOwners,
  masterEoa,
  selectedAgentConfig,
  gotoSettings,
}: {
  selectedAgentConfig: AgentConfig;
  gotoSettings: () => void;
  masterEoa?: MasterEoa;
  masterSafes?: MasterSafe[];
  masterSafesOwners?: MultisigOwners[];
}) => {
  const selectedChainHasMasterSafe = masterSafes?.some(
    (masterSafe) =>
      masterSafe.evmChainId === selectedAgentConfig.evmHomeChainId,
  );

  if (selectedChainHasMasterSafe) return;

  // 1. get safe owners on other chains
  const otherChainOwners = new Set(
    masterSafesOwners
      ?.filter(
        (masterSafe) =>
          masterSafe.evmChainId !== selectedAgentConfig.evmHomeChainId,
      )
      .map((masterSafe) => masterSafe.owners)
      .flat(),
  );

  // 2. remove master eoa from the set, to find backup signers
  if (masterEoa) otherChainOwners.delete(masterEoa?.address);

  // 3. if there are no signers, the user needs to add a backup signer

  if (otherChainOwners.size <= 0) {
    message.error(
      'A backup signer is required to create a new safe on the home chain. Please add a backup signer.',
    );
    gotoSettings();
    throw new Error('No backup signers found');
  }

  if (otherChainOwners.size !== 1) {
    message.error(
      'The same backup signer address must be used on all chains. Please remove any extra backup signers.',
    );
    gotoSettings();
    throw new Error('Multiple backup signers found');
  }

  // 4. otherwise, create a new safe with the same signer
  await WalletService.createSafe(
    selectedAgentConfig.middlewareHomeChainId,
    [...otherChainOwners][0],
  );
};

/**
 * Agent Not Running Button
 */
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
