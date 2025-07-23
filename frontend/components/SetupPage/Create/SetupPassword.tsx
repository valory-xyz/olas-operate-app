import { Button, Checkbox, Form, Input, Typography } from 'antd';
import React, { useState } from 'react';
import zxcvbn from 'zxcvbn';

import { COLOR } from '@/constants/colors';
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

const PasswordStrength = ({ score }: { score: number }) => {
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
  const [passwordScore, setPasswordScore] = useState(0);
  const message = useMessageApi();
  const [isLoading, setIsLoading] = useState(false);
  const isTermsAccepted = Form.useWatch('terms', form);
  const password = Form.useWatch('password', form);

  const handleCreateEoa = async ({ password }: { password: string }) => {
    if (!isTermsAccepted || passwordScore < 2) return;

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setFieldsValue({ password: value });
    const result = zxcvbn(value);
    setPasswordScore(result.score);
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
      >
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: false }]}
        >
          <Input.Password
            size="large"
            placeholder="Password"
            onChange={handlePasswordChange}
          />
          {password && <PasswordStrength score={passwordScore} />}
        </Form.Item>

        <Form.Item name="terms" valuePropName="checked">
          <Checkbox>
            I agree to the Pearl’s{' '}
            <a
              href="https://olas.network/pearl-terms"
              target="_blank"
              rel="noreferrer"
            >
              Terms & Conditions
            </a>
          </Checkbox>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            size="large"
            type="primary"
            htmlType="submit"
            disabled={!isTermsAccepted || passwordScore < 2}
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
