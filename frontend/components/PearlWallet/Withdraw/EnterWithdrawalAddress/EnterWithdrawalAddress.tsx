import { Button, Flex, Input, Modal, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import { useCallback, useState } from 'react';

import { CardFlex } from '@/components/ui/CardFlex';
import { cardStyles } from '@/components/ui/cardStyles';
import { useMessageApi } from '@/context/MessageProvider';

import { usePearlWallet } from '../../PearlWalletProvider';
import { ChainAndAmountOverview } from './ChainAndAmountOverview';
import { useWithdrawFunds } from './useWithdrawFunds';
import {
  WithdrawalComplete,
  WithdrawalFailed,
  WithdrawalInProgress,
} from './WithdrawStatusMessage';

const { Text } = Typography;

const WithdrawAddressLabel = () => (
  <Text className="text-sm text-neutral-tertiary">
    Withdrawal address{' '}
    <Text type="danger" className="text-sm">
      *
    </Text>
  </Text>
);

const PasswordLabel = () => (
  <Text className="text-sm text-neutral-tertiary">
    Enter password{' '}
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

type WithdrawalPasswordInputProps = {
  password: string;
  onPasswordChange: (value: string) => void;
  isSubmitDisabled?: boolean;
  onWithdrawalFunds: () => void;
  onCancel: () => void;
};

const WithdrawalPasswordInput = ({
  password,
  onPasswordChange,
  isSubmitDisabled,
  onWithdrawalFunds,
  onCancel,
}: WithdrawalPasswordInputProps) => (
  <Flex vertical gap={24}>
    <Flex gap={24} vertical>
      <Flex vertical gap={4}>
        <PasswordLabel />
        <Input.Password
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Enter your password"
          size="small"
          className="text-base"
          style={{ padding: '6px 12px' }}
        />
      </Flex>
    </Flex>

    <Flex gap={16} justify="end">
      <Button onClick={onCancel} size="large">
        Cancel
      </Button>
      <Button
        disabled={isSubmitDisabled}
        onClick={onWithdrawalFunds}
        type="primary"
        size="large"
      >
        Withdraw Funds
      </Button>
    </Flex>
  </Flex>
);

type EnterWithdrawalAddressProps = { onBack: () => void };

export const EnterWithdrawalAddress = ({
  onBack,
}: EnterWithdrawalAddressProps) => {
  const message = useMessageApi();
  const { onReset } = usePearlWallet();
  const { isLoading, isError, isSuccess, txnHashes, onAuthorizeWithdrawal } =
    useWithdrawFunds();

  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [password, setPassword] = useState('');
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

    setIsPasswordModalOpen(true);
  }, [withdrawalAddress, message]);

  const handleWithdraw = useCallback(() => {
    onAuthorizeWithdrawal(withdrawalAddress, password);
  }, [onAuthorizeWithdrawal, withdrawalAddress, password]);

  const hasApiNotTriggered = ![isLoading, isError, isSuccess].some(Boolean);
  const canCloseModal = isError || !hasApiNotTriggered;

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
          title={hasApiNotTriggered ? 'Authorize Withdrawal' : null}
          onCancel={
            canCloseModal ? () => setIsPasswordModalOpen(false) : undefined
          }
          closable={canCloseModal}
          open
          width={436}
          footer={null}
          styles={
            hasApiNotTriggered
              ? { header: { marginBottom: 16 } }
              : { content: { padding: '32px' } }
          }
        >
          {isLoading ? (
            <WithdrawalInProgress />
          ) : isError ? (
            <WithdrawalFailed onTryAgain={handleWithdraw} />
          ) : isSuccess ? (
            <WithdrawalComplete transactions={txnHashes} onClose={onReset} />
          ) : (
            <WithdrawalPasswordInput
              password={password}
              onPasswordChange={setPassword}
              isSubmitDisabled={!password || isLoading || isSuccess}
              onWithdrawalFunds={handleWithdraw}
              onCancel={() => setIsPasswordModalOpen(false)}
            />
          )}
        </Modal>
      )}
    </Flex>
  );
};
