import { Button, Flex, Input, message, Modal, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import React, { useCallback, useState } from 'react';

import { useBalance } from '@/hooks/useBalance';
import { useServices } from '@/hooks/useServices';
import { useWallet } from '@/hooks/useWallet';
import { ServicesService } from '@/service/Services';
import { Address } from '@/types/Address';

import { CustomAlert } from '../Alert';

const { Text } = Typography;

export const WithdrawFunds = () => {
  const { updateWallets } = useWallet();
  const { updateBalances } = useBalance();
  const { service, updateServicesState } = useServices();
  const serviceHash = service?.hash;

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

    message.loading('Withdrawal pending. It may take a few minutes.');

    try {
      setIsWithdrawalLoading(true);

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
      }
    } catch (error) {
      message.error('Failed to withdraw funds. Please try again.');
      console.error(error);
    } finally {
      setIsWithdrawalLoading(false);
      handleCancel(); // Close modal after withdrawal
    }
  }, [withdrawAddress, serviceHash, handleCancel, refetchDetails]);

  return (
    <>
      <Button onClick={showModal} block style={{ fontSize: 14 }}>
        Withdraw all funds
      </Button>

      <Modal
        title="Withdraw Funds"
        open={isModalVisible}
        footer={null}
        onCancel={handleCancel}
        width={400}
        destroyOnClose
      >
        <Flex vertical gap={16} style={{ marginTop: 12 }}>
          <Text>
            To proceed, enter the EVM-compatible wallet address where you’d like
            to receive your funds. Funds will be sent on Gnosis Chain.
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

          <Text className="text-sm text-light">
            After withdrawal, you won’t be able to run your agent until you fund
            it with the required amounts again. Some funds may be locked in
            prediction markets and cannot be withdrawn at this time.
          </Text>
        </Flex>
      </Modal>
    </>
  );
};
