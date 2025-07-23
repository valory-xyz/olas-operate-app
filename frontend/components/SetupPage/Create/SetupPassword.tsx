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
import { PasswordStrength } from './PasswordStrength';
import { SetupCreateHeader } from './SetupCreateHeader';

const { Title, Text } = Typography;

export const SetupPassword = () => {
  const { goto, setMnemonic } = useSetup();
  const { setUserLoggedIn } = usePageState();
  const [form] = Form.useForm<{ password: string; terms: boolean }>();
  const [passwordScore, setPasswordScore] = useState(0);
  const message = useMessageApi();
  const [isLoading, setIsLoading] = useState(false);
  const isTermsAccepted = Form.useWatch('terms', form);
  const password = Form.useWatch('password', form);

  useEffect(() => {
    if (password) {
      const result = zxcvbn(password);
      setPasswordScore(result.score);
    } else {
      setPasswordScore(0);
    }
  }, [password]);

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
        <div>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please input a Password!' }]}
          >
            <Input.Password size="large" placeholder="Password" />
          </Form.Item>
          <Form.Item
            shouldUpdate={(prev, curr) => prev.password !== curr.password}
          >
            {({ getFieldValue }) => {
              const password = getFieldValue('password') || '';
              const score = password ? zxcvbn(password).score : 0;
              return password.length > 0 ? (
                <PasswordStrength score={score} />
              ) : null;
            }}
          </Form.Item>
        </div>

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
