import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, ButtonProps, Flex, Popover, Typography } from 'antd';
import { useCallback, useMemo } from 'react';

import { Chain, DeploymentStatus } from '@/client';
import { COLOR } from '@/constants/colors';
import { LOW_BALANCE } from '@/constants/thresholds';
import { useBalance } from '@/hooks/useBalance';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { useServiceTemplates } from '@/hooks/useServiceTemplates';
import { useStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useStore } from '@/hooks/useStore';
import { useWallet } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { WalletService } from '@/service/Wallet';
import { getMinimumStakedAmountRequired } from '@/utils/service';

import {
  CannotStartAgent,
  CannotStartAgentDueToUnexpectedError,
} from '../CannotStartAgent';
import { requiredGas, requiredOlas } from '../constants';

const { Text } = Typography;

const LOADING_MESSAGE =
  "Starting the agent may take a while, so feel free to minimize the app. We'll notify you once it's running. Please, don't quit the app.";

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
      <Typography.Text type="secondary" className="text-sm loading-ellipses">
        Agent is working
      </Typography.Text>
    </Flex>
  );
};

const AgentNotRunningButton = () => {
  const { wallets, masterSafeAddress } = useWallet();
  const {
    service,
    serviceStatus,
    setServiceStatus,
    setIsServicePollingPaused,
  } = useServices();
  const { serviceTemplate } = useServiceTemplates();
  const { showNotification } = useElectronApi();
  const {
    setIsPaused: setIsBalancePollingPaused,
    safeBalance,
    totalOlasStakedBalance,
    totalEthBalance,
  } = useBalance();
  const { storeState } = useStore();
  const { isEligibleForStaking, isAgentEvicted } = useStakingContractInfo();

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

    // Mock "DEPLOYING" status (service polling will update this once resumed)
    setServiceStatus(DeploymentStatus.DEPLOYING);

    // Create master safe if it doesn't exist
    try {
      if (!masterSafeAddress) {
        await WalletService.createSafe(Chain.GNOSIS);
      }
    } catch (error) {
      console.error(error);
      setServiceStatus(undefined);
      showNotification?.('Error while creating safe');
      setIsServicePollingPaused(false);
      setIsBalancePollingPaused(false);
      return;
    }

    // Then create / deploy the service
    try {
      await ServicesService.createService({
        serviceTemplate,
        deploy: true,
      });
    } catch (error) {
      console.error(error);
      setServiceStatus(undefined);
      showNotification?.('Error while deploying service');
      setIsServicePollingPaused(false);
      setIsBalancePollingPaused(false);
      return;
    }

    // Show success notification based on whether there was a service prior to starting
    try {
      if (!service) {
        showNotification?.('Your agent is now running!');
      } else {
        const minimumStakedAmountRequired =
          getMinimumStakedAmountRequired(serviceTemplate);

        showNotification?.(
          `Your agent is running and you've staked ${minimumStakedAmountRequired} OLAS!`,
        );
      }
    } catch (error) {
      console.error(error);
      showNotification?.('Error while showing "running" notification');
    }

    // Can assume successful deployment
    // resume polling, optimistically update service status (poll will update, if needed)
    setIsServicePollingPaused(false);
    setIsBalancePollingPaused(false);
    setServiceStatus(DeploymentStatus.DEPLOYED);
  }, [
    wallets,
    setIsServicePollingPaused,
    setIsBalancePollingPaused,
    setServiceStatus,
    masterSafeAddress,
    showNotification,
    serviceTemplate,
    service,
  ]);

  const isDeployable = useMemo(() => {
    // if the agent is NOT running and the balance is too low,
    // user should not be able to start the agent
    const isServiceInactive =
      serviceStatus === DeploymentStatus.BUILT ||
      serviceStatus === DeploymentStatus.STOPPED;
    if (isServiceInactive && safeBalance && safeBalance.ETH < LOW_BALANCE) {
      return false;
    }

    if (serviceStatus === DeploymentStatus.DEPLOYED) return false;
    if (serviceStatus === DeploymentStatus.DEPLOYING) return false;
    if (serviceStatus === DeploymentStatus.STOPPING) return false;

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
    isAgentEvicted,
    isEligibleForStaking,
    safeOlasBalanceWithStaked,
    service,
    serviceStatus,
    storeState?.isInitialFunded,
    totalEthBalance,
    safeBalance,
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

    if (!isEligibleForStaking && isAgentEvicted) return <CannotStartAgent />;

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
