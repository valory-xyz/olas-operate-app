import {
  Button,
  Divider,
  Flex,
  Form,
  FormInstance,
  FormProps,
  Input,
  Typography,
} from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { CustomAlert } from '@/components/Alert';

import {
  commonFieldProps,
  emailValidateMessages,
  requiredRules,
} from '../common/formUtils';
import { InvalidGeminiApiCredentials } from '../common/InvalidGeminiApiCredentials';
import { FireworksApiFields } from './FireworksApiField';
import {
  MemeooorrFieldValues,
  useMemeFormValidate,
} from './useMemeFormValidate';

const { Title, Text } = Typography;

export type MemeooorrFormValues = MemeooorrFieldValues & {
  fireworksApiEnabled: boolean;
  fireworksApiKeyName?: string;
  xCookies?: string;
};

export const XAccountCredentials = () => (
  <Flex vertical>
    <Divider style={{ margin: '8px 0 16px 0' }} />
    <Title level={5} className="mt-0">
      X account credentials
    </Title>
    <Text type="secondary" className="mb-16">
      Create a new account for your agent at{' '}
      <a href="https://x.com" target="_blank" rel="noreferrer">
        x.com
      </a>{' '}
      and enter the login details. This enables your agent to view X and
      interact with other agents.
    </Text>
    <CustomAlert
      type="warning"
      showIcon
      message={
        <Flex justify="space-between" gap={4} vertical>
          <Text>
            To avoid your X account getting suspended for bot activity, complete
            the onboarding steps. You can find them on your profile page under
            &quot;Let&lsquo;s get you set up&quot;.
          </Text>
        </Flex>
      }
      className="mb-16"
    />
  </Flex>
);

export const InvalidXCredentials = () => (
  <CustomAlert
    type="error"
    showIcon
    message={<Text>X account credentials are invalid or 2FA is enabled.</Text>}
    className="mb-16"
  />
);

type MemeooorrAgentFormProps = {
  isFormEnabled?: boolean;
  initialValues?: MemeooorrFormValues;
  form?: FormInstance;
  variant?: FormProps['variant'];
  onSubmit: (values: MemeooorrFormValues, cookies: string) => Promise<void>;
};

export const MemeooorrAgentForm = ({
  isFormEnabled = true,
  initialValues,
  onSubmit,
  variant,
  form: formInstance,
}: MemeooorrAgentFormProps) => {
  const [formState] = Form.useForm<MemeooorrFormValues>();
  const form = useMemo(
    () => formInstance || formState,
    [formInstance, formState],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    submitButtonText,
    setSubmitButtonText,
    geminiApiKeyValidationStatus,
    setGeminiApiKeyValidationStatus,
    twitterCredentialsValidationStatus,
    setTwitterCredentialsValidationStatus,
    validateForm,
  } = useMemeFormValidate();

  const onFinish = useCallback(
    async (values: MemeooorrFormValues) => {
      try {
        setIsSubmitting(true);

        const cookies = await validateForm(values);
        if (!cookies) return;

        form.setFieldValue('xCookies', cookies);
        await onSubmit(values, cookies);
      } finally {
        setSubmitButtonText('Continue');
        setIsSubmitting(false);
      }
    },
    [onSubmit, validateForm, setIsSubmitting, setSubmitButtonText, form],
  );

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    setGeminiApiKeyValidationStatus('unknown');
    setTwitterCredentialsValidationStatus('unknown');
    setSubmitButtonText('Continue');
  });

  const isFormDisabled = !isFormEnabled || isSubmitting;

  return (
    <Form<MemeooorrFormValues>
      form={form}
      initialValues={initialValues}
      onFinish={onFinish}
      disabled={isFormDisabled}
      validateMessages={emailValidateMessages}
      variant={variant}
      name="setup-your-memeooorr-agent"
      layout="vertical"
    >
      <Form.Item
        name="personaDescription"
        label="Persona Description"
        {...commonFieldProps}
      >
        <Input.TextArea
          size="small"
          rows={4}
          placeholder="Describe your agent's persona"
        />
      </Form.Item>

      <Form.Item
        name="geminiApiKey"
        label="Gemini API Key"
        {...commonFieldProps}
      >
        <Input.Password placeholder="Google Gemini API key" />
      </Form.Item>
      {geminiApiKeyValidationStatus === 'invalid' && (
        <InvalidGeminiApiCredentials />
      )}

      <FireworksApiFields />

      {/* X */}
      <XAccountCredentials />
      {twitterCredentialsValidationStatus === 'invalid' && (
        <InvalidXCredentials />
      )}

      <Form.Item
        name="xEmail"
        label="X email"
        rules={[{ required: true, type: 'email' }]}
        hasFeedback
      >
        <Input placeholder="X Email" />
      </Form.Item>

      <Form.Item name="xUsername" label="X username" {...commonFieldProps}>
        <Input
          placeholder="X Username"
          addonBefore="@"
          onKeyDown={(e) => {
            if (e.key === '@') {
              e.preventDefault();
            }
          }}
        />
      </Form.Item>

      <Form.Item
        name="xPassword"
        label="X password"
        {...commonFieldProps}
        rules={[
          ...requiredRules,
          {
            validator: (_, value) => {
              if (value && value.includes('$')) {
                return Promise.reject(
                  new Error(
                    'Password must not contain the “$” symbol. Please update your password on Twitter, then retry.',
                  ),
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input.Password placeholder="X Password" />
      </Form.Item>

      <Form.Item name="xCookies" hidden />

      <Form.Item hidden={variant === 'borderless'}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={isSubmitting}
          disabled={!isFormEnabled}
        >
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};
