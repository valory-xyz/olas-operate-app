import { Button, Form, Input, message } from 'antd';
import { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import {
  requiredRules,
  validateApiKey,
  validateMessages,
} from '@/components/AgentForms/common/formUtils';
import {
  OpenAiApiKeyDesc,
  OpenAiApiKeyLabel,
  OpenAiApiKeySubHeader,
} from '@/components/AgentForms/common/labels';
import { RequiredMark } from '@/components/ui';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup, useStakingProgram } from '@/hooks';
import { ServiceTemplate } from '@/types';
import { onDummyServiceCreation } from '@/utils';

import { RenderForm } from '../useDisplayAgentForm';

type PettAiAgentFormFieldValues = {
  openaiApiKey?: string;
};

type PettAiAgentFormProps = {
  serviceTemplate: ServiceTemplate;
};

const DEFAULT_SUBMIT_BUTTON_TEXT = 'Continue';

/**
 * Form for setting up a PettAi agent (To setup and update the agent).
 */
export const PettAiAgentFormContent = ({
  serviceTemplate,
}: PettAiAgentFormProps) => {
  const [form] = Form.useForm<PettAiAgentFormFieldValues>();
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();
  const [submitButtonText, setSubmitButtonText] = useState(
    DEFAULT_SUBMIT_BUTTON_TEXT,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFinish = useCallback(
    async (values: PettAiAgentFormFieldValues) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);

        // wait for agent setup to complete
        setSubmitButtonText('Setting up agent...');

        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          env_variables: {
            ...serviceTemplate.env_variables,
            OPENAI_API_KEY: {
              ...serviceTemplate.env_variables.OPENAI_API_KEY,
              value: values.openaiApiKey || '',
            },
          },
        };

        await onDummyServiceCreation(
          defaultStakingProgramId,
          overriddenServiceConfig,
        );

        message.success('Agent setup complete');

        // move to next page
        goto(SetupScreen.SelectStaking);
      } finally {
        setSubmitButtonText(DEFAULT_SUBMIT_BUTTON_TEXT);
        setIsSubmitting(false);
      }
    },
    [defaultStakingProgramId, serviceTemplate, setSubmitButtonText, goto],
  );

  // Clean up
  useUnmount(() => {
    setIsSubmitting(false);
    setSubmitButtonText(DEFAULT_SUBMIT_BUTTON_TEXT);
  });

  // Disable the submit button if the form is submitting OR
  // if the defaultStakingProgramId is not available
  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  return (
    <Form<PettAiAgentFormFieldValues>
      form={form}
      name="setup-your-pettai-agent"
      layout="vertical"
      onFinish={onFinish}
      validateMessages={validateMessages}
      disabled={canSubmitForm}
      preserve
      className="label-no-padding"
      requiredMark={RequiredMark}
    >
      <OpenAiApiKeySubHeader />
      <Form.Item
        name="openaiApiKey"
        label={<OpenAiApiKeyLabel />}
        rules={[...requiredRules, { validator: validateApiKey }]}
        className="mb-8"
      >
        <Input.Password />
      </Form.Item>

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

type PettAiAgentSetupFormProps = { serviceTemplate: ServiceTemplate };

export const PettAiAgentSetup = ({
  serviceTemplate,
  renderForm,
}: Pick<PettAiAgentSetupFormProps, 'serviceTemplate'> & {
  renderForm: RenderForm;
}) => {
  return renderForm(
    <PettAiAgentFormContent serviceTemplate={serviceTemplate} />,
    <>
      <OpenAiApiKeyDesc />
    </>,
    { onBack: undefined },
  );
};
