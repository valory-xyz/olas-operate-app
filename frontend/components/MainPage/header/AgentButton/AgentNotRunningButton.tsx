import { Button, ButtonProps } from 'antd';
import { useCallback, useMemo } from 'react';

import { MiddlewareChain, MiddlewareDeploymentStatus } from '@/client';
import { MechType } from '@/config/mechs';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { LOW_MASTER_SAFE_BALANCE } from '@/constants/thresholds';
import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
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

  const { masterWallets } = useMasterWalletContext();
  const {
    selectedService,
    setPaused: setIsServicePollingPaused,
    refetch: updateServicesState,
  } = useServices();

  const { service, deploymentStatus, setDeploymentStatus } = useService(
    selectedService?.service_config_id,
  );

  const {
    setIsPaused: setIsBalancePollingPaused,
    totalStakedOlasBalance,
    totalEthBalance,
    updateBalances,
  } = useBalanceContext();

  const { serviceSafeBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );

  const {
    isAllStakingContractDetailsRecordLoaded,
    setIsPaused: setIsStakingContractInfoPollingPaused,
    refetchActiveStakingContractDetails,
  } = useStakingContractContext();

  const { activeStakingProgramId } = useStakingProgram();

  const { isEligibleForStaking, isAgentEvicted, isServiceStaked } =
    useActiveStakingContractInfo();

  const { hasEnoughServiceSlots } = useActiveStakingContractInfo();

  const requiredStakedOlas =
    service &&
    activeStakingProgramId &&
    STAKING_PROGRAMS[asEvmChainId(service.home_chain)][activeStakingProgramId]
      ?.stakingRequirements[TokenSymbol.OLAS];

  const safeOlasBalance = serviceSafeBalances?.find(
    (walletBalanceResult) => walletBalanceResult.symbol === TokenSymbol.OLAS,
  )?.balance;

  const safeOlasBalanceWithStaked =
    safeOlasBalance === undefined || totalStakedOlasBalance === undefined
      ? undefined
      : safeOlasBalance + totalStakedOlasBalance;

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
    if (!service?.chain_configs[service.home_chain]?.chain_data?.multisig) {
      await WalletService.createSafe(MiddlewareChain.OPTIMISM);
    }
  }, [service]);

  const deployAndStartService = useCallback(async () => {
    if (!activeStakingProgramId) return;

    const middlewareServiceResponse = await ServicesService.createService({
      stakingProgramId: activeStakingProgramId,
      serviceTemplate: SERVICE_TEMPLATES[0], // TODO: support multi-agent, during optimus week
      deploy: true,
      useMechMarketplace:
        STAKING_PROGRAMS[asEvmChainId(SERVICE_TEMPLATES[0].home_chain)][ // TODO: support multi-agent, during optimus week
          activeStakingProgramId
        ].mechType === MechType.Marketplace,
    });

    await ServicesService.startService(
      middlewareServiceResponse.service_config_id,
    );
  }, [activeStakingProgramId]);

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

  const isDeployable = useMemo(() => {
    if (!isAllStakingContractDetailsRecordLoaded) return false;

    const isServiceInactive =
      deploymentStatus === MiddlewareDeploymentStatus.BUILT ||
      deploymentStatus === MiddlewareDeploymentStatus.STOPPED;

    if (isServiceInactive) return false; // TOOD: check if master safe is low balance relative to service's active staking program id

    if (
      [
        MiddlewareDeploymentStatus.DEPLOYED,
        MiddlewareDeploymentStatus.DEPLOYING,
        MiddlewareDeploymentStatus.STOPPING,
      ].some((runningStatus) => deploymentStatus === runningStatus)
    )
      return false;

    if (!requiredStakedOlas || (!hasEnoughServiceSlots && !isServiceStaked))
      return false;

    if (service && storeState?.isInitialFunded) {
      return (safeOlasBalanceWithStaked ?? 0) >= requiredStakedOlas;
    }

    if (isEligibleForStaking && isAgentEvicted) return true;

    return (
      (safeOlasBalanceWithStaked ?? 0) >= requiredStakedOlas &&
      (totalEthBalance ?? 0) > LOW_MASTER_SAFE_BALANCE // TODO: change to service/chain dynamic threshold
    );
  }, [
    isAllStakingContractDetailsRecordLoaded,
    deploymentStatus,
    requiredStakedOlas,
    hasEnoughServiceSlots,
    isServiceStaked,
    service,
    storeState?.isInitialFunded,
    isEligibleForStaking,
    isAgentEvicted,
    safeOlasBalanceWithStaked,
    totalEthBalance,
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
