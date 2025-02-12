import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Input, message, Modal, Tooltip, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import React, { memo, useCallback, useMemo, useState } from 'react';

import { COLOR } from '@/constants/colors';
import { AgentType } from '@/enums/Agent';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractCountdown } from '@/hooks/useStakingContractCountdown';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';

import { CustomAlert } from '../Alert';
import { FeatureNotEnabled } from '../FeatureNotEnabled';

const { Text } = Typography;

const minDurationMessage =
  "You have not reached the minimum duration of staking. Keep running your agent and you'll be able to withdraw in";

const afterWithdrawing =
  'Your agent will not be able to run again until it is refunded.';

const getWithdrawMessage = (agentType: AgentType) => {
  //predit
  switch (agentType) {
    case AgentType.PredictTrader:
      return `This will withdraw all OLAS and XDAI from your account. ${afterWithdrawing}`;
    case AgentType.Memeooorr:
      return `This will withdraw all OLAS and ETH from your account. ${afterWithdrawing}`;
    case AgentType.Modius:
      return `This will withdraw all OLAS, ETH and USDC from your account. ${afterWithdrawing}`;
    case AgentType.AgentsFunCelo:
      return `This will withdraw all OLAS and CELO from your account. ${afterWithdrawing}`;
    default:
      return `This will withdraw all funds from your account. ${afterWithdrawing}`;
  }
};

const agentsWithWithdrawalsComingSoon: AgentType[] = [
  AgentType.Modius,
  AgentType.Memeooorr,
];

const ServiceNotRunning = () => (
  <div className="mt-8">
    <InfoCircleOutlined style={{ color: COLOR.TEXT_LIGHT }} />
    &nbsp;
    <Text className="text-sm text-light">
      Proceeding with withdrawal will stop your running agent.
    </Text>
  </div>
);

const ToProceedMessage = memo(function ToProceedMessage() {
  const { selectedAgentType } = useServices();
  return (
    <CustomAlert
      type="warning"
      showIcon
      message={
        <Text className="text-sm">{getWithdrawMessage(selectedAgentType)}</Text>
      }
    />
  );
});

const CompatibleMessage = () => (
  <Text className="text-sm text-light">
    Ensure this is an EVM-compatible address you can access on all relevant
    chains.
  </Text>
);

export const WithdrawFunds = () => {
  const {
    selectedService,
    refetch: refetchServices,
    selectedAgentType,
  } = useServices();
  const { refetch: refetchMasterWallets } = useMasterWalletContext();
  const { updateBalances } = useBalanceContext();

  const { service, isServiceRunning } = useService(
    selectedService?.service_config_id,
  );

  const { isServiceStakedForMinimumDuration, selectedStakingContractDetails } =
    useActiveStakingContractDetails();

  // state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isWithdrawalLoading, setIsWithdrawalLoading] = useState(false);

  const countdownDisplay = useStakingContractCountdown({
    currentStakingContractInfo: selectedStakingContractDetails,
  });

  const isComingSoon = useMemo(
    () => agentsWithWithdrawalsComingSoon.includes(selectedAgentType),
    [selectedAgentType],
  );

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
    setWithdrawAddress('');
  }, []);

  const refetchDetails = useCallback(async () => {
    try {
      await refetchServices?.();
      await refetchMasterWallets?.();
      await updateBalances();
    } catch (error) {
      console.error('Failed to refetch details after withdrawal', error);
    }
  }, [refetchServices, refetchMasterWallets, updateBalances]);

  const handleProceed = useCallback(async () => {
    if (!withdrawAddress) return;
    if (!selectedService?.service_config_id) return;

    const isValidAddress = isAddress(withdrawAddress);
    if (!isValidAddress) {
      message.error('Please enter a valid address');
      return;
    }

    setIsWithdrawalLoading(true);
    message.loading('Withdrawal pending. It may take a few minutes.');

    try {
      const response = await ServicesService.withdrawBalance({
        withdrawAddress: withdrawAddress as Address,
        serviceConfigId: selectedService.service_config_id,
      });

      if (response.error) {
        message.error(response.error);
      } else {
        message.success('Transaction complete.');

        // refetch and keep up to date
        await refetchDetails();

        // Close modal after withdrawal is successful
        handleCancel();
      }
    } catch (error) {
      message.error('Failed to withdraw funds. Please try again.');
      console.error(error);
    } finally {
      setIsWithdrawalLoading(false);
    }
  }, [
    withdrawAddress,
    selectedService?.service_config_id,
    refetchDetails,
    handleCancel,
  ]);

  const withdrawAllButton = useMemo(
    () => (
      <Button
        onClick={showModal}
        block
        size="large"
        disabled={
          !service || !isServiceStakedForMinimumDuration || isComingSoon
        }
      >
        Withdraw all funds
      </Button>
    ),
    [showModal, service, isServiceStakedForMinimumDuration, isComingSoon],
  );

  const withdrawAllTooltip = useMemo(() => {
    if (isComingSoon) {
      return 'Available soon!';
    }

    // countdown to withdrawal
    if (!isServiceStakedForMinimumDuration) {
      return `${minDurationMessage} ${countdownDisplay}`;
    }

    return null;
  }, [countdownDisplay, isComingSoon, isServiceStakedForMinimumDuration]);

  const modalButtonText = useMemo(() => {
    if (isWithdrawalLoading) return 'Loading';
    return 'Proceed';
  }, [isWithdrawalLoading]);

  const isWithdrawFundsEnabled = useFeatureFlag('withdraw-funds');
  if (!isWithdrawFundsEnabled) return <FeatureNotEnabled />;

  return (
    <>
      <Tooltip title={<Text className="text-sm">{withdrawAllTooltip}</Text>}>
        {withdrawAllButton}
      </Tooltip>

      {!isServiceRunning && <ServiceNotRunning />}

      <Modal
        title="Withdraw all funds"
        open={isModalVisible}
        footer={null}
        onCancel={handleCancel}
        width={400}
        destroyOnClose
      >
        <Flex vertical gap={16} style={{ marginTop: 12 }}>
          <ToProceedMessage />

          <Flex vertical gap={8}>
            <Text className="text-sm text-light">Withdrawal address</Text>

            <Input
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              placeholder="0x..."
              size="small"
              className="text-base"
              style={{ padding: '6px 12px' }}
            />
          </Flex>

          <CompatibleMessage />

          <Button
            disabled={!withdrawAddress}
            loading={isWithdrawalLoading}
            onClick={handleProceed}
            block
            type="primary"
            className="text-base"
          >
            {modalButtonText}
          </Button>
        </Flex>
      </Modal>
    </>
  );
};
