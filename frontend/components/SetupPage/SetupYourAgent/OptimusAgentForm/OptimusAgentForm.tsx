import { Button, Form, Input, message, Typography } from 'antd';
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
  CoinGeckoApiKeyLabel,
  CoinGeckoApiKeyLabelV2,
  GeminiApiKeyLabel,
  GeminiApiKeyLabelV2,
  TenderlyAccessTokenLabel,
  TenderlyAccessTokenLabelV2,
  TenderlyAccountSlugLabel,
  TenderlyProjectSlugLabel,
} from '../../../AgentForms/common/labels';
import {
  OptimusFieldValues,
  useOptimusFormValidate,
} from './useOptimusFormValidate';

const { Text } = Typography;

const SetupHeader = () => (
  <Text>
    Your agent needs access to a Tenderly project for simulating bridge and swap
    routes for on-chain transactions.
  </Text>
);

type OptimusAgentFormContentProps = {
  serviceTemplate: ServiceTemplate;
};

const OptimusAgentFormContent = ({
  serviceTemplate,
}: OptimusAgentFormContentProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<OptimusFieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useOptimusFormValidate();

  const onFinish = useCallback(
    async (values: OptimusFieldValues) => {
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
      <SetupHeader />
      {/* {renderDesc(<TenderlyInfo />)} */}

      <Form<OptimusFieldValues>
        form={form}
        name="setup-your-agent"
        layout="vertical"
        onFinish={onFinish}
        validateMessages={validateMessages}
        disabled={canSubmitForm}
      >
        <Form.Item
          name="tenderlyAccessToken"
          label={<TenderlyAccessTokenLabel />}
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="tenderlyAccountSlug"
          label={<TenderlyAccountSlugLabel />}
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="tenderlyProjectSlug"
          label={<TenderlyProjectSlugLabel />}
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="coinGeckoApiKey"
          label={<CoinGeckoApiKeyLabel />}
          {...requiredFieldProps}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="geminiApiKey"
          label={<GeminiApiKeyLabel name="Optimus" />}
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

export const OptimusAgentForm = ({
  serviceTemplate,
  renderForm,
}: OptimusAgentFormContentProps & {
  renderForm: (form: ReactNode, desc: ReactNode) => ReactNode;
}) =>
  renderForm(
    <OptimusAgentFormContent serviceTemplate={serviceTemplate} />,
    <>
      <TenderlyAccessTokenLabelV2 />
      <CoinGeckoApiKeyLabelV2 />
      <GeminiApiKeyLabelV2 />
    </>,
  );
