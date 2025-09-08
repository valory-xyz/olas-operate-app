import { Button, Flex, Form, Input, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import zxcvbn from 'zxcvbn';

import { BackButton } from '@/components/ui/BackButton';
import { FormLabel } from '@/components/ui/Typography';
import { COLOR } from '@/constants/colors';
import { useMessageApi } from '@/context/MessageProvider';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';
import { AccountService } from '@/service/Account';
import { WalletService } from '@/service/Wallet';
import { getErrorMessage } from '@/utils/error';

import { CardFlex } from '../../ui/CardFlex';

const { Title, Text } = Typography;

const strength = [
  'Too weak',
  'Weak',
  'Moderate',
  'Strong',
  'Very strong! Nice job!',
];

const colors = [
  COLOR.RED,
  COLOR.WARNING,
  COLOR.SUCCESS,
  COLOR.SUCCESS,
  COLOR.PURPLE,
];

const SetupPasswordTitle = () => (
  <Flex vertical gap={12} style={{ marginBottom: 24 }}>
    <Title level={3} className="m-0">
      Set Password
    </Title>
    <Text type="secondary">
      Your password must be at least 8 characters long. Use a mix of letters,
      numbers, and symbols.
    </Text>
  </Flex>
);

export const PasswordStrength = ({ score }: { score: number }) => {
  return (
    <Text style={{ color: COLOR.GRAY_2 }}>
      Password strength:{' '}
      <span style={{ color: colors[score] }}>{strength[score]}</span>
    </Text>
  );
};

export const SetupPassword = () => {
  const { goto, setMnemonic } = useSetup();
  const { setUserLoggedIn } = usePageState();
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
      .then(({ mnemonic }: { mnemonic: string[] }) => {
        setMnemonic(mnemonic);
        goto(SetupScreen.SetupSeedPhrase);
        setUserLoggedIn();
      })
      .catch((e: unknown) => {
        message.error(getErrorMessage(e));
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <CardFlex $gap={10} styles={{ body: { padding: '12px 24px' } }} $noBorder>
      <BackButton onPrev={() => goto(SetupScreen.Welcome)} />
      <SetupPasswordTitle />

      <Form
        name="createEoa"
        form={form}
        layout="vertical"
        onFinish={handleCreateEoa}
        requiredMark={false}
      >
        <Form.Item
          name="password"
          label={<FormLabel>Enter password</FormLabel>}
          help={
            password && password.length > 0 && isPasswordValid ? (
              <PasswordStrength score={zxcvbn(password).score} />
            ) : null
          }
          rules={[
            { required: true, message: 'Please input a Password!' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const isAscii = /^[\x20-\x7E]*$/.test(value);
                if (!isAscii) {
                  return Promise.reject(
                    new Error('Password must only contain ASCII characters.'),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
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
            disabled={!isPasswordValid || password?.length < 8}
            loading={isLoading}
            className="mt-24"
            style={{ width: '100%' }}
          >
            Continue
          </Button>
        </Form.Item>
      </Form>
    </CardFlex>
  );
};
