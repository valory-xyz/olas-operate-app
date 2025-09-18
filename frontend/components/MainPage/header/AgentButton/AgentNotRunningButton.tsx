import { Button, message } from 'antd';
import { isNil } from 'lodash';
import { useCallback, useMemo } from 'react';

import { MiddlewareDeploymentStatus } from '@/client';
import { MechType } from '@/config/mechs';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { Pages } from '@/enums/Pages';
import { MasterEoa, MasterSafe } from '@/enums/Wallet';
import { useBalanceAndRefillRequirementsContext } from '@/hooks/useBalanceAndRefillRequirementsContext';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useElectronApi } from '@/hooks/useElectronApi';
import { MultisigOwners, useMultisigs } from '@/hooks/useMultisig';
import { useNeedsFunds } from '@/hooks/useNeedsFunds';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useSharedContext } from '@/hooks/useSharedContext';
import {
  useActiveStakingContractDetails,
  useStakingContractContext,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import { AgentConfig } from '@/types/Agent';
import { delayInSeconds } from '@/utils/delay';
import { updateServiceIfNeeded } from '@/utils/service';

/**
 * hook to handle service deployment and starting the service
 */
const useServiceDeployment = () => {
  const { showNotification } = useElectronApi();
  const { isAgentsFunFieldUpdateRequired } = useSharedContext();

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
  const serviceId = selectedService?.service_config_id;

  const { canStartAgent, isBalancesAndFundingRequirementsLoading } =
    useBalanceAndRefillRequirementsContext();
  const { service, isServiceRunning } = useService(serviceId);

  const { setIsPaused: setIsBalancePollingPaused, updateBalances } =
    useBalanceContext();

  // Staking contract details
  const {
    isAllStakingContractDetailsRecordLoaded,
    setIsPaused: setIsStakingContractInfoPollingPaused,
    refetchSelectedStakingContractDetails: refetchActiveStakingContractDetails,
  } = useStakingContractContext();
  const { selectedStakingProgramId, selectedStakingProgramMeta } =
    useStakingProgram();
  const {
    isEligibleForStaking,
    isAgentEvicted,
    isServiceStaked,
    hasEnoughServiceSlots,
  } = useActiveStakingContractDetails();

  const { masterSafesOwners } = useMultisigs(masterSafes);

  const { isInitialFunded, needsInitialFunding } = useNeedsFunds(
    selectedStakingProgramId,
  );

  const isDeployable = useMemo(() => {
    if (isBalancesAndFundingRequirementsLoading) return false;
    if (isServicesLoading || isServiceRunning) return false;

    if (!isAllStakingContractDetailsRecordLoaded) return false;

    // If service is under construction and does NOT have external funds, return false
    if (
      selectedAgentConfig.isUnderConstruction &&
      !selectedAgentConfig.hasExternalFunds
    )
      return false;

    // If staking contract is deprecated, return false
    if (selectedStakingProgramMeta?.deprecated) return false;

    // If not enough service slots, and service is not staked, return false
    const hasSlot = !isNil(hasEnoughServiceSlots) && !hasEnoughServiceSlots;
    if (hasSlot && !isServiceStaked) return false;

    // If was evicted and can't re-stake - return false
    if (isAgentEvicted && !isEligibleForStaking) return false;

    // if there's no service created, check if initially funded
    // TODO: should create dummy service instead (for trader)
    // and rely on canStartAgent
    if (!selectedService && isInitialFunded) return !needsInitialFunding;

    // agent specific checks
    // If the agentsFun field update is not completed, can't start the agent
    if (isAgentsFunFieldUpdateRequired) return false;

    // allow starting based on refill requirements
    return canStartAgent;
  }, [
    isBalancesAndFundingRequirementsLoading,
    isServicesLoading,
    isServiceRunning,
    isAllStakingContractDetailsRecordLoaded,
    selectedAgentConfig.isUnderConstruction,
    selectedAgentConfig.name,
    selectedStakingProgramMeta?.deprecated,
    hasEnoughServiceSlots,
    isServiceStaked,
    isAgentEvicted,
    isEligibleForStaking,
    selectedService,
    isInitialFunded,
    needsInitialFunding,
    isAgentsFunFieldUpdateRequired,
    canStartAgent,
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
        middlewareServiceResponse = await ServicesService.createService({
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

    // Update the existing service
    if (!middlewareServiceResponse && service) {
      await updateServiceIfNeeded(service, selectedAgentType);
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

  const buttonText = `Start agent ${isServiceStaked ? '' : '& stake'}`;

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
    ({ evmChainId }) => evmChainId === selectedAgentConfig.evmHomeChainId,
  );

  if (selectedChainHasMasterSafe) return;

  // 1. get safe owners on other chains
  const otherChainOwners = new Set(
    masterSafesOwners
      ?.filter(
        ({ evmChainId }) => evmChainId !== selectedAgentConfig.evmHomeChainId,
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
