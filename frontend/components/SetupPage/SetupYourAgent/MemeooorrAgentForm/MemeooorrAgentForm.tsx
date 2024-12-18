import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Button, Divider, Flex, Form, Input, message, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { CustomAlert } from '@/components/Alert';
import { SetupScreen } from '@/enums/SetupScreen';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import {
  commonFieldProps,
  emailValidateMessages,
  requiredRules,
} from '../formUtils';
import { onDummyServiceCreation } from '../utils';
import {
  validateGeminiApiKey,
  validateTwitterCredentials,
} from '../validations';

const { Title, Text } = Typography;

type FieldValues = {
  personaDescription: string;
  geminiApiKey: string;
  xEmail: string;
  xUsername: string;
  xPassword: string;
};
type ValidationStatus = 'valid' | 'invalid' | 'unknown';

const XAccountCredentials = () => (
  <Flex vertical>
    <Divider style={{ margin: '16px 0' }} />
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
            Make sure to set the account as `Automated`. When logged in on X, go
            to Settings &gt; Your account &gt; Account information &gt;
            Automation.
          </Text>
        </Flex>
      }
      className="mb-16"
    />
  </Flex>
);

const InvalidGeminiApiCredentials = () => (
  <CustomAlert
    type="error"
    showIcon
    message={<Text>API key is invalid</Text>}
    className="mb-8"
  />
);

const InvalidXCredentials = () => (
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
  const electronApi = useElectronApi();
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<FieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Continue');
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');
  const [
    twitterCredentialsValidationStatus,
    setTwitterCredentialsValidationStatus,
  ] = useState<ValidationStatus>('unknown');

  const onFinish = useCallback(
    async (values: Record<keyof FieldValues, string>) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);

        // validate the gemini API
        setSubmitButtonText('Validating Gemini API key...');
        const isGeminiApiValid = await validateGeminiApiKey(
          values.geminiApiKey,
        );
        setGeminiApiKeyValidationStatus(isGeminiApiValid ? 'valid' : 'invalid');
        if (!isGeminiApiValid) return;

        // validate the twitter credentials
        setSubmitButtonText('Validating Twitter credentials...');
        const { isValid: isTwitterCredentialsValid, cookies } =
          electronApi?.validateTwitterLogin
            ? await validateTwitterCredentials(
                values.xEmail,
                values.xUsername,
                values.xPassword,
                electronApi.validateTwitterLogin,
              )
            : { isValid: false, cookies: undefined };
        setTwitterCredentialsValidationStatus(
          isTwitterCredentialsValid ? 'valid' : 'invalid',
        );
        if (!isTwitterCredentialsValid) return;
        if (!cookies) return;

        // wait for agent setup to complete
        setSubmitButtonText('Setting up agent...');

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
            GENAI_API_KEY: {
              ...serviceTemplate.env_variables.GENAI_API_KEY,
              value: values.geminiApiKey,
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
    [electronApi, defaultStakingProgramId, serviceTemplate, goto],
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

      <Form<FieldValues>
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
          label="Gemini API Key"
          {...commonFieldProps}
        >
          <Input.Password
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
          />
        </Form.Item>
        {geminiApiKeyValidationStatus === 'invalid' && (
          <InvalidGeminiApiCredentials />
        )}

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
          <Input.Password
            iconRender={(visible) =>
              visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
            }
          />
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
