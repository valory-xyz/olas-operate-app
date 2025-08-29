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
  OptimusFieldValues,
  useOptimusFormValidate,
} from './useOptimusFormValidate';

type OptimusAgentFormContentProps = {
  serviceTemplate: ServiceTemplate;
};

type FormStep = 'tenderly' | 'coingecko' | 'gemini';

const isSetupPage = false; // TODO;

const OptimusAgentFormContent = ({
  serviceTemplate,
}: OptimusAgentFormContentProps) => {
  const [form] = Form.useForm<OptimusFieldValues>();
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [currentStep, setCurrentStep] = useState<FormStep>('tenderly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useOptimusFormValidate();

  const moveToNextStep = useCallback(() => {
    if (currentStep === 'tenderly') {
      setCurrentStep('coingecko');
    } else if (currentStep === 'coingecko') {
      setCurrentStep('gemini');
    }
  }, [currentStep]);

  const onFinish = useCallback(
    async (values: OptimusFieldValues) => {
      if (!defaultStakingProgramId) return;
      if (isSetupPage && currentStep !== 'gemini') {
        moveToNextStep();
        return;
      }

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
      currentStep,
      moveToNextStep,
    ],
  );

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    updateSubmitButtonText('Continue');
  });

  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  const isTenderlySectionVisible = isSetupPage
    ? currentStep === 'tenderly'
    : true;
  const isCoinGeckoSectionVisible = isSetupPage
    ? currentStep === 'coingecko'
    : true;
  const isGeminiSectionVisible = isSetupPage ? currentStep === 'gemini' : true;

  return (
    <>
      <Form<OptimusFieldValues>
        form={form}
        name="setup-your-agent"
        layout="vertical"
        onFinish={onFinish}
        validateMessages={validateMessages}
        disabled={canSubmitForm}
        className="label-no-padding"
      >
        {isTenderlySectionVisible && (
          <>
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
          </>
        )}

        {isCoinGeckoSectionVisible && (
          <>
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
          </>
        )}

        {isGeminiSectionVisible && (
          <>
            <GeminiApiKeySubHeader name="Optimus" isSetupPage />
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
          </>
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
      <TenderlyAccessTokenDesc />
      <CoinGeckoApiKeyDesc />
      <GeminiApiKeyDesc />
    </>,
  );
