import { Button, Divider, Flex, Form, Input, message, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { FireworksApiFields } from '@/components/AgentForms/AgentsFunAgentForm/FireworksApiField';
import {
  AgentsFunFieldValues,
  useMemeFormValidate,
} from '@/components/AgentForms/AgentsFunAgentForm/useMemeFormValidate';
import {
  commonFieldProps,
  emailValidateMessages,
  requiredRules,
} from '@/components/AgentForms/common/formUtils';
import { InvalidGeminiApiCredentials } from '@/components/AgentForms/common/InvalidGeminiApiCredentials';
import { CustomAlert } from '@/components/Alert';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { onDummyServiceCreation } from '@/utils/service';

const { Title, Text } = Typography;

type MemeooorrFormValues = AgentsFunFieldValues & {
  fireworksApiEnabled: boolean;
};

export const XAccountCredentials = () => (
  <Flex vertical>
    <Divider style={{ margin: '8px 0 16px 0' }} />
    <Title level={5} className="mt-0">
      X account credentials
    </Title>
    <Text type="secondary" className="mb-16">
      Create a new account for your agent at{' '}
      <a href="https://x.com" target="_blank" rel="noreferrer">
        x.com
      </a>{' '}
      and enter the login details. This enables your agent to view X and
      interact with other agents.
    </Text>
    <CustomAlert
      type="warning"
      showIcon
      message={
        <Flex justify="space-between" gap={4} vertical>
          <Text>
            To avoid your X account getting suspended for bot activity, complete
            the onboarding steps. You can find them on your profile page under
            &quot;Let&lsquo;s get you set up&quot;.
          </Text>
        </Flex>
      }
      className="mb-16"
    />
  </Flex>
);

export const InvalidXCredentials = () => (
  <CustomAlert
    type="error"
    showIcon
    message={<Text>X account credentials are invalid or 2FA is enabled.</Text>}
    className="mb-16"
  />
);

type MemeooorrAgentFormProps = { serviceTemplate: ServiceTemplate };

export const MemeooorrAgentForm = ({
  serviceTemplate,
}: MemeooorrAgentFormProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<MemeooorrFormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    submitButtonText,
    setSubmitButtonText,
    geminiApiKeyValidationStatus,
    setGeminiApiKeyValidationStatus,
    twitterCredentialsValidationStatus,
    setTwitterCredentialsValidationStatus,
    validateForm,
  } = useMemeFormValidate();

  const onFinish = useCallback(
    async (values: MemeooorrFormValues) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);

        const cookies = await validateForm(values);
        if (!cookies) return;

        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          description: `Memeooorr @${values.xUsername}`,
          env_variables: {
            ...serviceTemplate.env_variables,
            TWIKIT_USERNAME: {
              ...serviceTemplate.env_variables.TWIKIT_USERNAME,
              value: values.xUsername,
            },
            TWIKIT_EMAIL: {
              ...serviceTemplate.env_variables.TWIKIT_EMAIL,
              value: values.xEmail,
            },
            TWIKIT_PASSWORD: {
              ...serviceTemplate.env_variables.TWIKIT_PASSWORD,
              value: values.xPassword,
            },
            TWIKIT_COOKIES: {
              ...serviceTemplate.env_variables.TWIKIT_COOKIES,
              value: cookies,
            },
            OPENAI_API_KEY: {
              ...serviceTemplate.env_variables.OPENAI_API_KEY,
              value: values.geminiApiKey,
            },
            FIREWORKS_API_KEY: {
              ...serviceTemplate.env_variables.FIREWORKS_API_KEY,
              value: values.fireworksApiEnabled ? values.fireworksApiKey : '',
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
    [
      defaultStakingProgramId,
      validateForm,
      serviceTemplate,
      goto,
      setSubmitButtonText,
    ],
  );

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    setGeminiApiKeyValidationStatus('unknown');
    setTwitterCredentialsValidationStatus('unknown');
    setSubmitButtonText('Continue');
  });

  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  return (
    <>
      <Text>
        Provide your agent with a persona, access to an LLM and an X account.
      </Text>
      <Divider style={{ margin: '8px 0' }} />

      <Form<MemeooorrFormValues>
        form={form}
        name="setup-your-agent"
        layout="vertical"
        onFinish={onFinish}
        validateMessages={emailValidateMessages}
        disabled={canSubmitForm}
      >
        <Form.Item
          name="personaDescription"
          label="Persona Description"
          {...commonFieldProps}
        >
          <Input.TextArea size="small" rows={4} placeholder="e.g. ..." />
        </Form.Item>

        <Form.Item
          name="geminiApiKey"
          label="OpenAI API Key"
          {...commonFieldProps}
        >
          <Input.Password />
        </Form.Item>
        {geminiApiKeyValidationStatus === 'invalid' && (
          <InvalidGeminiApiCredentials />
        )}

        <FireworksApiFields />

        {/* X */}
        <XAccountCredentials />
        {twitterCredentialsValidationStatus === 'invalid' && (
          <InvalidXCredentials />
        )}

        <Form.Item
          name="xEmail"
          label="X email"
          rules={[{ required: true, type: 'email' }]}
          hasFeedback
        >
          <Input />
        </Form.Item>

        <Form.Item name="xUsername" label="X username" {...commonFieldProps}>
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
          name="xPassword"
          label="X password"
          {...commonFieldProps}
          rules={[
            ...requiredRules,
            {
              validator: (_, value) => {
                if (value && value.includes('$')) {
                  return Promise.reject(
                    new Error(
                      'Password must not contain the “$” symbol. Please update your password on Twitter, then retry.',
                    ),
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.Password />
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
