import { InfoCircleOutlined } from '@ant-design/icons';
import { Badge, Button, Flex, Popover, Typography } from 'antd';
import { formatUnits } from 'ethers/lib/utils';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Chain, DeploymentStatus } from '@/client';
import { setTrayIcon } from '@/common-util';
import { COLOR, LOW_BALANCE, SERVICE_TEMPLATES } from '@/constants';
import { useBalance, useServiceTemplates } from '@/hooks';
import { useServices } from '@/hooks/useServices';
import { useWallet } from '@/hooks/useWallet';
import { ServicesService } from '@/service';
import { WalletService } from '@/service/Wallet';

const { Text } = Typography;

const LOADING_MESSAGE =
  "It may take a while to start your agent, so feel free to close the app. We'll notify you once your agent is running.";

enum ServiceButtonLoadingState {
  Starting,
  Pausing,
  NotLoading,
}

export const MainHeader = () => {
  const { services, serviceStatus, setServiceStatus } = useServices();
  const { getServiceTemplates } = useServiceTemplates();
  const { wallets, masterSafeAddress } = useWallet();
  const {
    totalOlasBalance,
    totalEthBalance,
    setIsPaused: setIsBalancePollingPaused,
  } = useBalance();

  const [serviceButtonState, setServiceButtonState] =
    useState<ServiceButtonLoadingState>(ServiceButtonLoadingState.NotLoading);

  const serviceTemplate = useMemo(
    () => getServiceTemplates()[0],
    [getServiceTemplates],
  );

  useEffect(() => {
    if (totalEthBalance && totalEthBalance < LOW_BALANCE) {
      setTrayIcon('low-gas');
    } else if (serviceStatus === DeploymentStatus.DEPLOYED) {
      setTrayIcon('running');
    } else if (serviceStatus === DeploymentStatus.STOPPED) {
      setTrayIcon('paused');
    }
  }, [totalEthBalance, serviceStatus]);

  const agentHead = useMemo(() => {
    if (
      serviceButtonState === ServiceButtonLoadingState.Starting ||
      serviceButtonState === ServiceButtonLoadingState.Pausing
    )
      return (
        <Badge status="processing" color="orange" dot offset={[-5, 32.5]}>
          <Image
            src="/happy-robot.svg"
            alt="Happy Robot"
            width={40}
            height={40}
          />
        </Badge>
      );
    if (serviceStatus === DeploymentStatus.DEPLOYED)
      return (
        <Badge status="processing" color="green" dot offset={[-5, 32.5]}>
          <Image
            src="/happy-robot.svg"
            alt="Happy Robot"
            width={40}
            height={40}
          />
        </Badge>
      );
    return (
      <Badge dot offset={[-5, 32.5]}>
        <Image src="/sad-robot.svg" alt="Sad Robot" width={40} height={40} />
      </Badge>
    );
  }, [serviceButtonState, serviceStatus]);

  const handleStart = useCallback(async () => {
    if (!wallets?.[0]) return;

    setServiceButtonState(ServiceButtonLoadingState.Starting);
    setIsBalancePollingPaused(true);

    try {
      if (!masterSafeAddress) {
        await WalletService.createSafe(Chain.GNOSIS);
      }
      // TODO: Replace with proper upload logic
      // if (services.length > 0) {
      //   return ServicesService.startDeployment(services[0].hash).then(() => {
      //     setServiceStatus(DeploymentStatus.DEPLOYED);
      //     setIsBalancePollingPaused(false);
      //     setServiceButtonState({ isLoading: false });
      //   });
      // }

      // For now POST /api/services will take care of creating, starting and updating the service
      return ServicesService.createService({
        serviceTemplate,
        deploy: true,
      }).then(() => {
        setServiceStatus(DeploymentStatus.DEPLOYED);
        setIsBalancePollingPaused(false);
        setServiceButtonState(ServiceButtonLoadingState.NotLoading);
      });
    } catch (error) {
      setIsBalancePollingPaused(false);
      setServiceButtonState(ServiceButtonLoadingState.NotLoading);
    }
  }, [
    masterSafeAddress,
    serviceTemplate,
    setIsBalancePollingPaused,
    setServiceStatus,
    wallets,
  ]);

  const handlePause = useCallback(() => {
    if (!services) return;
    if (services.length === 0) return;
    setServiceButtonState(ServiceButtonLoadingState.Pausing);
    ServicesService.stopDeployment(services[0].hash).then(() => {
      setServiceStatus(DeploymentStatus.STOPPED);
      setServiceButtonState(ServiceButtonLoadingState.NotLoading);
    });
  }, [services, setServiceStatus]);

  const serviceToggleButton = useMemo(() => {
    if (serviceButtonState === ServiceButtonLoadingState.Pausing) {
      return (
        <Button type="default" size="large" ghost disabled loading>
          Stopping...
        </Button>
      );
    }

    if (serviceButtonState === ServiceButtonLoadingState.Starting) {
      return (
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
    }

    if (serviceStatus === DeploymentStatus.DEPLOYED) {
      return (
        <Flex gap={10} align="center">
          <Button type="default" size="large" onClick={handlePause}>
            Pause
          </Button>
          <Typography.Text
            type="secondary"
            className="text-sm loading-ellipses"
          >
            Agent is working
          </Typography.Text>
        </Flex>
      );
    }

    if (totalOlasBalance === undefined || totalEthBalance === undefined) {
      return (
        <Button type="primary" size="large" disabled>
          Start agent
        </Button>
      );
    }

    const olasCostOfBond = Number(
      formatUnits(
        `${SERVICE_TEMPLATES[0].configuration.olas_cost_of_bond}`,
        18,
      ),
    );
    const olasRequiredToStake = Number(
      formatUnits(
        `${SERVICE_TEMPLATES[0].configuration.olas_required_to_stake}`,
        18,
      ),
    );
    const monthlyGasEstimate = Number(
      formatUnits(
        `${SERVICE_TEMPLATES[0].configuration.monthly_gas_estimate}`,
        18,
      ),
    );

    if (
      totalOlasBalance < olasCostOfBond + olasRequiredToStake ||
      totalEthBalance < monthlyGasEstimate
    ) {
      return (
        <Button type="default" size="large" disabled>
          Start agent
        </Button>
      );
    }

    return (
      <Button type="primary" size="large" onClick={handleStart}>
        Start agent
      </Button>
    );
  }, [
    serviceButtonState,
    serviceStatus,
    totalOlasBalance,
    totalEthBalance,
    handleStart,
    handlePause,
  ]);

  return (
    <Flex justify="start" align="center" gap={10}>
      {agentHead}
      {serviceToggleButton}
    </Flex>
  );
};
