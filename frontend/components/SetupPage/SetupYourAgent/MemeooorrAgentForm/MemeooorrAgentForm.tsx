import { InfoCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Divider,
  Flex,
  Form,
  Input,
  message,
  Popover,
  Typography,
} from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { CustomAlert } from '@/components/Alert';
import { InfoTooltip } from '@/components/InfoTooltip';
import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { useMemeFormValidate } from '../../hooks/useMemeFormValidate';
import {
  commonFieldProps,
  emailValidateMessages,
  requiredRules,
} from '../formUtils';
import { onDummyServiceCreation } from '../utils';

const { Title, Text } = Typography;

type FieldValues = {
  personaDescription: string;
  geminiApiKey: string;
  xEmail: string;
  xUsername: string;
  xPassword: string;
};

export const XAccountCredentials = () => (
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

export const InvalidGeminiApiCredentials = () => (
  <CustomAlert
    type="error"
    showIcon
    message={<Text>API key is invalid</Text>}
    className="mb-8"
  />
);

export const InvalidXCredentials = () => (
  <CustomAlert
    type="error"
    showIcon
    message={<Text>X account credentials are invalid or 2FA is enabled.</Text>}
    className="mb-16"
  />
);

const FireworksApiLabel = () => {
  return (
    <div>
      Fireworks API (Unhinged Dobby LLM)
      <InfoTooltip style={{ width: 400 }} open>
        <Text>
          Dobby LLM requires a Fireworks AI API key (paid) to activate Unhinged
          Mode. To generate the API key: Log in to Fireworks AI account ↗.
          Navigate to Get API Key section and click Generate Key. On the Home
          page, click Set payment to cover usage costs based on tokens consumed.
        </Text>
      </InfoTooltip>
      <Popover
        trigger={['hover', 'click']}
        placement="bottomLeft"
        showArrow={false}
        style={{ width: 400 }}
        content={
          <Flex vertical={false} gap={8} style={{ maxWidth: 400 }}>
            <Typography.Text>
              <InfoCircleOutlined style={{ color: COLOR.BLUE }} />
            </Typography.Text>
            Dobby LLM requires a Fireworks AI API key (paid) to activate
            Unhinged Mode. To generate the API key: Log in to Fireworks AI
            account ↗. Navigate to Get API Key section and click Generate Key.
            On the Home page, click Set payment to cover usage costs based on
            tokens consumed.
          </Flex>
        }
      >
        ABCD
      </Popover>
    </div>
  );
};

type MemeooorrAgentFormProps = { serviceTemplate: ServiceTemplate };

export const MemeooorrAgentForm = ({
  serviceTemplate,
}: MemeooorrAgentFormProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<FieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    submitButtonText,
    setSubmitButtonText,
    geminiApiKeyValidationStatus,
    setGeminiApiKeyValidationStatus,
    twitterCredentialsValidationStatus,
    setTwitterCredentialsValidationStatus,
    handleValidate,
  } = useMemeFormValidate();

  const onFinish = useCallback(
    async (values: Record<keyof FieldValues, string>) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);

        const cookies = await handleValidate(values);
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
    [
      defaultStakingProgramId,
      handleValidate,
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
          <Input.Password />
        </Form.Item>
        {geminiApiKeyValidationStatus === 'invalid' && (
          <InvalidGeminiApiCredentials />
        )}

        <Form.Item name="useFireworksApi" valuePropName="checked">
          <Checkbox>Use Fireworks API (Unhinged Dobby LLM)</Checkbox>
        </Form.Item>

        {form.getFieldValue('useFireworksApi') && (
          <Form.Item
            name="fireworksApiKey"
            label={<FireworksApiLabel />}
            {...commonFieldProps}
          >
            <Input.Password />
          </Form.Item>
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
