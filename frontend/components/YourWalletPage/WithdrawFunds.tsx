import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, Flex, Input, message, Modal, Tooltip, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import React, { useCallback, useMemo, useState } from 'react';

import { COLOR } from '@/constants/colors';
import { useBalance } from '@/hooks/useBalance';
import { useServices } from '@/hooks/useServices';
import { useActiveStakingContractInfo } from '@/hooks/useStakingContractInfo';
import { useWallet } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';
import { formatTimeRemainingFromNow } from '@/utils/time';

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
  <>
    <Text>
      To proceed, enter the EVM-compatible wallet address where you’d like to
      receive your funds. Funds will be sent on Gnosis Chain.
    </Text>

    <CustomAlert
      type="warning"
      showIcon
      message={
        <Text className="text-sm">
          Ensure you have access to this wallet to avoid losing assets.
        </Text>
      }
    />
  </>
);

const AfterWithdrawalMessage = () => (
  <Text className="text-sm text-light">
    After withdrawal, you won’t be able to run your agent until you fund it with
    the required amounts again. Some funds may be locked in prediction markets
    and cannot be withdrawn at this time.
  </Text>
);

export const WithdrawFunds = () => {
  const { updateWallets } = useWallet();
  const { updateBalances } = useBalance();
  const { service, updateServicesState, isServiceNotRunning } = useServices();
  const serviceHash = service?.hash;

  const { isServiceStakedForMinimumDuration, remainingStakingDuration } =
    useActiveStakingContractInfo();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [isWithdrawalLoading, setIsWithdrawalLoading] = useState(false);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
    setWithdrawAddress('');
  }, []);

  const refetchDetails = useCallback(async () => {
    try {
      await updateServicesState();
      await updateWallets();
      await updateBalances();
    } catch (error) {
      console.error('Failed to refetch details after withdrawal', error);
    }
  }, [updateServicesState, updateWallets, updateBalances]);

  const handleProceed = useCallback(async () => {
    if (!withdrawAddress) return;
    if (!serviceHash) return;

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
        serviceHash: serviceHash,
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
  }, [withdrawAddress, serviceHash, handleCancel, refetchDetails]);

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
              {minDurationMessage}{' '}
              {formatTimeRemainingFromNow(remainingStakingDuration ?? 0)}.
            </Text>
          }
        >
          {withdrawButton}
        </Tooltip>
      )}

      {!isServiceNotRunning && <ServiceNotRunning />}

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

          <Input
            value={withdrawAddress}
            onChange={(e) => setWithdrawAddress(e.target.value)}
            placeholder="0x..."
            size="small"
            className="text-base"
            style={{ padding: '6px 12px' }}
          />

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

          <AfterWithdrawalMessage />
        </Flex>
      </Modal>
    </>
  );
};
