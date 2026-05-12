import { Button, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import zxcvbn from 'zxcvbn';

import { Alert, BackButton, CardFlex, FormLabel } from '@/components/ui';
import { PasswordStrength } from '@/components/ui/forms';
import { COLOR } from '@/constants';
import { ERROR_CODE } from '@/constants/errors';
import { SettingsScreenMap } from '@/constants/screen';
import { useMessageApi } from '@/context/MessageProvider';
import { useEnterAccountRecoveryFromMain, useSettings } from '@/hooks';
import { AccountService } from '@/service/Account';

const { Title, Text } = Typography;

type UpdatePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

export const UpdatePasswordScreen = () => {
  const [form] = Form.useForm<UpdatePasswordFormValues>();
  const { goto } = useSettings();
  const messageApi = useMessageApi();
  const enterAccountRecovery = useEnterAccountRecoveryFromMain();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPassword = Form.useWatch('currentPassword', form);
  const newPassword = Form.useWatch('newPassword', form);
  const confirmNewPassword = Form.useWatch('confirmNewPassword', form);

  const isNewPasswordValid =
    !!newPassword &&
    newPassword.length >= 8 &&
    /^[\x20-\x7E]*$/.test(newPassword);
  const passwordsMatch =
    !!newPassword && !!confirmNewPassword && newPassword === confirmNewPassword;
  const passwordsMismatch =
    !!newPassword && !!confirmNewPassword && newPassword !== confirmNewPassword;

  const isFormValid = !!currentPassword && isNewPasswordValid && passwordsMatch;

  const handleSubmit = async (values: UpdatePasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await AccountService.updateAccount(
        values.currentPassword,
        values.newPassword,
      );
      messageApi.success('Password has been updated');
      goto(SettingsScreenMap.Main);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update password';

      if (message.includes(ERROR_CODE.MSG_INVALID_PASSWORD)) {
        form.setFields([
          {
            name: 'currentPassword',
            errors: ['Incorrect password. Please try again.'],
          },
        ]);
      } else {
        messageApi.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CardFlex $gap={16} $padding="24px 32px">
      <BackButton onPrev={() => goto(SettingsScreenMap.Main)} />

      <Flex vertical gap={12}>
        <Title level={3} className="m-0">
          Set New Password
        </Title>
        <Text className="text-neutral-secondary">
          Change the password you use to unlock Pearl.
        </Text>
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
      >
        <Form.Item
          name="currentPassword"
          label={<FormLabel>Current password</FormLabel>}
          required={false}
          labelCol={{ style: { paddingBottom: 4 } }}
        >
          <Input.Password size="large" maxLength={64} />
        </Form.Item>

        <Flex vertical>
          <Button
            type="link"
            className="text-sm w-fit p-0"
            onClick={enterAccountRecovery}
          >
            Forgot your password?
          </Button>
        </Flex>

        <Form.Item
          name="newPassword"
          label={<FormLabel>New password</FormLabel>}
          help={
            isNewPasswordValid ? (
              <PasswordStrength score={zxcvbn(newPassword).score} />
            ) : null
          }
          required={false}
          labelCol={{ style: { paddingBottom: 4 } }}
          style={{ marginTop: 16 }}
        >
          <Input.Password size="large" maxLength={64} />
        </Form.Item>

        <Form.Item
          name="confirmNewPassword"
          label={<FormLabel>Confirm new password</FormLabel>}
          help={
            passwordsMatch ? (
              <Text
                style={{ color: COLOR.TEXT_COLOR.SUCCESS.DEFAULT }}
                className="text-sm"
              >
                Passwords match
              </Text>
            ) : passwordsMismatch ? (
              <Text
                style={{ color: COLOR.TEXT_COLOR.ERROR.DEFAULT }}
                className="text-sm"
              >
                Passwords don&apos;t match
              </Text>
            ) : null
          }
          required={false}
          labelCol={{ style: { paddingBottom: 4 } }}
        >
          <Input.Password size="large" maxLength={64} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            size="large"
            type="primary"
            htmlType="submit"
            disabled={!isFormValid}
            loading={isSubmitting}
            className="mt-8"
            style={{ width: '100%' }}
          >
            Update Password
          </Button>
        </Form.Item>
      </Form>
    </CardFlex>
  );
};
