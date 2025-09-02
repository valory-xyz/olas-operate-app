import {
  Button,
  Divider,
  Flex,
  Form,
  FormInstance,
  Input,
  Typography,
} from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { CustomAlert } from '@/components/Alert';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { useSharedContext } from '@/hooks/useSharedContext';

import { commonFieldProps, emailValidateMessages } from '../common/formUtils';
import { InvalidGeminiApiCredentials } from '../common/InvalidGeminiApiCredentials';
import { FireworksApiFields } from './FireworksApiField';
import { AgentsFunFormValues } from './types';
import { useMemeFormValidate } from './useMemeFormValidate';

const { Title, Text } = Typography;

type XAccountApiTokensProps = { showTokensRequiredMessage?: boolean };

const XAccountApiTokens = ({
  showTokensRequiredMessage,
}: XAccountApiTokensProps) => (
  <Flex vertical gap={4}>
    <Title level={5} className="m-0">
      X account API tokens
    </Title>
    <Text type="secondary" className="mb-16">
      X account API tokens enable your agent to view X and interact with other
      agents. To get the API tokens, please refer to the{' '}
      <a
        href="https://github.com/dvilelaf/meme-ooorr/blob/main/docs/twitter_dev_account.md"
        target="_blank"
        rel="noreferrer"
      >
        Step-by-step guide
      </a>{' '}
      {UNICODE_SYMBOLS.EXTERNAL_LINK}.
    </Text>
    {showTokensRequiredMessage && (
      <CustomAlert
        type="error"
        showIcon
        className="mb-16"
        message={
          <Flex vertical>
            <Text>X account API tokens are required.</Text>
          </Flex>
        }
      />
    )}
  </Flex>
);

type AgentsFunAgentFormProps = {
  isFormEnabled?: boolean;
  initialValues?: AgentsFunFormValues;
  agentFormType: 'view' | 'create' | 'update';
  form?: FormInstance;
  onSubmit: (values: AgentsFunFormValues) => Promise<void>;
};

/**
 * Form for setting up a AgentsFun agent (To setup and update the agent).
 */
export const AgentsFunAgentForm = ({
  isFormEnabled = true,
  agentFormType,
  initialValues,
  onSubmit,
  form: formInstance,
}: AgentsFunAgentFormProps) => {
  const [formState] = Form.useForm<AgentsFunFormValues>();

  const { isAgentsFunFieldUpdateRequired } = useSharedContext();
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
    async (values: AgentsFunFormValues) => {
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
    <Form<AgentsFunFormValues>
      form={form}
      initialValues={initialValues}
      onFinish={onFinish}
      disabled={isFormDisabled}
      validateMessages={emailValidateMessages}
      variant={agentFormType === 'view' ? 'borderless' : 'outlined'}
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
      <XAccountApiTokens
        showTokensRequiredMessage={
          isAgentsFunFieldUpdateRequired && agentFormType !== 'create'
        }
      />

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
        name="xConsumerApiKey"
        label="Consumer API key"
        {...commonFieldProps}
        hasFeedback
      >
        <Input.Password placeholder="Consumer API key" />
      </Form.Item>

      <Form.Item
        name="xConsumerApiSecret"
        label="Consumer API key secret"
        {...commonFieldProps}
      >
        <Input.Password placeholder="Consumer API key secret" />
      </Form.Item>

      <Form.Item name="xBearerToken" label="Bearer Token" {...commonFieldProps}>
        <Input.Password placeholder="Bearer token" />
      </Form.Item>

      <Form.Item name="xAccessToken" label="Access Token" {...commonFieldProps}>
        <Input.Password placeholder="Access token" />
      </Form.Item>

      <Form.Item
        name="xAccessTokenSecret"
        label="Access token secret"
        {...commonFieldProps}
      >
        <Input.Password placeholder="Access token secret" />
      </Form.Item>

      <Form.Item hidden={agentFormType === 'view'}>
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
