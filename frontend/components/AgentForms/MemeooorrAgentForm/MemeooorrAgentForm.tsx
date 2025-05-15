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

import { UNICODE_SYMBOLS } from '@/constants/symbols';

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

const XAccountApiTokens = () => (
  <Flex vertical gap={4}>
    <Title level={5} className="m-0">
      X account API tokens
    </Title>
    <Text type="secondary" className="mb-16">
      Create a new account for your agent at{' '}
      <a href="https://x.com" target="_blank" rel="noreferrer">
        x.com
      </a>{' '}
      and provide X API tokens from X Developer Portal. This enables your agent
      to view X and interact with other agents. Please refer to the{' '}
      <a
        href="https://github.com/dvilelaf/meme-ooorr/blob/main/docs/twitter_dev_account.md"
        target="_blank"
        rel="noreferrer"
      >
        Step-by-step guide
      </a>{' '}
      {UNICODE_SYMBOLS.EXTERNAL_LINK}.
    </Text>
  </Flex>
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
      <Divider style={{ margin: '8px 0' }} />
      <XAccountApiTokens />

      <Form.Item
        name="xConsumerApiKey"
        label="Consumer API key"
        {...commonFieldProps}
        hasFeedback
      >
        <Input placeholder="Consumer API key" />
      </Form.Item>

      <Form.Item
        name="xConsumerApiSecret"
        label="Consumer API key secret"
        {...commonFieldProps}
      >
        <Input placeholder="Consumer API key secret" />
      </Form.Item>

      <Form.Item name="xBearerToken" label="Bearer Token" {...commonFieldProps}>
        <Input placeholder="Bearer token" />
      </Form.Item>

      <Form.Item name="xAccessToken" label="Access Token" {...commonFieldProps}>
        <Input placeholder="Access token" />
      </Form.Item>

      <Form.Item
        name="xAccessTokenSecret"
        label="Access token secret"
        {...commonFieldProps}
      >
        <Input placeholder="Access token secret" />
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
