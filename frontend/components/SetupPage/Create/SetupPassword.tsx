import { Button, Checkbox, Form, Input, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import zxcvbn from 'zxcvbn';

import { COLOR } from '@/constants/colors';
import { TERMS_AND_CONDITIONS_URL } from '@/constants/urls';
import { useMessageApi } from '@/context/MessageProvider';
import { SetupScreen } from '@/enums/SetupScreen';
import { usePageState } from '@/hooks/usePageState';
import { useSetup } from '@/hooks/useSetup';
import { AccountService } from '@/service/Account';
import { WalletService } from '@/service/Wallet';
import { getErrorMessage } from '@/utils/error';

import { CardFlex } from '../../styled/CardFlex';
import { SetupCreateHeader } from './SetupCreateHeader';

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
  const isTermsAccepted = Form.useWatch('terms', form);
  const password = Form.useWatch('password', form);
  const [isPasswordValid, setIsPasswordValid] = useState(true);

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
    if (!isTermsAccepted || !isPasswordValid || password.length < 8) return;

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
      <SetupCreateHeader prev={SetupScreen.Welcome} />
      <div>
        <Title level={3}>Create account</Title>
        <Text style={{ color: COLOR.GRAY_2 }}>
          Your password must be at least 8 characters long. For a strong
          password, use a mix of letters, numbers, and symbols.
        </Text>
      </div>

      <Form
        name="createEoa"
        form={form}
        layout="horizontal"
        onFinish={handleCreateEoa}
        requiredMark={false}
      >
        <Form.Item
          name="password"
          label="Password"
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
        >
          <Input.Password size="large" placeholder="Password" maxLength={64} />
        </Form.Item>

        <Form.Item name="terms" valuePropName="checked">
          <Checkbox>
            I agree to the Pearl’s{' '}
            <a href={TERMS_AND_CONDITIONS_URL} target="_blank" rel="noreferrer">
              Terms & Conditions
            </a>
          </Checkbox>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            size="large"
            type="primary"
            htmlType="submit"
            disabled={
              !isTermsAccepted || !isPasswordValid || password.length < 8
            }
            loading={isLoading}
            style={{ width: '100%' }}
          >
            Continue
          </Button>
        </Form.Item>
      </Form>
    </CardFlex>
  );
};
