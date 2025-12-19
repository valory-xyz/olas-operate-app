import { Button, Form, Input, message } from 'antd';
import React, { useCallback, useState } from 'react';

import {
  AGENTS_FUN_FORM_STEP,
  AgentsFunFormStep,
  commonFieldProps,
  emailValidateMessages,
} from '@/components/AgentForms/common/formUtils';
import {
  PersonaDescriptionDesc,
  PersonaDescriptionExtra,
  PersonaDescriptionLabel,
  PersonaDescriptionSubHeader,
  XAccountAccessTokenLabel,
  XAccountAccessTokenSecretLabel,
  XAccountApiTokensDesc,
  XAccountApiTokensSubHeader,
  XAccountBearerTokenLabel,
  XAccountConsumerApiKeyLabel,
  XAccountConsumerApiKeySecretLabel,
  XAccountUsernameLabel,
} from '@/components/AgentForms/common/labels';
import { AgentsFunFormValues } from '@/components/SetupPage/SetupYourAgent/AgentsFunAgentForm/types';
import { RequiredMark } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useServices, useSetup, useStakingProgram } from '@/hooks';
import { ServiceTemplate } from '@/types';
import { onDummyServiceCreation } from '@/utils/service';

import { RenderForm } from '../useDisplayAgentForm';

type AgentsFunAgentFormContentProps = {
  serviceTemplate: ServiceTemplate;
  currentStep: AgentsFunFormStep;
  updateNextStep: () => void;
};

export const AgentsFunAgentFormContent = ({
  serviceTemplate,
  currentStep,
  updateNextStep,
}: AgentsFunAgentFormContentProps) => {
  const { goto } = useSetup();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Continue');

  const { defaultStakingProgramId } = useStakingProgram();
  const { refetch: refetchServices } = useServices();

  const [form] = Form.useForm<AgentsFunFormValues>();

  const isPersonaStep = currentStep === AGENTS_FUN_FORM_STEP.persona;
  const isXAccountApiTokensStep =
    currentStep === AGENTS_FUN_FORM_STEP.x_account_api_tokens;

  const handleContinue = useCallback(async () => {
    try {
      if (isPersonaStep) {
        await form.validateFields(['personaDescription']);
        updateNextStep();
        setSubmitButtonText('Finish Agent Configuration');
      }
    } catch (error) {
      console.error('Error in validation:', error);
    }
  }, [form, isPersonaStep, updateNextStep]);

  const onSubmit = useCallback(
    async (values: AgentsFunFormValues) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);
        setSubmitButtonText('Setting up agent...');
        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          description: `Agents.Fun @${values.xUsername}`,
          env_variables: {
            ...serviceTemplate.env_variables,
            TWEEPY_CONSUMER_API_KEY: {
              ...serviceTemplate.env_variables.TWEEPY_CONSUMER_API_KEY,
              value: values.xConsumerApiKey,
            },
            TWEEPY_CONSUMER_API_KEY_SECRET: {
              ...serviceTemplate.env_variables.TWEEPY_CONSUMER_API_KEY_SECRET,
              value: values.xConsumerApiSecret,
            },
            TWEEPY_BEARER_TOKEN: {
              ...serviceTemplate.env_variables.TWEEPY_BEARER_TOKEN,
              value: values.xBearerToken,
            },
            TWEEPY_ACCESS_TOKEN: {
              ...serviceTemplate.env_variables.TWEEPY_ACCESS_TOKEN,
              value: values.xAccessToken,
            },
            TWEEPY_ACCESS_TOKEN_SECRET: {
              ...serviceTemplate.env_variables.TWEEPY_ACCESS_TOKEN_SECRET,
              value: values.xAccessTokenSecret,
            },
            PERSONA: {
              ...serviceTemplate.env_variables.PERSONA,
              value: values.personaDescription,
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
        setSubmitButtonText('Continue');
      }
    },
    [defaultStakingProgramId, serviceTemplate, refetchServices, goto],
  );

  return (
    <>
      {currentStep === AGENTS_FUN_FORM_STEP.persona && (
        <PersonaDescriptionSubHeader isSetupPage />
      )}
      {currentStep === AGENTS_FUN_FORM_STEP.x_account_api_tokens && (
        <XAccountApiTokensSubHeader isSetupPage />
      )}
      <Form<AgentsFunFormValues>
        form={form}
        onFinish={onSubmit}
        disabled={isSubmitting}
        validateMessages={emailValidateMessages}
        variant="outlined"
        name="setup-your-agents-fun-agent"
        layout="vertical"
        requiredMark={RequiredMark}
      >
        <Form.Item
          name="personaDescription"
          label={<PersonaDescriptionLabel />}
          hidden={!isPersonaStep}
          extra={<PersonaDescriptionExtra />}
          {...commonFieldProps}
        >
          <Input.TextArea size="small" rows={4} />
        </Form.Item>

        <Form.Item
          name="xUsername"
          label={<XAccountUsernameLabel />}
          {...commonFieldProps}
          hidden={!isXAccountApiTokensStep}
        >
          <Input
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
          label={<XAccountConsumerApiKeyLabel />}
          {...commonFieldProps}
          hidden={!isXAccountApiTokensStep}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="xConsumerApiSecret"
          label={<XAccountConsumerApiKeySecretLabel />}
          {...commonFieldProps}
          hidden={!isXAccountApiTokensStep}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="xBearerToken"
          label={<XAccountBearerTokenLabel />}
          {...commonFieldProps}
          hidden={!isXAccountApiTokensStep}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="xAccessToken"
          label={<XAccountAccessTokenLabel />}
          {...commonFieldProps}
          hidden={!isXAccountApiTokensStep}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item
          name="xAccessTokenSecret"
          label={<XAccountAccessTokenSecretLabel />}
          {...commonFieldProps}
          hidden={!isXAccountApiTokensStep}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            size="large"
            block
            loading={isSubmitting}
            disabled={isSubmitting}
            onClick={isPersonaStep ? handleContinue : form.submit}
          >
            {submitButtonText}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

type AgentsFunAgentSetupProps = {
  serviceTemplate: ServiceTemplate;
  renderForm: RenderForm;
};

export const AgentsFunAgentSetup = ({
  serviceTemplate,
  renderForm,
}: AgentsFunAgentSetupProps) => {
  const [currentStep, setCurrentStep] = useState<AgentsFunFormStep>(
    AGENTS_FUN_FORM_STEP.persona,
  );

  const updateNextStep = useCallback(() => {
    if (currentStep === AGENTS_FUN_FORM_STEP.persona) {
      setCurrentStep(AGENTS_FUN_FORM_STEP.x_account_api_tokens);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === AGENTS_FUN_FORM_STEP.x_account_api_tokens) {
      setCurrentStep(AGENTS_FUN_FORM_STEP.persona);
    }
  }, [currentStep]);

  return renderForm(
    <AgentsFunAgentFormContent
      serviceTemplate={serviceTemplate}
      currentStep={currentStep}
      updateNextStep={updateNextStep}
    />,
    <>
      {currentStep === AGENTS_FUN_FORM_STEP.persona && (
        <PersonaDescriptionDesc />
      )}
      {currentStep === AGENTS_FUN_FORM_STEP.x_account_api_tokens && (
        <XAccountApiTokensDesc />
      )}
    </>,
    {
      onBack:
        currentStep === AGENTS_FUN_FORM_STEP.persona ? undefined : handleBack,
    },
  );
};
