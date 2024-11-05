import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, ButtonProps, Flex, Popover, Tooltip, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { Chain, DeploymentStatus } from '@/client';
import { COLOR } from '@/constants/colors';
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
import { getMinimumStakedAmountRequired } from '@/utils/service';

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
    setServiceStatus(DeploymentStatus.STOPPING);
    try {
      await ServicesService.stopDeployment(service.hash);
    } catch (error) {
      console.error(error);
      showNotification?.('Some error occurred while stopping agent');
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
    hasEnoughServiceSlots,
  } = useStakingContractInfo();
  const { activeStakingProgramId, defaultStakingProgramId } =
    useStakingProgram();

  // const minStakingDeposit =
  //   stakingContractInfoRecord?.[activeStakingProgram ?? defaultStakingProgram]
  //     ?.minStakingDeposit;

  const requiredOlas = getMinimumStakedAmountRequired(
    serviceTemplate,
    activeStakingProgramId ?? defaultStakingProgramId,
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
    setServiceStatus(DeploymentStatus.DEPLOYING);

    // Get the active staking program id; default id if there's no agent yet
    const stakingProgramId: StakingProgramId =
      activeStakingProgramId ?? defaultStakingProgramId;

    // Create master safe if it doesn't exist
    try {
      if (!masterSafeAddress) {
        await WalletService.createSafe(Chain.GNOSIS);
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
        useMechMarketplace:
          stakingProgramId === StakingProgramId.BetaMechMarketplace,
      });
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
    setServiceStatus(DeploymentStatus.DEPLOYED);

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
    defaultStakingProgramId,
    serviceTemplate,
    updateServicesState,
    updateActiveStakingContractInfo,
    updateBalances,
  ]);

  const isDeployable = useMemo(() => {
    // if the agent is NOT running and the balance is too low,
    // user should not be able to start the agent
    const isServiceInactive =
      serviceStatus === DeploymentStatus.BUILT ||
      serviceStatus === DeploymentStatus.STOPPED;
    if (isServiceInactive && isLowBalance) {
      return false;
    }

    if (serviceStatus === DeploymentStatus.DEPLOYED) return false;
    if (serviceStatus === DeploymentStatus.DEPLOYING) return false;
    if (serviceStatus === DeploymentStatus.STOPPING) return false;

    if (!requiredOlas) return false;

    // If no slots available, agent cannot be started
    if (!hasEnoughServiceSlots) return false;

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
    hasEnoughServiceSlots,
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

    if (serviceStatus === DeploymentStatus.STOPPING) {
      return <AgentStoppingButton />;
    }

    if (serviceStatus === DeploymentStatus.DEPLOYING) {
      return <AgentStartingButton />;
    }

    if (serviceStatus === DeploymentStatus.DEPLOYED) {
      return <AgentRunningButton />;
    }

    if (!isEligibleForStaking && isAgentEvicted)
      return <CannotStartAgentPopover />;

    if (
      !service ||
      serviceStatus === DeploymentStatus.STOPPED ||
      serviceStatus === DeploymentStatus.CREATED ||
      serviceStatus === DeploymentStatus.BUILT ||
      serviceStatus === DeploymentStatus.DELETED
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
