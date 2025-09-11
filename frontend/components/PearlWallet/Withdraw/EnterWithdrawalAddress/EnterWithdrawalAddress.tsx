import { Button, Flex, Input, Modal, Typography } from 'antd';
import { isAddress } from 'ethers/lib/utils';
import { useCallback, useState } from 'react';

import {
  LoadingOutlined,
  SuccessOutlined,
  WarningOutlined,
} from '@/components/custom-icons';
import { CardFlex } from '@/components/ui/CardFlex';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { useMessageApi } from '@/context/MessageProvider';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { usePearlWallet } from '../../PearlWalletContext';
import { cardStyles } from '../common';
import { ChainAndAmountOverview } from './ChainAndAmountOverview';

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

const WithdrawalComplete = ({ transactions }: { transactions: string[] }) => {
  const { goto } = usePageState();

  return (
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

      <Button
        onClick={() => goto(Pages.PearlWallet)}
        type="primary"
        block
        size="large"
      >
        Close
      </Button>
    </Flex>
  );
};

const WithdrawalFailed = ({ onTryAgain }: { onTryAgain: () => void }) => {
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
          the Olas community.
        </Text>
      </Flex>

      <Flex gap={16} vertical className="text-center">
        <Button onClick={onTryAgain} type="primary" block size="large">
          Try Again
        </Button>
        <Link href={SUPPORT_URL}>
          Join Olas Community Discord Server {UNICODE_SYMBOLS.EXTERNAL_LINK}
        </Link>
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
};

export const EnterWithdrawalAddress = ({
  onBack,
}: EnterWithdrawalAddressProps) => {
  const { availableAssets, amountsToWithdraw, onAmountChange } =
    usePearlWallet();
  const message = useMessageApi();

  const [withdrawalAddress, setWithdrawalAddress] = useState(
    '0x07b5302e01D44bD5b90C63C6Fb24807946704bFC',
  );
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

  const canShowModalTitle = false;
  const canCloseModal = false;

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
          title={canShowModalTitle ? 'Authorize Withdrawal' : null}
          onCancel={
            canCloseModal ? () => setIsPasswordModalOpen(false) : undefined
          }
          closable={canCloseModal}
          open
          width={436}
          footer={null}
          styles={{ content: { padding: '32px' } }}
        >
          {/* <WithdrawalComplete
            transactions={[
              'https://gnosisscan.io/address/0xd3b0b28f56c9eeb3e8ac992f388be9a92bf8e20d',
            ]}
          /> */}
          <WithdrawalFailed onTryAgain={() => {}} />
        </Modal>
      )}
    </Flex>
  );
};
