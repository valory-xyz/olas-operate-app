import { Button, Form, Input, message } from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { RequiredMark } from '@/components/ui/RequiredMark';
import { SETUP_SCREEN } from '@/constants';
import { useServices, useSetup, useStakingProgram } from '@/hooks';
import { ServiceTemplate } from '@/types';
import { onDummyServiceCreation } from '@/utils';

import {
  BABYDEGEN_FORM_STEP,
  BabyDegenFormStep,
  optionalFieldProps,
  requiredFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
} from '../../../AgentForms/common/formUtils';
import { InvalidGeminiApiCredentials } from '../../../AgentForms/common/InvalidGeminiApiCredentials';
import {
  CoinGeckoApiKeyDesc,
  CoinGeckoApiKeyLabel,
  CoinGeckoApiKeySubHeader,
  GeminiApiKeyDesc,
  GeminiApiKeyLabel,
  GeminiApiKeySubHeader,
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
  const { refetch: refetchServices } = useServices();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useModiusFormValidate('Finish Agent Configuration');

  const isCoinGeckoStep = currentStep === BABYDEGEN_FORM_STEP.coingecko;
  const isGeminiStep = currentStep === BABYDEGEN_FORM_STEP.gemini;

  const handleContinue = useCallback(async () => {
    try {
      if (isCoinGeckoStep) {
        await form.validateFields(['coinGeckoApiKey']);
        updateNextStep();
      }
    } catch (error) {
      console.error('Error in validation:', error);
    }
  }, [form, isCoinGeckoStep, updateNextStep]);

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

        // fetch services to update the state after service creation
        await refetchServices?.();

        message.success('Agent setup complete');

        // move to next page
        goto(SETUP_SCREEN.SelectStaking);
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
      refetchServices,
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
        {isCoinGeckoStep && <div style={{ paddingBottom: 16 }} />}

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
        {isGeminiStep && <div style={{ paddingBottom: 16 }} />}

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
    BABYDEGEN_FORM_STEP.coingecko,
  );

  const updateNextStep = useCallback(() => {
    if (currentStep === BABYDEGEN_FORM_STEP.coingecko) {
      setCurrentStep('gemini');
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === BABYDEGEN_FORM_STEP.gemini) {
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
      {currentStep === BABYDEGEN_FORM_STEP.coingecko && <CoinGeckoApiKeyDesc />}
      {currentStep === BABYDEGEN_FORM_STEP.gemini && <GeminiApiKeyDesc />}
    </>,
    {
      onBack:
        currentStep === BABYDEGEN_FORM_STEP.coingecko ? undefined : handleBack,
    },
  );
};
