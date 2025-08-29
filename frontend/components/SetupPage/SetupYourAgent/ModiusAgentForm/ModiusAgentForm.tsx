import { Button, Form, Input, message } from 'antd';
import React, { ReactNode, useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { onDummyServiceCreation } from '@/utils/service';

import {
  optionalFieldProps,
  requiredFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
  validateSlug,
} from '../../../AgentForms/common/formUtils';
import { InvalidGeminiApiCredentials } from '../../../AgentForms/common/InvalidGeminiApiCredentials';
import {
  CoinGeckoApiKeyDesc,
  CoinGeckoApiKeySubHeader,
  GeminiApiKeyDesc,
  GeminiApiKeyLabel,
  GeminiApiKeySubHeader,
  TenderlyAccessTokenDesc,
  TenderlyApiKeySubHeader,
} from '../../../AgentForms/common/labels';
import {
  ModiusFieldValues,
  useModiusFormValidate,
} from './useModiusFormValidate';

type ModiusAgentFormContentProps = {
  serviceTemplate: ServiceTemplate;
};

export const ModiusAgentFormContent = ({
  serviceTemplate,
}: ModiusAgentFormContentProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<ModiusFieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useModiusFormValidate();

  const onFinish = useCallback(
    async (values: ModiusFieldValues) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);

        // wait for agent setup to complete
        updateSubmitButtonText('Setting up agent...');

        const isFormValid = await validateForm(values);
        if (!isFormValid) return;

        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          env_variables: {
            ...serviceTemplate.env_variables,
            TENDERLY_ACCESS_KEY: {
              ...serviceTemplate.env_variables.TENDERLY_ACCESS_KEY,
              value: values.tenderlyAccessToken,
            },
            TENDERLY_ACCOUNT_SLUG: {
              ...serviceTemplate.env_variables.TENDERLY_ACCOUNT_SLUG,
              value: values.tenderlyAccountSlug,
            },
            TENDERLY_PROJECT_SLUG: {
              ...serviceTemplate.env_variables.TENDERLY_PROJECT_SLUG,
              value: values.tenderlyProjectSlug,
            },
            COINGECKO_API_KEY: {
              ...serviceTemplate.env_variables.COINGECKO_API_KEY,
              value: values.coinGeckoApiKey,
            },
            GENAI_API_KEY: {
              ...serviceTemplate.env_variables.GENAI_API_KEY,
              value: values.geminiApiKey || '',
            },
          },
        };

        await onDummyServiceCreation(
          defaultStakingProgramId,
          overriddenServiceConfig,
        );

        message.success('Agent setup complete');

        // move to next page
        goto(SetupScreen.SetupEoaFunding);
      } catch (error) {
        message.error('Something went wrong. Please try again.');
        console.error(error);
      } finally {
        setIsSubmitting(false);
        updateSubmitButtonText('Continue');
      }
    },
    [
      defaultStakingProgramId,
      serviceTemplate,
      validateForm,
      updateSubmitButtonText,
      goto,
    ],
  );

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    updateSubmitButtonText('Continue');
  });

  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  return (
    <>
      <Form<ModiusFieldValues>
        form={form}
        name="setup-your-agent"
        layout="vertical"
        onFinish={onFinish}
        validateMessages={validateMessages}
        disabled={canSubmitForm}
      >
        <TenderlyApiKeySubHeader isSetupPage />
        <Form.Item
          label="Tenderly access token"
          name="tenderlyAccessToken"
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          label="Tenderly account slug"
          name="tenderlyAccountSlug"
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Tenderly project slug"
          name="tenderlyProjectSlug"
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>
        <div style={{ paddingBottom: 42 }} />

        <CoinGeckoApiKeySubHeader isSetupPage />
        <Form.Item
          label="CoinGecko API key"
          name="coinGeckoApiKey"
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>
        <div style={{ paddingBottom: 42 }} />

        <GeminiApiKeySubHeader name="Modius" isSetupPage />
        <Form.Item
          name="geminiApiKey"
          label={<GeminiApiKeyLabel />}
          {...optionalFieldProps}
        >
          <Input.Password />
        </Form.Item>
        {geminiApiKeyValidationStatus === 'invalid' && (
          <InvalidGeminiApiCredentials />
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isSubmitting}
            disabled={canSubmitForm}
          >
            {submitButtonText}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export const ModiusAgentForm = ({
  serviceTemplate,
  renderForm,
}: ModiusAgentFormContentProps & {
  renderForm: (form: ReactNode, desc: ReactNode) => ReactNode;
}) =>
  renderForm(
    <ModiusAgentFormContent serviceTemplate={serviceTemplate} />,
    <>
      <TenderlyAccessTokenDesc />
      <CoinGeckoApiKeyDesc />
      <GeminiApiKeyDesc />
    </>,
  );
