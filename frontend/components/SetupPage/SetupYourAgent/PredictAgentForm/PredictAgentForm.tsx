import { Button, Form, Input, message } from 'antd';
import { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import {
  optionalFieldProps,
  validateMessages,
} from '@/components/AgentForms/common/formUtils';
import { InvalidGeminiApiCredentials } from '@/components/AgentForms/common/InvalidGeminiApiCredentials';
import {
  GeminiApiKeyDesc,
  GeminiApiKeyLabel,
  GeminiApiKeySubHeader,
} from '@/components/AgentForms/common/labels';
import { RequiredMark } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useServices, useSetup, useStakingProgram } from '@/hooks';
import { ServiceTemplate } from '@/types';
import { onDummyServiceCreation } from '@/utils';

import { RenderForm } from '../useDisplayAgentForm';
import {
  PredictFieldValues,
  usePredictFormValidate,
} from './usePredictFormValidate';

type PredictAgentFormProps = {
  serviceTemplate: ServiceTemplate;
};

/**
 * Form for setting up a Predict agent (To setup and update the agent).
 */
export const PredictAgentFormContent = ({
  serviceTemplate,
}: PredictAgentFormProps) => {
  const [form] = Form.useForm<PredictFieldValues>();
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();
  const { refetch: refetchServices } = useServices();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = usePredictFormValidate('Finish Agent Configuration');

  const onFinish = useCallback(
    async (values: PredictFieldValues) => {
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
      } finally {
        updateSubmitButtonText('Continue');
        setIsSubmitting(false);
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
  useUnmount(() => {
    setIsSubmitting(false);
    updateSubmitButtonText('Continue');
  });

  // Disable the submit button if the form is submitting OR
  // if the defaultStakingProgramId is not available
  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  return (
    <Form<PredictFieldValues>
      form={form}
      name="setup-your-predict-agent"
      layout="vertical"
      onFinish={onFinish}
      validateMessages={validateMessages}
      disabled={canSubmitForm}
      preserve
      className="label-no-padding"
      requiredMark={RequiredMark}
    >
      <GeminiApiKeySubHeader name="Prediction" />
      <Form.Item
        name="geminiApiKey"
        label={<GeminiApiKeyLabel />}
        {...optionalFieldProps}
        className="mb-8"
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
          onClick={form.submit}
          type="primary"
          size="large"
          block
          className="mt-12"
        >
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

type PredictAgentSetupFormProps = { serviceTemplate: ServiceTemplate };

export const PredictAgentSetup = ({
  serviceTemplate,
  renderForm,
}: Pick<PredictAgentSetupFormProps, 'serviceTemplate'> & {
  renderForm: RenderForm;
}) => {
  return renderForm(
    <PredictAgentFormContent serviceTemplate={serviceTemplate} />,
    <>
      <GeminiApiKeyDesc />
    </>,
    { onBack: undefined },
  );
};
