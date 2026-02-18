import { Button, Flex, Form, FormInstance, Input, Typography } from 'antd';
import React from 'react';
import zxcvbn from 'zxcvbn';

import { Alert, BackButton, FormLabel } from '@/components/ui';
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

const SetupPasswordTitle = ({ title }: { title: string }) => (
  <Flex vertical gap={12}>
    <Title level={3} className="m-0">
      {title}
    </Title>
    <Text className="text-neutral-secondary">
      Your password must be at least 8 characters long.
      <br />
      Use a mix of letters, numbers, and symbols.
    </Text>
  </Flex>
);

const PasswordStrength = ({ score }: { score: number }) => {
  return (
    <Text style={{ color: COLOR.GRAY_2 }}>
      Password strength:{' '}
      <span style={{ color: colors[score] }}>{strength[score]}</span>
    </Text>
  );
};

type PasswordFormValues = {
  form: FormInstance;
  onFinish: (values: { password: string }) => void;
  isSubmitting: boolean;
  onBack: () => void;
  isPasswordValid: boolean;
  title?: string;
  info?: string;
  label?: string;
};

export const PasswordForm = ({
  isPasswordValid,
  form,
  onFinish,
  isSubmitting,
  onBack,
  title = 'Set Password',
  info,
  label = 'Enter password',
}: PasswordFormValues) => {
  const password = Form.useWatch('password', form);

  return (
    <CardFlex $gap={16} $padding="24px 32px" $noBorder>
      <BackButton onPrev={onBack} />
      <SetupPasswordTitle title={title} />

      {info && (
        <Alert type="info" message={info} showIcon className="text-sm" />
      )}

      <Form
        name="createPassword"
        form={form}
        onFinish={onFinish}
        layout="vertical"
      >
        <Form.Item
          name="password"
          label={<FormLabel>{label}</FormLabel>}
          help={
            password && password.length > 0 && isPasswordValid ? (
              <PasswordStrength score={zxcvbn(password).score} />
            ) : null
          }
          rules={[
            { required: true, message: 'Please input a Password.' },
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
            loading={isSubmitting}
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
