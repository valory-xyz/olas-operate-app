import { Button, Flex, Modal, Typography } from 'antd';
import { useCallback, useState } from 'react';

import {
  LoadingOutlined,
  SuccessOutlined,
  WarningOutlined,
} from '@/components/custom-icons';
import {
  cardStyles,
  InsufficientSignerGasModal,
  useInsufficientGasModal,
} from '@/components/ui';
import { AddressZero, PAGES } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import { usePageState } from '@/hooks';

import { useAgentWallet } from '../AgentWalletProvider';
import { STEPS } from '../types';
import { ChainAndAmountOverview } from './ChainAndAmountOverview';
import { useWithdrawFunds } from './useWithdrawFunds';

const { Title, Text } = Typography;

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
        onClick={() => goto(PAGES.PearlWallet)}
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

type EnterWithdrawalAddressProps = { onBack: () => void };

export const Withdraw = ({ onBack }: EnterWithdrawalAddressProps) => {
  const { isLoading, isError, isSuccess, error, onWithdrawFunds } =
    useWithdrawFunds();
  const { setFundInitialValues, updateStep } = useAgentWallet();

  const [isWithdrawModalVisible, setWithdrawModalVisible] = useState(false);

  const handleWithdrawFunds = useCallback(() => {
    setWithdrawModalVisible(true);
    onWithdrawFunds();
  }, [onWithdrawFunds]);

  const closeWithdrawModal = useCallback(
    () => setWithdrawModalVisible(false),
    [],
  );

  const gasModalProps = useInsufficientGasModal({
    isError,
    error,
    caseType: 'agent-withdraw',
    onFund: (gasError) => {
      // `prefill_amount_wei` is always the native gas token (backend contract:
      // it's looked up from DEFAULT_EOA_TOPUPS[chain][ZERO_ADDRESS]), so key
      // it by AddressZero — FundAgent maps AddressZero → the chain's native
      // symbol automatically via TOKEN_CONFIG.
      setFundInitialValues({
        [AddressZero]: String(gasError.prefill_amount_wei),
      });
      updateStep(STEPS.FUND_AGENT);
    },
    onClose: closeWithdrawModal,
  });

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <ChainAndAmountOverview
        onBack={onBack}
        onWithdraw={handleWithdrawFunds}
      />

      {isWithdrawModalVisible &&
        (gasModalProps ? (
          <InsufficientSignerGasModal {...gasModalProps} />
        ) : (
          <Modal
            onCancel={
              isLoading ? undefined : () => setWithdrawModalVisible(false)
            }
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
        ))}
    </Flex>
  );
};
