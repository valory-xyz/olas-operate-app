import { Button, ButtonProps } from 'antd';
import { useCallback, useMemo } from 'react';

import { MiddlewareChain, MiddlewareDeploymentStatus } from '@/client';
import { STAKING_PROGRAMS } from '@/config/stakingPrograms';
import { DEFAULT_STAKING_PROGRAM_ID } from '@/context/StakingProgramProvider';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import {
  useActiveStakingContractInfo,
  useStakingContractContext,
  useStakingContractDetails,
} from '@/hooks/useStakingContractDetails';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useStore } from '@/hooks/useStore';
import { useWallet } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import { delayInSeconds } from '@/utils/delay';

/** Button used to start / deploy the agent */
export const AgentNotRunningButton = () => {
  const { wallets, masterSafeAddress } = useWallet();

  const {
    selectedService,
    setPaused: setIsServicePollingPaused,
    isFetched: isLoaded,
    refetch: updateServicesState,
  } = useServices();

  const { service, deploymentStatus, setDeploymentStatus } = useService({
    serviceConfigId:
      isLoaded && selectedService ? selectedService?.service_config_id : '',
  });

  const { serviceTemplate } = useServiceTemplates();
  const { showNotification } = useElectronApi();
  const {
    setIsPaused: setIsBalancePollingPaused,
    masterSafeBalance: safeBalance,
    isLowBalance,
    totalOlasStakedBalance,
    totalEthBalance,
    updateBalances,
  } = useBalance();
  const { storeState } = useStore();

  const {
    isAllStakingContractDetailsRecordLoaded,
    setIsPaused: setIsStakingContractInfoPollingPaused,
    refetchActiveStakingContractDetails,
  } = useStakingContractContext();

  const { activeStakingProgramId, defaultStakingProgramId } =
    useStakingProgram();

  const { isEligibleForStaking, isAgentEvicted, isServiceStaked } =
    useActiveStakingContractInfo();

  const { hasEnoughServiceSlots } = useStakingContractDetails(
    activeStakingProgramId ?? defaultStakingProgramId,
  );

  // const minStakingDeposit =
  //   allStakingContractDetailsRecord?.[activeStakingProgram ?? defaultStakingProgram]
  //     ?.minStakingDeposit;

  const requiredOlas =
    STAKING_PROGRAMS[activeStakingProgramId]?.minStakingDeposit; // TODO: fix activeStakingProgramId

  const safeOlasBalance = safeBalance?.OLAS;
  const safeOlasBalanceWithStaked =
    safeOlasBalance === undefined || totalOlasStakedBalance === undefined
      ? undefined
      : safeOlasBalance + totalOlasStakedBalance;

  const handleStart = useCallback(async () => {
    // Must have a wallet to start the agent
    if (!wallets?.[0]) return;

    // Paused to stop overlapping service poll while wallet is created or service is built
    setIsServicePollingPaused(true);

    // Paused to stop confusing balance transitions while starting the agent
    setIsBalancePollingPaused(true);

    // Paused to stop overlapping staking contract info poll while starting the agent
    setIsStakingContractInfoPollingPaused(true);

    // Mock "DEPLOYING" status (service polling will update this once resumed)
    setDeploymentStatus(MiddlewareDeploymentStatus.DEPLOYING);

    // Get the active staking program id; default id if there's no agent yet
    const stakingProgramId: StakingProgramId =
      activeStakingProgramId ?? DEFAULT_STAKING_PROGRAM_ID;

    // Create master safe if it doesn't exist
    try {
      if (!masterSafeAddress) {
        await WalletService.createSafe(MiddlewareChain.OPTIMISM);
      }
    } catch (error) {
      console.error(error);
      setServiceStatus(undefined);
      showNotification?.('Some error occurred while creating safe');
      setIsStakingContractInfoPollingPaused(false);
      setIsServicePollingPaused(false);
      setIsBalancePollingPaused(false);
      return;
    }

    // Then create / deploy the service
    try {
      await ServicesService.createService({
        stakingProgramId,
        serviceTemplate,
        deploy: true,
        useMechMarketplace: false,
        chainId: ChainId.Gnosis, // TODO: Add support for other chains
      });

      await ServicesService.startService(serviceTemplate.service_config_id);
    } catch (error) {
      console.error(error);
      setServiceStatus(undefined);
      showNotification?.('Some error occurred while deploying service');
      setIsServicePollingPaused(false);
      setIsBalancePollingPaused(false);
      setIsStakingContractInfoPollingPaused(false);
      return;
    }

    // Show success notification based on whether there was a service prior to starting
    try {
      showNotification?.(`Your agent is running!`);
    } catch (error) {
      console.error(error);
      showNotification?.(
        'Some error occurred while showing "running" notification',
      );
    }

    // Can assume successful deployment
    setDeploymentStatus(MiddlewareDeploymentStatus.DEPLOYED);

    // TODO: remove this workaround, middleware should respond when agent is staked & confirmed running after `createService` call
    await delayInSeconds(5);

    // update provider states sequentially
    // service id is required before activeStakingContractDetails & balances can be updated
    try {
      await updateServicesState?.(); // reload the available services
      await refetchActiveStakingContractDetails(); // reload active staking contract with new service
      await updateBalances(); // reload the balances
    } catch (error) {
      console.error(error);
    } finally {
      // resume polling
      setIsServicePollingPaused(false);
      setIsStakingContractInfoPollingPaused(false);
      setIsBalancePollingPaused(false);
    }
  }, [
    wallets,
    setIsServicePollingPaused,
    setIsBalancePollingPaused,
    setIsStakingContractInfoPollingPaused,
    setDeploymentStatus,
    masterSafeAddress,
    showNotification,
    activeStakingProgramId,
    serviceTemplate,
    updateServicesState,
    refetchActiveStakingContractDetails,
    updateBalances,
  ]);

  const isDeployable = useMemo(() => {
    if (!isAllStakingContractDetailsRecordLoaded) return false;

    // if the agent is NOT running and the balance is too low,
    // user should not be able to start the agent
    const isServiceInactive =
      deploymentStatus === MiddlewareDeploymentStatus.BUILT ||
      deploymentStatus === MiddlewareDeploymentStatus.STOPPED;
    if (isServiceInactive && isLowBalance) {
      return false;
    }

    if (deploymentStatus === MiddlewareDeploymentStatus.DEPLOYED) return false;
    if (deploymentStatus === MiddlewareDeploymentStatus.DEPLOYING) return false;
    if (deploymentStatus === MiddlewareDeploymentStatus.STOPPING) return false;

    if (!requiredOlas) return false;

    // If no slots available, agent cannot be started
    if (!hasEnoughServiceSlots && !isServiceStaked) return false;

    // case where service exists & user has initial funded
    if (service && storeState?.isInitialFunded) {
      if (!safeOlasBalanceWithStaked) return false;
      // at present agent will always require staked/bonded OLAS (or the ability to stake/bond)
      return safeOlasBalanceWithStaked >= requiredOlas;
    }

    // case if agent is evicted and user has met the staking criteria
    if (isEligibleForStaking && isAgentEvicted) return true;

    const hasEnoughOlas = (safeOlasBalanceWithStaked ?? 0) >= requiredOlas;
    const hasEnoughEth = (totalEthBalance ?? 0) > requiredGas;

    return hasEnoughOlas && hasEnoughEth;
  }, [
    isAllStakingContractDetailsRecordLoaded,
    deploymentStatus,
    isLowBalance,
    requiredOlas,
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
