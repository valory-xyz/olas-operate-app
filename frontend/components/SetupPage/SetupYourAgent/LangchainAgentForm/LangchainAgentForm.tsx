import { Button, Divider, Form, Input, message, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { commonFieldProps, validateMessages } from '../formUtils';
import { onDummyServiceCreation } from '../utils';
import {
  TavilyApiKeyLabel,
  OpenAIApiKeyLabel,
} from './labels';

const { Text } = Typography;

type FieldValues = {  
  tavilyApiKey: string;
  openAIApiKey: string;
};

type LangchainAgentFormProps = { serviceTemplate: ServiceTemplate };

export const LangchainAgentForm = ({ serviceTemplate }: LangchainAgentFormProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<FieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Continue');

  const onFinish = useCallback(
    async (values: Record<keyof FieldValues, string>) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);

        // wait for agent setup to complete
        setSubmitButtonText('Setting up agent...');

        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          env_variables: {
            ...serviceTemplate.env_variables,
            TAVILY_API_KEY: {
              ...serviceTemplate.env_variables.TAVILY_API_KEY,
              value: values.tavilyApiKey,
            },
            OPENAI_API_KEY: {
              ...serviceTemplate.env_variables.OPENAI_API_KEY,
              value: values.openAIApiKey,
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
        setSubmitButtonText('Continue');
      }
    },
    [defaultStakingProgramId, serviceTemplate, goto],
  );

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    setSubmitButtonText('Continue');
  });

  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  return (
    <>
      <Text>
        Set up your agent providing a Tavily and OpenAI API key as a search engine tool required for the
        agent.
      </Text>
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
          name="tavilyApiKey"
          label={<TavilyApiKeyLabel />}
          {...commonFieldProps}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="openAIApiKey"
          label={<OpenAIApiKeyLabel />}
          {...commonFieldProps}
        >
          <Input />
        </Form.Item>

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
