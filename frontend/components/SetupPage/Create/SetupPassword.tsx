import { Button, Flex, Form, Typography } from 'antd';
import React, { useState } from 'react';

import { BackButton, CardFlex } from '@/components/ui';
import {
  PasswordSetupFields,
  usePasswordSetupValidity,
} from '@/components/ui/forms';
import { SETUP_SCREEN } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useMnemonicExists, usePageState, useSetup } from '@/hooks';
import { AccountService } from '@/service/Account';
import { WalletService } from '@/service/Wallet';
import { getErrorMessage } from '@/utils';

const { Title, Text } = Typography;

export const SetupPassword = () => {
  const { goto, setPassword } = useSetup();
  const { setUserLoggedIn } = usePageState();
  const { setMnemonicExists } = useMnemonicExists();
  const [form] = Form.useForm<{
    newPassword: string;
    confirmNewPassword: string;
  }>();
  const message = useMessageApi();
  const [isLoading, setIsLoading] = useState(false);
  const { isValid } = usePasswordSetupValidity(form);

  const handleCreateEoa = async ({
    newPassword,
  }: {
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    if (!isValid) return;

    setIsLoading(true);
    AccountService.createAccount(newPassword)
      .then(() => AccountService.loginAccount(newPassword))
      .then(() => WalletService.createEoa())
      .then(() => {
        // Mnemonic is always created for new accounts
        setMnemonicExists(true);
        setUserLoggedIn();
        // Hold the password in setup context so the backup-wallet step can
        // eager-write canonical_backup_owner right after the user picks an
        // address. Cleared by useApplyBackupDuringSetup once applied.
        setPassword(newPassword);
        goto(SETUP_SCREEN.SetupBackupSigner);
      })
      .catch((e: unknown) => {
        message.error(getErrorMessage(e));
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <CardFlex $gap={16} $padding="24px 32px" $noBorder>
      <BackButton onPrev={() => goto(SETUP_SCREEN.Welcome)} />

      <Flex vertical gap={12}>
        <Title level={3} className="m-0">
          Set Password
        </Title>
        <Text className="text-neutral-secondary">
          Your password must be at least 8 characters long.
          <br />
          Use a mix of letters, numbers, and symbols.
        </Text>
      </Flex>

      <Form
        name="createPassword"
        form={form}
        onFinish={handleCreateEoa}
        layout="vertical"
      >
        <Flex vertical gap={24}>
          <PasswordSetupFields
            firstFieldLabel="Enter password"
            secondFieldLabel="Confirm password"
          />

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              size="large"
              type="primary"
              htmlType="submit"
              disabled={!isValid}
              loading={isLoading}
              style={{ width: '100%' }}
            >
              Continue
            </Button>
          </Form.Item>
        </Flex>
      </Form>
    </CardFlex>
  );
};
