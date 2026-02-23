import { message } from 'antd';
import { useCallback, useMemo } from 'react';

import { MechType } from '@/config/mechs';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { MasterEoa, MasterSafe, PAGES } from '@/constants';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useDeployability } from '@/hooks/useDeployability';
import { useElectronApi } from '@/hooks/useElectronApi';
import { MultisigOwners, useMultisigs } from '@/hooks/useMultisig';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import { AgentConfig } from '@/types/Agent';
import { delayInSeconds } from '@/utils/delay';
import {
  BACKUP_SIGNER_STATUS,
  getSafeEligibility,
  getSafeEligibilityMessage,
} from '@/utils/safe';
import { updateServiceIfNeeded } from '@/utils/service';

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
  const eligibility = getSafeEligibility({
    chainId: selectedAgentConfig.evmHomeChainId,
    masterSafes,
    masterSafesOwners,
    masterEoa,
  });

  if (eligibility.status === BACKUP_SIGNER_STATUS.HasSafe) return;

  if (
    !eligibility.canProceed ||
    !eligibility.shouldCreateSafe ||
    !eligibility.backupOwner
  ) {
    message.error(getSafeEligibilityMessage(eligibility.status));
    gotoSettings();
    throw new Error('Safe eligibility failed');
  }

  await WalletService.createSafe(
    selectedAgentConfig.middlewareHomeChainId,
    eligibility.backupOwner,
  );
};

/**
 * hook to handle service deployment and starting the service
 */
export const useServiceDeployment = () => {
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
  const serviceId = selectedService?.service_config_id;
  const { service, isServiceRunning } = useService(serviceId);

  const { setIsPaused: setIsBalancePollingPaused, updateBalances } =
    useBalanceContext();

  // Staking contract details
  const {
    isAllStakingContractDetailsRecordLoaded,
    setIsPaused: setIsStakingContractInfoPollingPaused,
    refetchSelectedStakingContractDetails: refetchActiveStakingContractDetails,
  } = useStakingContractContext();
  const { selectedStakingProgramId } = useStakingProgram();
  const { masterSafesOwners } = useMultisigs(masterSafes);

  const isLoading = useMemo(() => {
    if (isServicesLoading || isServiceRunning) return true;
    if (!isAllStakingContractDetailsRecordLoaded) return true;
    return false;
  }, [
    isAllStakingContractDetailsRecordLoaded,
    isServiceRunning,
    isServicesLoading,
  ]);

  const deployability = useDeployability();
  const isDeployable = deployability.canRun && !isLoading;

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
    overrideSelectedServiceStatus(MiddlewareDeploymentStatusMap.DEPLOYING);

    try {
      await createSafeIfNeeded({
        masterSafes,
        masterSafesOwners,
        masterEoa,
        selectedAgentConfig,
        gotoSettings: () => gotoPage(PAGES.Settings),
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

    overrideSelectedServiceStatus(MiddlewareDeploymentStatusMap.DEPLOYED);
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

  return { isLoading, isDeployable, handleStart };
};
