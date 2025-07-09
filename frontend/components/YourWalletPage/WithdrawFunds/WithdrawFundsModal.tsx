import { Button, Flex, Input, Modal, Typography } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';

import { AgentType } from '@/enums/Agent';
import { useServices } from '@/hooks/useServices';

import { CustomAlert } from '../../Alert';

const { Text } = Typography;

const partOfFundsMayBeLockedMessage =
  "Your agent could have funds in external smart contracts. Withdrawing Pearl funds now means you won't be able to access those agent funds until a Pearl refund and agent rerun. Withdraw funds from your agent's profile first to ensure access.";

const afterWithdrawing =
  'Your agent will not be able to run again until it is refunded.';

const getWithdrawMessage = (agentType: AgentType) => {
  switch (agentType) {
    case AgentType.PredictTrader:
      return `This will withdraw all OLAS and XDAI from your account. ${afterWithdrawing}`;
    case AgentType.AgentsFun:
      return `This will withdraw all OLAS and ETH from your account. ${afterWithdrawing}`;
    case AgentType.Modius:
    case AgentType.Optimus:
      return `This will withdraw all OLAS, ETH and USDC from your account. ${afterWithdrawing}`;
    case AgentType.AgentsFunCelo:
      return `This will withdraw all OLAS and CELO from your account. ${afterWithdrawing}`;
    default:
      return `This will withdraw all funds from your account. ${afterWithdrawing}`;
  }
};

const ToProceedMessage = () => {
  const { selectedAgentType } = useServices();
  return (
    <CustomAlert
      type="warning"
      showIcon
      message={
        <Text className="text-sm">{getWithdrawMessage(selectedAgentType)}</Text>
      }
    />
  );
};

const CompatibleMessage = () => (
  <Text className="text-sm text-light">
    Ensure this is an EVM-compatible address you can access on all relevant
    chains.
  </Text>
);

const WithdrawModalSteps = {
  FUNDS_MAY_BE_LOCKED: 'FUNDS_MAY_BE_LOCKED',
  SHOW_BALANCES: 'SHOW_BALANCES',
  WITHDRAW_FUNDS: 'WITHDRAW_FUNDS',
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
      footer={null}
      onCancel={handleCancel}
      width={400}
      open
      destroyOnClose
    >
      <Flex vertical gap={16} style={{ marginTop: 12 }}>
        {withdrawStep === WithdrawModalSteps.FUNDS_MAY_BE_LOCKED ? (
          <>
            <Text>{partOfFundsMayBeLockedMessage}</Text>
            <Flex vertical gap={8}>
              <Button onClick={handleNext} type="primary" ghost>
                I have withdrawn my locked funds
              </Button>
              <Button onClick={handleCancel}>Cancel</Button>
            </Flex>
          </>
        ) : withdrawStep === WithdrawModalSteps.SHOW_BALANCES ? (
          <>2</>
        ) : withdrawStep === WithdrawModalSteps.WITHDRAW_FUNDS ? (
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
        ) : null}
      </Flex>
    </Modal>
  );
};

/**
 * TODO
 * - to open agent profile
 * - to display balances
 */
