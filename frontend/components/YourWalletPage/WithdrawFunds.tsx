import { Button, Flex, Input, message, Modal, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import React, { useCallback, useState } from 'react';

import { delayInSeconds } from '@/utils/delay';

import { CustomAlert } from '../Alert';

const { Text } = Typography;

export const WithdrawFunds = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [isWithdrawalLoading, setIsWithdrawalLoading] = useState(false);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleProceed = useCallback(async () => {
    if (!amount) return;

    const isValidAddress = isAddress(amount);
    if (!isValidAddress) {
      message.error('Please enter a valid address');
      return;
    }

    setIsWithdrawalLoading(true);
    await delayInSeconds(2); // TODO: integrate with the backend
    setIsWithdrawalLoading(false);
  }, [amount]);

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
      >
        <Flex vertical gap={16}>
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0x..."
          />

          <Button
            disabled={!amount}
            loading={isWithdrawalLoading}
            onClick={handleProceed}
            block
            type="primary"
            style={{ fontSize: 14 }}
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
