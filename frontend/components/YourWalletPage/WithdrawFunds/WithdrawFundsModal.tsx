import { Button, Flex, Input, Modal, Typography } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';

import { AgentProfile } from '@/components/AgentProfile';
import { TOKEN_CONFIG } from '@/config/tokens';
import { useServices } from '@/hooks/useServices';
import { typedKeys } from '@/types/Util';

import { CustomAlert } from '../../Alert';
import { ShowBalances } from './ShowBalances';

const { Text } = Typography;

const partOfFundsMayBeLockedMessage =
  "Your agent could have funds in external smart contracts. Withdrawing Pearl funds now means you won't be able to access those agent funds until a Pearl refund and agent rerun. Withdraw funds from your agent's profile first to ensure access.";

const afterWithdrawing =
  'Your agent will not be able to run again until it is refunded.';

const WithdrawModalSteps = {
  FUNDS_MAY_BE_LOCKED: 'FUNDS_MAY_BE_LOCKED',
  SHOW_BALANCES: 'SHOW_BALANCES',
  WITHDRAW_FUNDS: 'WITHDRAW_FUNDS',
};

const ToProceedMessage = () => {
  const { selectedAgentConfig } = useServices();
  const tokenConfig = TOKEN_CONFIG[selectedAgentConfig.evmHomeChainId];

  const withdrawMessage = useMemo(() => {
    const tokens = typedKeys(tokenConfig);
    if (!tokens) {
      return `This will withdraw all funds from your account. ${afterWithdrawing}`;
    }

    const lastToken = tokens.pop();
    const tokensString = `${tokens.join(', ')} and ${lastToken}`;

    return `This will withdraw all ${tokensString} from your account. ${afterWithdrawing}`;
  }, [tokenConfig]);

  return (
    <CustomAlert
      type="warning"
      showIcon
      message={<Text className="text-sm">{withdrawMessage}</Text>}
    />
  );
};

const CompatibleMessage = () => (
  <Text className="text-sm text-light">
    Ensure this is an EVM-compatible address you can access on all relevant
    chains.
  </Text>
);

type FundsMayBeLockedMessageProps = {
  onNext: () => void;
  onCancel: () => void;
};

const FundsMayBeLocked = ({
  onNext,
  onCancel,
}: FundsMayBeLockedMessageProps) => {
  const { selectedAgentConfig } = useServices();

  return (
    <>
      <Text>{partOfFundsMayBeLockedMessage}</Text>
      <Flex vertical gap={8}>
        <AgentProfile
          renderContainer={({ onClick }) => (
            <Button
              disabled={!selectedAgentConfig.hasExternalFunds}
              onClick={onClick}
              type="primary"
              className="w-full"
            >
              Withdraw locked funds
            </Button>
          )}
        />
        <Button onClick={onNext} type="primary" ghost>
          I have withdrawn my locked funds
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </Flex>
    </>
  );
};

type WithdrawFundsModalProps = {
  isWithdrawing?: boolean;
  onClose: () => void;
  onWithdraw: (address: string) => void;
};

export const WithdrawFundsModal = ({
  isWithdrawing,
  onWithdraw,
  onClose,
}: WithdrawFundsModalProps) => {
  const { selectedAgentConfig } = useServices();

  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawStep, setWithdrawStep] = useState(
    selectedAgentConfig.hasExternalFunds
      ? WithdrawModalSteps.FUNDS_MAY_BE_LOCKED
      : WithdrawModalSteps.WITHDRAW_FUNDS,
  );

  const handleNext = useCallback(() => {
    if (withdrawStep === WithdrawModalSteps.FUNDS_MAY_BE_LOCKED) {
      setWithdrawStep(WithdrawModalSteps.SHOW_BALANCES);
    } else if (withdrawStep === WithdrawModalSteps.SHOW_BALANCES) {
      setWithdrawStep(WithdrawModalSteps.WITHDRAW_FUNDS);
    } else if (withdrawStep === WithdrawModalSteps.WITHDRAW_FUNDS) {
      onWithdraw(withdrawAddress);
    }
  }, [withdrawStep, withdrawAddress, onWithdraw]);

  const handleCancel = useCallback(() => {
    setWithdrawAddress('');
    onClose();
  }, [onClose]);

  const modalTitle = useMemo(() => {
    if (withdrawStep === WithdrawModalSteps.FUNDS_MAY_BE_LOCKED) {
      return 'Part of funds may be locked';
    }

    return 'Withdraw funds to user wallet';
  }, [withdrawStep]);

  const modalButtonText = useMemo(() => {
    if (isWithdrawing) return 'Loading...';
    return 'Proceed';
  }, [isWithdrawing]);

  return (
    <Modal
      title={modalTitle}
      onCancel={handleCancel}
      footer={null}
      width={400}
      open
      destroyOnClose
    >
      <Flex vertical gap={16} style={{ marginTop: 12 }}>
        {withdrawStep === WithdrawModalSteps.FUNDS_MAY_BE_LOCKED && (
          <FundsMayBeLocked onNext={handleNext} onCancel={handleCancel} />
        )}
        {withdrawStep === WithdrawModalSteps.SHOW_BALANCES && (
          <ShowBalances onNext={handleNext} onCancel={handleCancel} />
        )}
        {withdrawStep === WithdrawModalSteps.WITHDRAW_FUNDS && (
          <>
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
              loading={isWithdrawing}
              onClick={() => onWithdraw(withdrawAddress)}
              block
              type="primary"
              className="text-base"
            >
              {modalButtonText}
            </Button>
          </>
        )}
      </Flex>
    </Modal>
  );
};
