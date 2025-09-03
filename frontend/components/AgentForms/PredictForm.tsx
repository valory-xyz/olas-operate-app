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

import { GEMINI_API_URL } from '@/constants/urls';

import { optionalFieldProps } from './common/formUtils';
import { InvalidGeminiApiCredentials } from './common/InvalidGeminiApiCredentials';
import { validateGeminiApiKey, ValidationStatus } from './common/validations';

const { Text } = Typography;

const GeminiApiKeyLabel = () => (
  <Flex align="center" gap={6}>
    <Text>Gemini API key</Text>
    <Text type="secondary" className="text-sm">
      (Optional)
    </Text>
  </Flex>
);

const GoogleAiStudioHelper = () => (
  <Text type="secondary" className="text-sm">
    The Gemini API key allows you to chat with your agent and update its goals
    through Optimus profile. You can generate one for free on{' '}
    <a target="_blank" rel="noopener noreferrer" href={GEMINI_API_URL}>
      Google AI Studio
    </a>
    .
  </Text>
);

export type PredictFormValues = {
  geminiApiKey: string;
};

export const usePredictFormValidate = () => {
  const [isValidating, setIsValidating] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Continue');
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');

  const handleValidate = useCallback(
    async (values: PredictFormValues): Promise<boolean> => {
      setIsValidating(true);

      setGeminiApiKeyValidationStatus('unknown');
      setSubmitButtonText('Validating Gemini API key...');

      try {
        // gemini api key is optional, so we only validate if it's provided
        if (values.geminiApiKey) {
          const isGeminiApiValid = await validateGeminiApiKey(
            values.geminiApiKey,
          );
          setGeminiApiKeyValidationStatus(
            isGeminiApiValid ? 'valid' : 'invalid',
          );
          if (!isGeminiApiValid) return false;
        }

        // wait for agent setup to complete
        setSubmitButtonText('Setting up agent...');

        return true;
      } catch (error) {
        console.error('Error validating predict form:', error);
      } finally {
        setIsValidating(false);
      }
      return false;
    },
    [],
  );

  return {
    isValidating,
    submitButtonText,
    setSubmitButtonText,
    geminiApiKeyValidationStatus,
    setGeminiApiKeyValidationStatus,
    validateForm: handleValidate,
  };
};

type PredictAgentFormProps = {
  isFormEnabled?: boolean;
  initialValues?: PredictFormValues;
  agentFormType: 'view' | 'create' | 'update';
  form?: FormInstance;
  onSubmit: (values: PredictFormValues) => Promise<void>;
};

/**
 * Form for setting up a Predict agent (To setup and update the agent).
 */
export const PredictAgentForm = ({
  isFormEnabled = true,
  agentFormType,
  initialValues,
  onSubmit,
  form: formInstance,
}: PredictAgentFormProps) => {
  const [formState] = Form.useForm<PredictFormValues>();

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
  } = usePredictFormValidate();

  const onFinish = useCallback(
    async (values: PredictFormValues) => {
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
    <Form<PredictFormValues>
      form={form}
      initialValues={initialValues}
      onFinish={onFinish}
      disabled={isFormDisabled}
      variant={agentFormType === 'view' ? 'borderless' : 'outlined'}
      name="setup-your-predict-agent"
      layout="vertical"
    >
      <Divider style={{ margin: '12px 0 24px 0' }} />
      <Form.Item
        name="geminiApiKey"
        label={<GeminiApiKeyLabel />}
        {...optionalFieldProps}
        style={{ marginBottom: 4 }}
      >
        <Input.Password placeholder="Google Gemini API key" />
      </Form.Item>
      <GoogleAiStudioHelper />
      {geminiApiKeyValidationStatus === 'invalid' && (
        <InvalidGeminiApiCredentials style={{ marginTop: 12 }} />
      )}

      <Divider />

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
