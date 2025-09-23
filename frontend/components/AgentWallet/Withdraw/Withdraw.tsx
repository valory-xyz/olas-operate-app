import { Button, Flex, Input, Modal, Typography } from 'antd';
import { CSSProperties, useCallback, useState } from 'react';

import { ChainAndAmountOverview } from './ChainAndAmountOverview';
import { useWithdrawFunds } from './useWithdrawFunds';
import {
  WithdrawalComplete,
  WithdrawalFailed,
  WithdrawalInProgress,
} from './WithdrawStatusMessage';

const { Text } = Typography;

export const cardStyles: CSSProperties = {
  width: 552,
  margin: '0 auto',
} as const;

const PasswordLabel = () => (
  <Text className="text-sm text-neutral-tertiary">
    Enter password{' '}
    <Text type="danger" className="text-sm">
      *
    </Text>
  </Text>
);

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

export const Withdraw = ({ onBack }: EnterWithdrawalAddressProps) => {
  const { isLoading, isError, isSuccess } = useWithdrawFunds();

  const [password, setPassword] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleWithdraw = useCallback(() => {
    window.console.log('hello world!');
  }, []);

  const hasApiNotTriggered = ![isLoading, isError, isSuccess].some(Boolean);
  const canCloseModal = isError || !hasApiNotTriggered;

  return (
    <Flex gap={16} vertical style={cardStyles}>
      <ChainAndAmountOverview onBack={onBack} />

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
            <WithdrawalComplete />
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
