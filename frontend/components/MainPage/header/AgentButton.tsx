import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, ButtonProps, Flex, Popover, Tooltip, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { MiddlewareChain, MiddlewareDeploymentStatus } from '@/client';
import { COLOR } from '@/constants/colors';
import { DEFAULT_STAKING_PROGRAM_ID } from '@/context/StakingProgramProvider';
import { ChainId } from '@/enums/Chain';
import { StakingProgramId } from '@/enums/StakingProgram';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useReward } from '@/hooks/useReward';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { useStore } from '@/hooks/useStore';
import { useWallet } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import { delayInSeconds } from '@/utils/delay';

import {
  CannotStartAgentDueToUnexpectedError,
  CannotStartAgentPopover,
} from './CannotStartAgentPopover';
import { requiredGas } from './constants';
import { LastTransaction } from './LastTransaction';

const { Text, Paragraph } = Typography;

const LOADING_MESSAGE =
  "Starting the agent may take a while, so feel free to minimize the app. We'll notify you once it's running. Please, don't quit the app.";

const IdleTooltip = () => (
  <Tooltip
    placement="bottom"
    arrow={false}
    title={
      <Paragraph className="text-sm m-0">
        Your agent earned rewards for this epoch, so decided to stop working
        until the next epoch.
      </Paragraph>
    }
  >
    <InfoCircleOutlined />
  </Tooltip>
);

const AgentStartingButton = () => (
  <Popover
    trigger={['hover', 'click']}
    placement="bottomLeft"
    showArrow={false}
    content={
      <Flex vertical={false} gap={8} style={{ maxWidth: 260 }}>
        <Text>
          <InfoCircleOutlined style={{ color: COLOR.BLUE }} />
        </Text>
        <Text>{LOADING_MESSAGE}</Text>
      </Flex>
    }
  >
    <Button type="default" size="large" ghost disabled loading>
      Starting...
    </Button>
  </Popover>
);

const AgentStoppingButton = () => (
  <Button type="default" size="large" ghost disabled loading>
    Stopping...
  </Button>
);

const AgentRunningButton = () => {
  const { showNotification } = useElectronApi();
  const { isEligibleForRewards } = useReward();
  const { service, setIsServicePollingPaused, setServiceStatus } =
    useServices();

  const handlePause = useCallback(async () => {
    if (!service) return;
    // Paused to stop overlapping service poll while waiting for response
    setIsServicePollingPaused(true);

    // Optimistically update service status
    setServiceStatus(MiddlewareDeploymentStatus.STOPPING);
    try {
      await ServicesService.stopDeployment(service.service_config_id);
    } catch (error) {
      console.error(error);
      showNotification?.('Error while stopping agent');
    } finally {
      // Resume polling, will update to correct status regardless of success
      setIsServicePollingPaused(false);
    }
  }, [service, setIsServicePollingPaused, setServiceStatus, showNotification]);

  return (
    <Flex gap={10} align="center">
      <Button type="default" size="large" onClick={handlePause}>
        Pause
      </Button>

      <Flex vertical>
        {isEligibleForRewards ? (
          <Text type="secondary" className="text-sm">
            Agent is idle&nbsp;
            <IdleTooltip />
          </Text>
        ) : (
          <Text type="secondary" className="text-sm loading-ellipses">
            Agent is working
          </Text>
        )}
        <LastTransaction />
      </Flex>
    </Flex>
  );
};

/** Button used to start / deploy the agent */
const AgentNotRunningButton = () => {
  const { wallets, masterSafeAddress } = useWallet();
  const {
    service,
    serviceStatus,
    setServiceStatus,
    setIsServicePollingPaused,
    updateServicesState,
  } = useServices();
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
    isEligibleForStaking,
    isAgentEvicted,
    setIsPaused: setIsStakingContractInfoPollingPaused,
    updateActiveStakingContractInfo,
  } = useStakingContractInfo();
  const { activeStakingProgramId } = useStakingProgram();

  // const minStakingDeposit =
  //   stakingContractInfoRecord?.[activeStakingProgram ?? defaultStakingProgram]
  //     ?.minStakingDeposit;

  const requiredOlas = getMinimumStakedAmountRequired(
    serviceTemplate,
    activeStakingProgramId ?? DEFAULT_STAKING_PROGRAM_ID,
  );

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
    setServiceStatus(MiddlewareDeploymentStatus.DEPLOYING);

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
      showNotification?.('Error while creating safe');
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
      showNotification?.('Error while deploying service');
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
      showNotification?.('Error while showing "running" notification');
    }

    // Can assume successful deployment
    setServiceStatus(MiddlewareDeploymentStatus.DEPLOYED);

    // TODO: remove this workaround, middleware should respond when agent is staked & confirmed running after `createService` call
    await delayInSeconds(5);

    // update provider states sequentially
    // service id is required before activeStakingContractInfo & balances can be updated
    try {
      await updateServicesState(); // reload the available services
      await updateActiveStakingContractInfo(); // reload active staking contract with new service
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
    setServiceStatus,
    masterSafeAddress,
    showNotification,
    activeStakingProgramId,
    serviceTemplate,
    updateServicesState,
    updateActiveStakingContractInfo,
    updateBalances,
  ]);

  const isDeployable = useMemo(() => {
    // if the agent is NOT running and the balance is too low,
    // user should not be able to start the agent
    const isServiceInactive =
      serviceStatus === MiddlewareDeploymentStatus.BUILT ||
      serviceStatus === MiddlewareDeploymentStatus.STOPPED;
    if (isServiceInactive && isLowBalance) {
      return false;
    }

    if (serviceStatus === MiddlewareDeploymentStatus.DEPLOYED) return false;
    if (serviceStatus === MiddlewareDeploymentStatus.DEPLOYING) return false;
    if (serviceStatus === MiddlewareDeploymentStatus.STOPPING) return false;

    if (!requiredOlas) return false;

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
    serviceStatus,
    service,
    storeState?.isInitialFunded,
    isEligibleForStaking,
    isAgentEvicted,
    safeOlasBalanceWithStaked,
    requiredOlas,
    totalEthBalance,
    isLowBalance,
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

export const AgentButton = () => {
  const { service, serviceStatus, hasInitialLoaded } = useServices();
  const { isEligibleForStaking, isAgentEvicted } = useStakingContractInfo();

  return useMemo(() => {
    if (!hasInitialLoaded) {
      return <Button type="primary" size="large" disabled loading />;
    }

    if (serviceStatus === MiddlewareDeploymentStatus.STOPPING) {
      return <AgentStoppingButton />;
    }

    if (serviceStatus === MiddlewareDeploymentStatus.DEPLOYING) {
      return <AgentStartingButton />;
    }

    if (serviceStatus === MiddlewareDeploymentStatus.DEPLOYED) {
      return <AgentRunningButton />;
    }

    if (!isEligibleForStaking && isAgentEvicted)
      return <CannotStartAgentPopover />;

    if (
      !service ||
      serviceStatus === MiddlewareDeploymentStatus.STOPPED ||
      serviceStatus === MiddlewareDeploymentStatus.CREATED ||
      serviceStatus === MiddlewareDeploymentStatus.BUILT ||
      serviceStatus === MiddlewareDeploymentStatus.DELETED
    ) {
      return <AgentNotRunningButton />;
    }

    return <CannotStartAgentDueToUnexpectedError />;
  }, [
    hasInitialLoaded,
    serviceStatus,
    isEligibleForStaking,
    isAgentEvicted,
    service,
  ]);
};
