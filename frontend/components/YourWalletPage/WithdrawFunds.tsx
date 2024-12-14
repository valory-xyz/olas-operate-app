import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Input, message, Modal, Tooltip, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import React, { useCallback, useMemo, useState } from 'react';

import { COLOR } from '@/constants/colors';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useService } from '@/hooks/useService';
import { useServices } from '@/hooks/useServices';
import { useStakingContractCountdown } from '@/hooks/useStakingContractCountdown';
import { useActiveStakingContractDetails } from '@/hooks/useStakingContractDetails';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';

import { CustomAlert } from '../Alert';

const { Text } = Typography;

const minDurationMessage =
  "You have not reached the minimum duration of staking. Keep running your agent and you'll be able to withdraw in";

const ServiceNotRunning = () => (
  <div className="mt-8">
    <InfoCircleOutlined style={{ color: COLOR.TEXT_LIGHT }} />
    &nbsp;
    <Text className="text-sm text-light">
      Proceeding with withdrawal will stop your running agent.
    </Text>
  </div>
);

const ToProceedMessage = () => (
  <CustomAlert
    type="warning"
    showIcon
    message={
      <Text className="text-sm">
        This will remove all OLAS and all XDAI - excluding the DAI currently in
        prediction markets - from your account. You will not be able to run your
        agent after withdrawing.
      </Text>
    }
  />
);

const CompatibleMessage = () => (
  <Text className="text-sm text-light">
    Ensure this is an EVM-compatible address you can access on all relevant
    chains.
  </Text>
);

export const WithdrawFunds = () => {
  const { selectedService, refetch: refetchServices } = useServices();
  const { refetch: refetchMasterWallets } = useMasterWalletContext();

  const { updateBalances } = useBalanceContext();

  const { service, isServiceRunning } = useService(
    selectedService?.service_config_id,
  );

  const { isServiceStakedForMinimumDuration, selectedStakingContractDetails } =
    useActiveStakingContractDetails();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isWithdrawalLoading, setIsWithdrawalLoading] = useState(false);

  const countdownDisplay = useStakingContractCountdown({
    currentStakingContractInfo: selectedStakingContractDetails,
  });

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

  const withdrawButton = useMemo(
    () => (
      <Button
        onClick={showModal}
        block
        size="large"
        disabled={!service || !isServiceStakedForMinimumDuration}
      >
        Withdraw all funds
      </Button>
    ),
    [service, isServiceStakedForMinimumDuration, showModal],
  );

  return (
    <>
      {isServiceStakedForMinimumDuration ? (
        withdrawButton
      ) : (
        <Tooltip
          title={
            <Text className="text-sm">
              {minDurationMessage} {countdownDisplay}.
            </Text>
          }
        >
          {withdrawButton}
        </Tooltip>
      )}

      {!isServiceRunning && <ServiceNotRunning />}

      <Modal
        title="Withdraw Funds"
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
            Proceed
          </Button>
        </Flex>
      </Modal>
    </>
  );
};
