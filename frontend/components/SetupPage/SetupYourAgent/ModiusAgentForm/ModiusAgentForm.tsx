import { Button, Divider, Form, Input, message, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { COINGECKO_URL, TENDERLY_URL } from '@/constants/urls';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { InvalidGeminiApiCredentials } from '../shared/components';
import {
  modiusAgentFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
  validateSlug,
} from '../shared/formUtils';
import { onDummyServiceCreation } from '../shared/utils';
import {
  CoinGeckoApiKeyLabel,
  ModiusGeminiApiKeyLabel,
  TenderlyAccessTokenLabel,
  TenderlyAccountSlugLabel,
  TenderlyProjectSlugLabel,
} from './labels';
import { FieldValues, useModiusFormValidate } from './useModiusFormValidate';

const { Text } = Typography;

const SetupHeader = () => (
  <Text>
    Set up your agent with access to a{' '}
    <a target="_blank" href={TENDERLY_URL}>
      Tenderly
    </a>{' '}
    project for simulating bridge and swap routes, and swap routes and provide a{' '}
    <a target="_blank" href={COINGECKO_URL}>
      CoinGecko API key
    </a>{' '}
    as a price source.
  </Text>
);

type ModiusAgentFormProps = { serviceTemplate: ServiceTemplate };

export const ModiusAgentForm = ({ serviceTemplate }: ModiusAgentFormProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<FieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useModiusFormValidate();

  const onFinish = useCallback(
    async (values: Record<keyof FieldValues, string>) => {
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
              value: values.CoinGeckoApiKey,
            },
            GENAI_API_KEY: {
              ...serviceTemplate.env_variables.GENAI_API_KEY,
              value: values.geminiApiKey,
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
      <Divider style={{ margin: '8px 0' }} />

      <Form<FieldValues>
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
          {...modiusAgentFieldProps}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="tenderlyAccountSlug"
          label={<TenderlyAccountSlugLabel />}
          {...modiusAgentFieldProps}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="tenderlyProjectSlug"
          label={<TenderlyProjectSlugLabel />}
          {...modiusAgentFieldProps}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="CoinGeckoApiKey"
          label={<CoinGeckoApiKeyLabel />}
          {...modiusAgentFieldProps}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="geminiApiKey"
          label={<ModiusGeminiApiKeyLabel />}
          {...modiusAgentFieldProps}
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
