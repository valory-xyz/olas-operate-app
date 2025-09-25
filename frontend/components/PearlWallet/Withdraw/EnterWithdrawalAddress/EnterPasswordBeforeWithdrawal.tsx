import { useMutation } from '@tanstack/react-query';
import { Button, Flex, Input, Typography } from 'antd';
import { useCallback } from 'react';

import { CustomAlert } from '@/components/Alert';
import { AccountService } from '@/service/Account';
import { getErrorMessage } from '@/utils/error';

const { Text } = Typography;

const PasswordLabel = () => (
  <Text className="text-sm text-neutral-tertiary">
    Enter password{' '}
    <Text type="danger" className="text-sm">
      *
    </Text>
  </Text>
);

const useValidatePassword = () => {
  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async (password: string) =>
      await AccountService.loginAccount(password),
  });

  const validatePassword = useCallback(
    async (password: string) => {
      try {
        await mutateAsync(password);
        return true;
      } catch (e) {
        console.error(getErrorMessage(e));
        return false;
      }
    },
    [mutateAsync],
  );

  return { isLoading: isPending, isSuccess, isError, validatePassword };
};

type EnterPasswordBeforeWithdrawalProps = {
  password: string;
  onPasswordChange: (value: string) => void;
  isSubmitDisabled?: boolean;
  onWithdrawalFunds: () => void;
  onCancel: () => void;
};

export const EnterPasswordBeforeWithdrawal = ({
  password,
  onPasswordChange,
  isSubmitDisabled,
  onWithdrawalFunds,
  onCancel,
}: EnterPasswordBeforeWithdrawalProps) => {
  const { isLoading, isError, validatePassword } = useValidatePassword();

  const handleBeforeWithdrawFunds = useCallback(async () => {
    const isValid = await validatePassword(password);
    if (!isValid) return;

    onWithdrawalFunds();
  }, [onWithdrawalFunds, password, validatePassword]);

  return (
    <Flex vertical gap={24}>
      {isError && (
        <CustomAlert
          message="Incorrect password. Please try again."
          type="error"
          showIcon
        />
      )}

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
          loading={isLoading}
          onClick={handleBeforeWithdrawFunds}
          type="primary"
          size="large"
        >
          Withdraw Funds
        </Button>
      </Flex>
    </Flex>
  );
};
