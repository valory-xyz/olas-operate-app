import { Button, Flex, Modal, Typography } from 'antd';
import { CSSProperties, useCallback, useState } from 'react';

import {
  LoadingOutlined,
  SuccessOutlined,
  WarningOutlined,
} from '@/components/custom-icons';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { SUPPORT_URL } from '@/constants/urls';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';

import { ChainAndAmountOverview } from './ChainAndAmountOverview';
import { useWithdrawFunds } from './useWithdrawFunds';

const { Title, Text, Link } = Typography;

const cardStyles: CSSProperties = {
  width: 552,
  margin: '0 auto',
} as const;

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
        It usually takes 1-2 minutes.
      </Text>
    </Flex>
  </Flex>
);

const WithdrawalComplete = () => {
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
          Funds transferred to the Pearl wallet.
        </Text>
      </Flex>

      <Button
        onClick={() => goto(Pages.PearlWallet)}
        type="primary"
        block
        size="large"
      >
        Go to Pearl Wallet
      </Button>
    </Flex>
  );
};

type WithdrawalFailedProps = { onTryAgain: () => void };
const WithdrawalFailed = ({ onTryAgain }: WithdrawalFailedProps) => (
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

type EnterWithdrawalAddressProps = { onBack: () => void };

export const Withdraw = ({ onBack }: EnterWithdrawalAddressProps) => {
  const { isLoading, isError, isSuccess, onWithdrawFunds } = useWithdrawFunds();

  const [isPasswordModalOpen, isWithdrawModalVisible] = useState(false);

  const handleWithdrawFunds = useCallback(() => {
    isWithdrawModalVisible(true);
    onWithdrawFunds();
  }, [onWithdrawFunds]);

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <ChainAndAmountOverview
        onBack={onBack}
        onWithdraw={handleWithdrawFunds}
      />

      {isPasswordModalOpen && (
        <Modal
          onCancel={isLoading ? undefined : () => isWithdrawModalVisible(false)}
          closable={!isLoading}
          open
          width={436}
          title={null}
          footer={null}
        >
          {isError ? (
            <WithdrawalFailed onTryAgain={handleWithdrawFunds} />
          ) : isSuccess ? (
            <WithdrawalComplete />
          ) : (
            <WithdrawalInProgress />
          )}
        </Modal>
      )}
    </Flex>
  );
};

/**
 * - create a path for "Profile" page
 */
