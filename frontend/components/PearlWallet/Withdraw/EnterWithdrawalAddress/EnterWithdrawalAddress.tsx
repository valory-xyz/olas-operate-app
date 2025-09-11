import { Button, Flex, Input, Modal, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import { useCallback, useState } from 'react';

import { CardFlex } from '@/components/ui/CardFlex';
import { useMessageApi } from '@/context/MessageProvider';

import { usePearlWallet } from '../../PearlWalletContext';
import { cardStyles } from '../common';
import { ChainAndAmountOverview } from './ChainAndAmountOverview';

const { Title, Text } = Typography;

const WithdrawAddressLabel = () => (
  <Text className="text-sm text-neutral-tertiary">
    Withdrawal address{' '}
    <Text type="danger" className="text-sm">
      *
    </Text>
  </Text>
);

type WithdrawalAddressInputProps = {
  withdrawAddress: string;
  onWithAddressChange: (value: string) => void;
  onContinue: () => void;
};

const WithdrawalAddressInput = ({
  withdrawAddress,
  onWithAddressChange,
  onContinue,
}: WithdrawalAddressInputProps) => {
  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Flex gap={24} vertical>
        <Flex vertical gap={4}>
          <WithdrawAddressLabel />
          <Input
            value={withdrawAddress}
            onChange={(e) => onWithAddressChange(e.target.value)}
            placeholder="0x..."
            size="small"
            className="text-base"
            style={{ padding: '6px 12px' }}
          />
          <Text className="text-neutral-tertiary text-sm">
            Ensure this is an EVM-compatible address you can access on all
            relevant chains. ENS names aren’t supported.
          </Text>
        </Flex>

        <Button onClick={onContinue} type="primary" block size="large">
          Continue
        </Button>
      </Flex>
    </CardFlex>
  );
};

type EnterWithdrawalAddressProps = {
  onBack: () => void;
  onContinue: () => void;
};

export const EnterWithdrawalAddress = ({
  onBack,
  onContinue,
}: EnterWithdrawalAddressProps) => {
  const { availableAssets, amountsToWithdraw, onAmountChange } =
    usePearlWallet();
  const message = useMessageApi();

  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleWithAddressChange = useCallback((value: string) => {
    setWithdrawalAddress(value);
  }, []);

  const handleContinue = useCallback(() => {
    const isValidAddress = isAddress(withdrawalAddress);
    if (!isValidAddress) {
      message.error('Please enter a valid address');
      return;
    }

    onContinue();
  }, [withdrawalAddress, message, onContinue]);

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <ChainAndAmountOverview onBack={onBack} />
      <WithdrawalAddressInput
        withdrawAddress={withdrawalAddress}
        onWithAddressChange={handleWithAddressChange}
        onContinue={handleContinue}
      />

      {isPasswordModalOpen && (
        <Modal
          title="Authorize Withdrawal"
          onCancel={() => setIsPasswordModalOpen(false)}
          open
          footer={null}
        >
          ABCD
        </Modal>
      )}
    </Flex>
  );
};
