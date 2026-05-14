import { Button, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';

import {
  Alert,
  BackButton,
  CardFlex,
  cardStyles,
  FormLabel,
  RequiredMark,
} from '@/components/ui';
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  PasswordSetupFields,
  usePasswordSetupValidity,
} from '@/components/ui/forms';
import { PAGES, SETUP_SCREEN } from '@/constants';
import { ERROR_CODE } from '@/constants/errors';
import { SettingsScreenMap } from '@/constants/screen';
import { useMessageApi } from '@/context/MessageProvider';
import { usePageState, useSettings, useSetup } from '@/hooks';
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
  const { goto: gotoSetup } = useSetup();
  const { goto: gotoPage } = usePageState();
  const messageApi = useMessageApi();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPassword = Form.useWatch('currentPassword', form);
  const { isValid: passwordsValid } = usePasswordSetupValidity(form);
  const isFormValid = !!currentPassword && passwordsValid;

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
    <Flex style={cardStyles} vertical>
      <CardFlex $gap={24} $padding="32px">
        <Flex vertical gap={16}>
          <BackButton onPrev={() => goto(SettingsScreenMap.Main)} />
          <Flex vertical gap={12}>
            <Title level={3} className="m-0">
              Set New Password
            </Title>
            <Text className="text-neutral-secondary">
              Change the password you use to unlock Pearl.
            </Text>
          </Flex>
        </Flex>

        <Alert
          type="info"
          showIcon
          message={PASSWORD_REQUIREMENTS_MESSAGE}
          className="text-sm"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={(changed) => {
            // antd doesn't auto-clear errors set via form.setFields; do it
            // ourselves when the user retypes the rejected field. Guarded so
            // we only re-render when there's actually an error to clear.
            if (
              'currentPassword' in changed &&
              form.getFieldError('currentPassword').length > 0
            ) {
              form.setFields([{ name: 'currentPassword', errors: [] }]);
            }
          }}
          autoComplete="off"
          requiredMark={RequiredMark}
        >
          <Flex vertical gap={24}>
            <Form.Item
              name="currentPassword"
              label={<FormLabel>Current password</FormLabel>}
              rules={[{ required: true }]}
              extra={
                <Button
                  type="link"
                  className="text-sm w-fit p-0"
                  style={{ height: 'auto' }}
                  onClick={() => {
                    gotoSetup(SETUP_SCREEN.AccountRecovery);
                    gotoPage(PAGES.Setup);
                  }}
                >
                  Forgot your password?
                </Button>
              }
              labelCol={{ style: { paddingBottom: 4 } }}
              style={{ marginBottom: 0 }}
            >
              <Input.Password size="large" maxLength={64} />
            </Form.Item>

            <PasswordSetupFields />

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                size="large"
                type="primary"
                htmlType="submit"
                disabled={!isFormValid}
                loading={isSubmitting}
                style={{ width: '100%' }}
              >
                Update Password
              </Button>
            </Form.Item>
          </Flex>
        </Form>
      </CardFlex>
    </Flex>
  );
};
