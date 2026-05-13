import { useMutation } from '@tanstack/react-query';
import { Button, Flex, Form, Input, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import styled from 'styled-components';
import zxcvbn from 'zxcvbn';

import { SuccessOutlined, WarningOutlined } from '@/components/custom-icons';
import {
  Alert,
  BackButton,
  CardFlex,
  FormLabel,
  Modal,
  RequiredMark,
} from '@/components/ui';
import { PasswordStrength } from '@/components/ui/forms';
import { COLOR, PAGES, SETUP_SCREEN } from '@/constants';
import { ERROR_CODE } from '@/constants/errors';
import { useSupportModal } from '@/context/SupportModalProvider';
import { usePageState, useSetup } from '@/hooks';
import { AccountService } from '@/service/Account';

import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const { Title, Text } = Typography;

const StyledCardFlex = styled(CardFlex)`
  max-width: 516px;
  margin: auto;
`;

const PasswordResetSuccessModal = ({ onDone }: { onDone: () => void }) => (
  <Modal
    header={<SuccessOutlined />}
    title="New Password Set Successfully!"
    description="You can now access your Pearl account with the new password."
    action={
      <Button
        type="primary"
        size="large"
        block
        className="mt-24"
        onClick={onDone}
      >
        Done
      </Button>
    }
  />
);

const PasswordResetFailedModal = ({
  onTryAgain,
  onContactSupport,
}: {
  onTryAgain: () => void;
  onContactSupport: () => void;
}) => (
  <Modal
    header={<WarningOutlined />}
    title="Password Update Failed"
    description="Please try again or contact the Valory support."
    action={
      <Flex vertical gap={12} className="mt-24" style={{ width: '100%' }}>
        <Button type="primary" size="large" block onClick={onTryAgain}>
          Try Again
        </Button>
        <Button size="large" block onClick={onContactSupport}>
          Contact Support
        </Button>
      </Flex>
    }
  />
);

type SetNewPasswordFormValues = {
  newPassword: string;
  confirmNewPassword: string;
};

export const SetNewPasswordViaSRP = () => {
  const [form] = Form.useForm<SetNewPasswordFormValues>();
  const { isUserLoggedIn, goto: gotoPage } = usePageState();
  const { goto: gotoSetup } = useSetup();
  const { toggleSupportModal } = useSupportModal();
  const { srpMnemonic, setSrpError, onPrev } = useAccountRecoveryContext();
  const [resultModal, setResultModal] = useState<'success' | 'error' | null>(
    null,
  );

  const exitFlow = useCallback(() => {
    if (isUserLoggedIn) {
      gotoPage(PAGES.Main);
    } else {
      gotoSetup(SETUP_SCREEN.Welcome);
    }
  }, [isUserLoggedIn, gotoPage, gotoSetup]);
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

        setResultModal('success');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to reset account password';

        if (message.includes(ERROR_CODE.MSG_INVALID_MNEMONIC)) {
          setSrpError('Please review your input and try again.');
          onPrev();
        } else {
          setResultModal('error');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [srpMnemonic, onPrev, resetAccount, setSrpError],
  );

  return (
    <StyledCardFlex $gap={24} $noBorder>
      <Flex vertical gap={16}>
        <BackButton onPrev={onPrev} />
        <Flex vertical gap={12}>
          <Title level={3} className="m-0">
            Set New Password
          </Title>
          <Text className="text-neutral-secondary">
            You will use this password to sign in to your Pearl account after
            the recovery process.
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
            <Flex gap={12}>
              <Button size="large" onClick={exitFlow}>
                Cancel
              </Button>
              <Button
                size="large"
                type="primary"
                htmlType="submit"
                disabled={!isFormValid}
                loading={isSubmitting}
                style={{ flex: 1 }}
              >
                Confirm Password
              </Button>
            </Flex>
          </Form.Item>
        </Flex>
      </Form>

      {resultModal === 'success' && (
        <PasswordResetSuccessModal
          onDone={() => {
            setResultModal(null);
            exitFlow();
          }}
        />
      )}

      {resultModal === 'error' && (
        <PasswordResetFailedModal
          onTryAgain={() => setResultModal(null)}
          onContactSupport={() => {
            setResultModal(null);
            toggleSupportModal();
          }}
        />
      )}
    </StyledCardFlex>
  );
};
