import { Button, Flex, Input, Modal, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import { useCallback, useState } from 'react';

import {
  LoadingOutlined,
  SuccessOutlined,
  WarningOutlined,
} from '@/components/custom-icons';
import { CardFlex, cardStyles } from '@/components/ui';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useMessageApi } from '@/context/MessageProvider';
import { usePearlWallet } from '@/context/PearlWalletProvider';
import { useSupportModal } from '@/context/SupportModalProvider';

import { ChainAndAmountOverview } from './ChainAndAmountOverview';
import { EnterPasswordBeforeWithdrawal } from './EnterPasswordBeforeWithdrawal';
import { useWithdrawFunds } from './useWithdrawFunds';

const { Title, Text, Link } = Typography;

const WithdrawAddressLabel = () => (
  <Text className="text-sm text-neutral-tertiary">
    Withdrawal address{' '}
    <Text type="danger" className="text-sm">
      *
    </Text>
  </Text>
);

const WithdrawalInProgress = () => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <LoadingOutlined />
    </Flex>

    <Flex gap={12} vertical align="center" className="text-center">
      <Title level={4} className="m-0">
        Withdrawal in Progress
      </Title>
      <Text className="text-neutral-tertiary">
        It usually takes a few minutes. Please keep the app open until the
        process is complete.
      </Text>
    </Flex>
  </Flex>
);

type WithdrawalCompleteProps = { transactions: string[]; onClose: () => void };
const WithdrawalComplete = ({
  transactions,
  onClose,
}: WithdrawalCompleteProps) => (
  <Flex gap={32} vertical>
    <Flex align="center" justify="center">
      <SuccessOutlined />
    </Flex>

    <Flex gap={12} vertical className="text-center">
      <Title level={4} className="m-0">
        Withdrawal Complete!
      </Title>
      <Text className="text-neutral-tertiary">
        Funds transferred to your external wallet.
      </Text>
      {transactions.map((tx) => (
        <Link key={tx} href={tx} target="_blank" rel="noreferrer">
          Review transaction {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </Link>
      ))}
    </Flex>

    <Button onClick={onClose} type="primary" block size="large">
      Close
    </Button>
  </Flex>
);

type WithdrawalFailedProps = { onTryAgain: () => void };
const WithdrawalFailed = ({ onTryAgain }: WithdrawalFailedProps) => {
  const { toggleSupportModal } = useSupportModal();

  const openSupportModal = () => {
    toggleSupportModal();
  };

  return (
    <Flex gap={32} vertical>
      <Flex align="center" justify="center">
        <WarningOutlined />
      </Flex>

      <Flex gap={12} vertical className="text-center">
        <Title level={4} className="m-0">
          Withdrawal Failed
        </Title>
        <Text className="text-neutral-tertiary">
          Something went wrong with your withdrawal. Please try again or contact
          Valory support.
        </Text>
      </Flex>

      <Flex gap={16} vertical className="text-center">
        <Button onClick={onTryAgain} type="primary" block size="large">
          Try Again
        </Button>
        <Button onClick={openSupportModal} type="default" block size="large">
          Contact Support
        </Button>
      </Flex>
    </Flex>
  );
};

type WithdrawalAddressInputProps = {
  withdrawAddress: string;
  onWithAddressChange: (value: string) => void;
  onContinue: () => void;
};
const WithdrawalAddressInput = ({
  withdrawAddress,
  onWithAddressChange,
  onContinue,
}: WithdrawalAddressInputProps) => (
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
            <EnterPasswordBeforeWithdrawal
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
