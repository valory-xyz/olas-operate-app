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

import { commonFieldProps, emailValidateMessages } from '../common/formUtils';
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
  xConsumerApiKey: string;
  xConsumerApiSecret: string;
  xBearerToken: string;
  xAccessToken: string;
  xAccessTokenSecret: string;
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
  onSubmit: (values: MemeooorrFormValues) => Promise<void>;
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
    validateForm,
  } = useMemeFormValidate();

  const onFinish = useCallback(
    async (values: MemeooorrFormValues) => {
      try {
        setIsSubmitting(true);

        const isValidated = await validateForm(values);
        if (!isValidated) return;
        await onSubmit(values);
      } finally {
        setSubmitButtonText('Continue');
        setIsSubmitting(false);
      }
    },
    [onSubmit, setIsSubmitting, setSubmitButtonText, validateForm],
  );

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    setGeminiApiKeyValidationStatus('unknown');
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

      {/* X account tokens */}
      <Form.Item
        name="xConsumerApiKey"
        label="X Consumer API key"
        {...commonFieldProps}
        hasFeedback
      >
        <Input placeholder="X Consumer API Key" />
      </Form.Item>

      <Form.Item
        name="xConsumerApiSecret"
        label="X Consumer API secret"
        {...commonFieldProps}
      >
        <Input placeholder="X Consumer API Secret" />
      </Form.Item>

      <Form.Item
        name="xBearerToken"
        label="X Bearer Token"
        {...commonFieldProps}
      >
        <Input placeholder="X Bearer Token" />
      </Form.Item>

      <Form.Item
        name="xAccessToken"
        label="X Access Token"
        {...commonFieldProps}
      >
        <Input placeholder="X Access Token" />
      </Form.Item>

      <Form.Item
        name="xAccessTokenSecret"
        label="X Access Token Secret"
        {...commonFieldProps}
      >
        <Input placeholder="X Access Token Secret" />
      </Form.Item>

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
