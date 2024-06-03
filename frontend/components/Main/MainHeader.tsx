import { InfoCircleOutlined } from '@ant-design/icons';
import { Badge, Button, Flex, Modal, Popover, Typography } from 'antd';
import { formatUnits } from 'ethers/lib/utils';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Chain, DeploymentStatus } from '@/client';
import { COLOR, LOW_BALANCE, SERVICE_TEMPLATES } from '@/constants';
import { useBalance, useServiceTemplates } from '@/hooks';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useReward } from '@/hooks/useReward';
import { useServices } from '@/hooks/useServices';
import { useStore } from '@/hooks/useStore';
import { useWallet } from '@/hooks/useWallet';
import { ServicesService } from '@/service';
import { WalletService } from '@/service/Wallet';

const { Text, Title, Paragraph } = Typography;

const LOADING_MESSAGE =
  "It may take a while to start your agent, so feel free to close the app. We'll notify you once your agent is running.";
enum ServiceButtonLoadingState {
  Starting,
  Pausing,
  NotLoading,
}

const FirstRunModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { minimumStakedAmountRequired } = useReward();

  if (!open) return null;
  return (
    <Modal
      open={open}
      width={412}
      onCancel={onClose}
      footer={[
        <Button
          key="ok"
          type="primary"
          block
          size="large"
          className="mt-8"
          onClick={onClose}
        >
          Got it
        </Button>,
      ]}
    >
      <Flex align="center" justify="center">
        <Image
          src="/splash-robot-head.png"
          width={100}
          height={100}
          alt="OLAS logo"
        />
      </Flex>
      <Title level={5} className="mt-12 text-center">
        {`Your agent is running and you&apos;ve staked ${minimumStakedAmountRequired} OLAS!`}
      </Title>
      <Paragraph>Your agent is working towards earning rewards.</Paragraph>
      <Paragraph>
        Pearl is designed to make it easy for you to earn staking rewards every
        day. Simply leave the app and agent running in the background for ~1hr a
        day.
      </Paragraph>
    </Modal>
  );
};

export const MainHeader = () => {
  const { storeState } = useStore();
  const { services, serviceStatus, setServiceStatus } = useServices();
  const { showNotification, setTrayIcon } = useElectronApi();
  const { getServiceTemplates } = useServiceTemplates();
  const { wallets, masterSafeAddress } = useWallet();
  const {
    safeBalance,
    totalOlasStakedBalance,
    totalEthBalance,
    isBalanceLoaded,
    setIsPaused: setIsBalancePollingPaused,
  } = useBalance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleModalClose = useCallback(() => setIsModalOpen(false), []);

  const { minimumStakedAmountRequired } = useReward();

  const safeOlasBalanceWithStaked = useMemo(() => {
    if (safeBalance?.OLAS === undefined) return;
    if (totalOlasStakedBalance === undefined) return;
    return totalOlasStakedBalance + safeBalance.OLAS;
  }, [safeBalance?.OLAS, totalOlasStakedBalance]);

  const [serviceButtonState, setServiceButtonState] =
    useState<ServiceButtonLoadingState>(ServiceButtonLoadingState.NotLoading);

  const serviceTemplate = useMemo(
    () => getServiceTemplates()[0],
    [getServiceTemplates],
  );

  useEffect(() => {
    if (safeBalance && safeBalance.ETH < LOW_BALANCE) {
      setTrayIcon?.('low-gas');
    } else if (serviceStatus === DeploymentStatus.DEPLOYED) {
      setTrayIcon?.('running');
    } else if (serviceStatus === DeploymentStatus.STOPPED) {
      setTrayIcon?.('paused');
    }
  }, [safeBalance, serviceStatus, setTrayIcon]);

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

      const serviceExists = !!services?.[0];

      // For now POST /api/services will take care of creating, starting and updating the service
      return ServicesService.createService({
        serviceTemplate,
        deploy: true,
      })
        .then(() => {
          setServiceStatus(DeploymentStatus.DEPLOYED);
          if (serviceExists) {
            showNotification?.('Your agent is now running!');
          } else {
            showNotification?.(
              `Your agent is running and you've staked ${minimumStakedAmountRequired} OLAS!`,
            );
            setIsModalOpen(true);
          }
        })
        .finally(() => {
          setIsBalancePollingPaused(false);
          setServiceButtonState(ServiceButtonLoadingState.NotLoading);
        });
    } catch (error) {
      setIsBalancePollingPaused(false);
      setServiceButtonState(ServiceButtonLoadingState.NotLoading);
    }
  }, [
    masterSafeAddress,
    minimumStakedAmountRequired,
    serviceTemplate,
    services,
    setIsBalancePollingPaused,
    setServiceStatus,
    showNotification,
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

    if (!isBalanceLoaded) {
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

    const requiredOlas = olasCostOfBond + olasRequiredToStake;

    const requiredGas = Number(
      formatUnits(
        `${SERVICE_TEMPLATES[0].configuration.monthly_gas_estimate}`,
        18,
      ),
    );

    const isDeployable = (() => {
      // case where required values are undefined (not fetched from the server)
      if (totalEthBalance === undefined) return false;
      if (safeOlasBalanceWithStaked === undefined) return false;
      if (!services) return false;

      // deployment statuses where agent should not be deployed
      // if (serviceStatus === DeploymentStatus.DEPLOYED) return false; // condition already checked above
      if (serviceStatus === DeploymentStatus.DEPLOYING) return false;
      if (serviceStatus === DeploymentStatus.STOPPING) return false;

      // case where service exists & user has initial funded
      if (services[0] && storeState?.isInitialFunded)
        return safeOlasBalanceWithStaked >= requiredOlas; // at present agent will always require staked/bonded OLAS (or the ability to stake/bond)

      return (
        safeOlasBalanceWithStaked >= requiredOlas &&
        totalEthBalance > requiredGas
      );
    })();

    const serviceExists = !!services?.[0];

    if (!isDeployable) {
      return (
        <Button type="default" size="large" disabled>
          Start agent {!serviceExists && '& stake'}
        </Button>
      );
    }

    return (
      <Button type="primary" size="large" onClick={handleStart}>
        Start agent {!serviceExists && '& stake'}
      </Button>
    );
  }, [
    handlePause,
    handleStart,
    isBalanceLoaded,
    safeOlasBalanceWithStaked,
    serviceButtonState,
    serviceStatus,
    services,
    storeState?.isInitialFunded,
    totalEthBalance,
  ]);

  return (
    <Flex justify="start" align="center" gap={10}>
      {agentHead}
      {serviceToggleButton}
      <FirstRunModal open={isModalOpen} onClose={handleModalClose} />
    </Flex>
  );
};
