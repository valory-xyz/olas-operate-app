import { Button, Flex, Form, FormInstance, Input, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import zxcvbn from 'zxcvbn';

import { BackButton, FormLabel } from '@/components/ui';
import { COLOR } from '@/constants';

import { CardFlex } from '../CardFlex';

const { Title, Text } = Typography;

const strength = [
  'Too weak',
  'Weak',
  'Moderate',
  'Strong',
  'Very strong! Nice job!',
] as const;

const colors = [
  COLOR.RED,
  COLOR.WARNING,
  COLOR.SUCCESS,
  COLOR.SUCCESS,
  COLOR.PURPLE,
] as const;

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

type PasswordFormValues = {
  form: FormInstance;
  onFinish?: (values: { password: string }) => void;
  isLoading?: boolean;
  onBack: () => void;
};

export const PasswordForm = ({
  form,
  onFinish,
  isLoading,
  onBack,
}: PasswordFormValues) => {
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

  return (
    <CardFlex $gap={10} styles={{ body: { padding: '12px 24px' } }} $noBorder>
      <BackButton onPrev={onBack} />
      <SetupPasswordTitle />

      <Form
        name="createEoa"
        form={form}
        layout="vertical"
        onFinish={onFinish}
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
          <Input.Password size="large" placeholder="Password" maxLength={64} />
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
