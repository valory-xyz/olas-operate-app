import { message } from 'antd';
import { useCallback, useMemo } from 'react';

import { MasterEoa, MasterSafe, PAGES } from '@/constants';
import { MiddlewareDeploymentStatusMap } from '@/constants/deployment';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useDeployability } from '@/hooks/useDeployability';
import { useElectronApi } from '@/hooks/useElectronApi';
import { MultisigOwners, useMultisigs } from '@/hooks/useMultisig';
import { usePageState } from '@/hooks/usePageState';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractContext } from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useStartService } from '@/hooks/useStartService';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { WalletService } from '@/service/Wallet';
import { AgentConfig } from '@/types/Agent';
import { delayInSeconds } from '@/utils/delay';
import {
  BACKUP_SIGNER_STATUS,
  getSafeEligibility,
  getSafeEligibilityMessage,
} from '@/utils/safe';

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
  const { startService } = useStartService();

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

    pauseAllPolling();
    overrideSelectedServiceStatus(MiddlewareDeploymentStatusMap.DEPLOYING);

    try {
      await startService({
        agentType: selectedAgentType,
        agentConfig: selectedAgentConfig,
        service,
        stakingProgramId: selectedStakingProgramId,
        createServiceIfMissing: true,
        createSafeIfNeeded: () =>
          createSafeIfNeeded({
            masterSafes,
            masterSafesOwners,
            masterEoa,
            selectedAgentConfig,
            gotoSettings: () => gotoPage(PAGES.Settings),
          }),
      });
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
    gotoPage,
    showNotification,
    updateStatesSequentially,
    selectedAgentType,
    service,
    startService,
  ]);

  return { isLoading, isDeployable, handleStart };
};
