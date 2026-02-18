import { Form } from 'antd';
import React, { useEffect, useState } from 'react';

import { PasswordForm } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useMnemonicExists, usePageState, useSetup } from '@/hooks';
import { AccountService } from '@/service/Account';
import { WalletService } from '@/service/Wallet';
import { getErrorMessage } from '@/utils';

export const SetupPassword = () => {
  const { goto } = useSetup();
  const { setUserLoggedIn } = usePageState();
  const { setMnemonicExists } = useMnemonicExists();
  const [form] = Form.useForm<{ password: string; terms: boolean }>();
  const message = useMessageApi();
  const [isLoading, setIsLoading] = useState(false);
  const password = Form.useWatch('password', form);
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  useEffect(() => {
    if (password !== undefined) {
      form
        .validateFields(['password'])
        .then(() => setIsPasswordValid(true))
        .catch(() => setIsPasswordValid(false));
    } else {
      setIsPasswordValid(false);
    }
  }, [password, form]);

  const handleCreateEoa = async ({ password }: { password: string }) => {
    if (!isPasswordValid || password.length < 8) return;

    setIsLoading(true);
    AccountService.createAccount(password)
      .then(() => AccountService.loginAccount(password))
      .then(() => WalletService.createEoa())
      .then(() => {
        // Mnemonic is always created for new accounts
        setMnemonicExists(true);
        setUserLoggedIn();
        goto(SETUP_SCREEN.SetupBackupSigner);
      })
      .catch((e: unknown) => {
        message.error(getErrorMessage(e));
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <PasswordForm
      form={form}
      onFinish={handleCreateEoa}
      isSubmitting={isLoading}
      onBack={() => goto(SETUP_SCREEN.Welcome)}
      isPasswordValid={isPasswordValid}
    />
  );
};
