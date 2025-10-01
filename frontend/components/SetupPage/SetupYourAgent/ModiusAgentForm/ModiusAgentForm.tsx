import { Button, Form, Input, message } from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { RequiredMark } from '@/components/ui/RequiredMark';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup, useStakingProgram } from '@/hooks';
import { onDummyServiceCreation } from '@/utils';

import {
  BABYDEGEN_FORM_STEP,
  BabyDegenFormStep,
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
  CoinGeckoApiKeyLabel,
  CoinGeckoApiKeySubHeader,
  GeminiApiKeyDesc,
  GeminiApiKeyLabel,
  GeminiApiKeySubHeader,
  TenderlyAccessTokenDesc,
  TenderlyAccessTokenLabel,
  TenderlyAccountSlugLabel,
  TenderlyApiKeySubHeader,
  TenderlyProjectSlugLabel,
} from '../../../AgentForms/common/labels';
import { RenderForm } from '../useDisplayAgentForm';
import {
  ModiusFieldValues,
  useModiusFormValidate,
} from './useModiusFormValidate';

type ModiusAgentFormContentProps = {
  serviceTemplate: ServiceTemplate;
  currentStep: BabyDegenFormStep;
  updateNextStep: () => void;
};

export const ModiusAgentFormContent = ({
  serviceTemplate,
  currentStep,
  updateNextStep,
}: ModiusAgentFormContentProps) => {
  const [form] = Form.useForm<ModiusFieldValues>();
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useModiusFormValidate('Finish Agent Configuration');

  const isTenderlyStep = currentStep === BABYDEGEN_FORM_STEP.tenderly;
  const isCoinGeckoStep = currentStep === BABYDEGEN_FORM_STEP.coingecko;
  const isGeminiStep = currentStep === BABYDEGEN_FORM_STEP.gemini;

  const handleContinue = useCallback(async () => {
    try {
      if (isTenderlyStep) {
        await form.validateFields([
          'tenderlyAccessToken',
          'tenderlyAccountSlug',
          'tenderlyProjectSlug',
        ]);
        updateNextStep();
      } else if (isCoinGeckoStep) {
        await form.validateFields(['coinGeckoApiKey']);
        updateNextStep();
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);
    }
  }, [form, isTenderlyStep, isCoinGeckoStep, updateNextStep]);

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
        goto(SetupScreen.FundYourAgent);
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

  // Disable the submit button if the form is submitting OR
  // if the defaultStakingProgramId is not available
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
        preserve
        className="label-no-padding"
        requiredMark={RequiredMark}
      >
        {isTenderlyStep && <TenderlyApiKeySubHeader isSetupPage />}
        <Form.Item
          label={<TenderlyAccessTokenLabel />}
          name="tenderlyAccessToken"
          {...requiredFieldProps}
          hidden={!isTenderlyStep}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          label={<TenderlyAccountSlugLabel />}
          name="tenderlyAccountSlug"
          {...requiredFieldProps}
          hidden={!isTenderlyStep}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={<TenderlyProjectSlugLabel />}
          name="tenderlyProjectSlug"
          {...requiredFieldProps}
          hidden={!isTenderlyStep}
          rules={[...requiredRules, { validator: validateSlug }]}
        >
          <Input />
        </Form.Item>
        {isTenderlyStep && <div style={{ paddingBottom: 42 }} />}

        {isCoinGeckoStep && <CoinGeckoApiKeySubHeader isSetupPage />}
        <Form.Item
          label={<CoinGeckoApiKeyLabel />}
          name="coinGeckoApiKey"
          {...requiredFieldProps}
          hidden={!isCoinGeckoStep}
          rules={[...requiredRules, { validator: validateApiKey }]}
        >
          <Input.Password />
        </Form.Item>
        {isCoinGeckoStep && <div style={{ paddingBottom: 42 }} />}

        {isGeminiStep && <GeminiApiKeySubHeader name="Modius" isSetupPage />}
        <Form.Item
          name="geminiApiKey"
          label={<GeminiApiKeyLabel />}
          {...optionalFieldProps}
          hidden={!isGeminiStep}
        >
          <Input.Password />
        </Form.Item>
        {geminiApiKeyValidationStatus === 'invalid' && (
          <InvalidGeminiApiCredentials />
        )}

        <Form.Item>
          <Button
            loading={isSubmitting}
            disabled={canSubmitForm}
            onClick={isGeminiStep ? form.submit : handleContinue}
            type="primary"
            size="large"
            block
          >
            {isGeminiStep ? submitButtonText : 'Continue'}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

export const ModiusAgentForm = ({
  serviceTemplate,
  renderForm,
}: Pick<ModiusAgentFormContentProps, 'serviceTemplate'> & {
  renderForm: RenderForm;
}) => {
  const [currentStep, setCurrentStep] = useState<BabyDegenFormStep>(
    BABYDEGEN_FORM_STEP.tenderly,
  );

  const updateNextStep = useCallback(() => {
    if (currentStep === BABYDEGEN_FORM_STEP.coingecko) {
      setCurrentStep('gemini');
    } else if (currentStep === BABYDEGEN_FORM_STEP.tenderly) {
      setCurrentStep('coingecko');
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === BABYDEGEN_FORM_STEP.coingecko) {
      setCurrentStep('tenderly');
    } else if (currentStep === BABYDEGEN_FORM_STEP.gemini) {
      setCurrentStep('coingecko');
    }
  }, [currentStep]);

  return renderForm(
    <ModiusAgentFormContent
      serviceTemplate={serviceTemplate}
      currentStep={currentStep}
      updateNextStep={updateNextStep}
    />,
    <>
      {currentStep === BABYDEGEN_FORM_STEP.tenderly && (
        <TenderlyAccessTokenDesc />
      )}
      {currentStep === BABYDEGEN_FORM_STEP.coingecko && <CoinGeckoApiKeyDesc />}
      {currentStep === BABYDEGEN_FORM_STEP.gemini && <GeminiApiKeyDesc />}
    </>,
    {
      onBack:
        currentStep === BABYDEGEN_FORM_STEP.tenderly ? undefined : handleBack,
    },
  );
};
