import { useMutation } from '@tanstack/react-query';
import { Button, Flex, Form, Input, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import zxcvbn from 'zxcvbn';

import {
  Alert,
  BackButton,
  CardFlex,
  FormLabel,
  RequiredMark,
} from '@/components/ui';
import { PasswordStrength } from '@/components/ui/forms';
import { COLOR, PAGES } from '@/constants';
import { ERROR_CODE } from '@/constants/errors';
import { useMessageApi } from '@/context/MessageProvider';
import { usePageState } from '@/hooks';
import { AccountService } from '@/service/Account';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const { Title, Text } = Typography;

type SetNewPasswordFormValues = {
  newPassword: string;
  confirmNewPassword: string;
};

export const SetNewPasswordViaSRP = () => {
  const [form] = Form.useForm<SetNewPasswordFormValues>();
  const messageApi = useMessageApi();
  const { isUserLoggedIn, goto: gotoPage } = usePageState();
  const { srpMnemonic, setSrpError, onNext, onPrev } =
    useAccountRecoveryContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const newPassword = Form.useWatch('newPassword', form);
  const confirmNewPassword = Form.useWatch('confirmNewPassword', form);

  const isNewPasswordValid =
    !!newPassword &&
    newPassword.length >= 8 &&
    /^[\x20-\x7E]*$/.test(newPassword);
  const passwordsState: 'match' | 'mismatch' | null =
    !newPassword || !confirmNewPassword
      ? null
      : newPassword === confirmNewPassword
        ? 'match'
        : 'mismatch';

  const isFormValid = isNewPasswordValid && passwordsState === 'match';

  const { mutateAsync: resetAccount } = useMutation({
    mutationFn: async ({
      mnemonic,
      password,
    }: {
      mnemonic: string;
      password: string;
    }) => AccountService.resetAccountWithMnemonic(mnemonic, password),
  });

  const handleSubmit = useCallback(
    async (values: SetNewPasswordFormValues) => {
      if (!srpMnemonic) return;
      setIsSubmitting(true);
      try {
        await resetAccount({
          mnemonic: srpMnemonic,
          password: values.newPassword,
        });

        if (isUserLoggedIn) {
          gotoPage(PAGES.Main);
        } else {
          onNext();
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to reset account password';

        if (message.includes(ERROR_CODE.MSG_INVALID_MNEMONIC)) {
          setSrpError('Please review your input and try again.');
          onPrev();
        } else {
          messageApi.error(message);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      srpMnemonic,
      isUserLoggedIn,
      gotoPage,
      onNext,
      onPrev,
      resetAccount,
      setSrpError,
      messageApi,
    ],
  );

  return (
    <CardFlex $gap={24} $padding="24px 32px" $noBorder>
      <Flex vertical gap={16}>
        <BackButton onPrev={onPrev} />
        <Flex vertical gap={12}>
          <Title level={3} className="m-0">
            Set New Password
          </Title>
          <Text className="text-neutral-secondary">
            Choose a new password for your Pearl account.
          </Text>
        </Flex>
      </Flex>

      <Alert
        type="info"
        showIcon
        message="Your password must be at least 8 characters long. Use a mix of letters, numbers, and symbols."
        className="text-sm"
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
        requiredMark={RequiredMark}
      >
        <Flex vertical gap={24}>
          <Form.Item
            name="newPassword"
            label={<FormLabel>New password</FormLabel>}
            rules={[
              { required: true, message: 'Please input a password.' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (!/^[\x20-\x7E]*$/.test(value)) {
                    return Promise.reject(
                      new Error('Password must only contain ASCII characters.'),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
            help={
              isNewPasswordValid ? (
                <div className="mt-6">
                  <PasswordStrength score={zxcvbn(newPassword).score} />
                </div>
              ) : null
            }
            labelCol={{ style: { paddingBottom: 4 } }}
            style={{ marginBottom: 0 }}
          >
            <Input.Password size="large" maxLength={64} />
          </Form.Item>

          <Form.Item
            name="confirmNewPassword"
            label={<FormLabel>Confirm new password</FormLabel>}
            rules={[
              { required: true, message: 'Please confirm your password.' },
            ]}
            help={
              passwordsState === 'match' ? (
                <Flex align="center" gap={6} className="mt-6">
                  <LuCircleCheck
                    style={{ color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT }}
                  />
                  <Text
                    style={{ color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT }}
                    className="text-sm"
                  >
                    Passwords match
                  </Text>
                </Flex>
              ) : passwordsState === 'mismatch' ? (
                <Flex align="center" gap={6} className="mt-6">
                  <LuTriangleAlert
                    style={{ color: COLOR.TEXT_COLOR.ERROR.DEFAULT }}
                  />
                  <Text
                    style={{ color: COLOR.TEXT_COLOR.ERROR.DEFAULT }}
                    className="text-sm"
                  >
                    Passwords don&apos;t match
                  </Text>
                </Flex>
              ) : null
            }
            labelCol={{ style: { paddingBottom: 4 } }}
            style={{ marginBottom: 0 }}
          >
            <Input.Password
              size="large"
              maxLength={64}
              status={passwordsState === 'mismatch' ? 'error' : undefined}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              size="large"
              type="primary"
              htmlType="submit"
              disabled={!isFormValid}
              loading={isSubmitting}
              style={{ width: '100%' }}
            >
              Reset Password
            </Button>
          </Form.Item>
        </Flex>
      </Form>
    </CardFlex>
  );
};
