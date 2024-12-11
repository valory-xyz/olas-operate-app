import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import {
  Button,
  ConfigProvider,
  Divider,
  Flex,
  Form,
  Input,
  message,
  Typography,
} from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { SetupScreen } from '@/enums/SetupScreen';
import { useElectronApi } from '@/hooks/useElectronApi';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { SetupCreateHeader } from '../Create/SetupCreateHeader';
import {
  onDummyServiceCreation,
  validateGeminiApiKey,
  validateTwitterCredentials,
} from './validation';

const { Title, Text } = Typography;

// TODO: consolidate theme into mainTheme
const LOCAL_THEME = { components: { Input: { fontSize: 16 } } };

type FieldValues = {
  personaDescription: string;
  geminiApiKey: string;
  xEmail: string;
  xUsername: string;
  xPassword: string;
};
type ValidationStatus = 'valid' | 'invalid' | 'unknown';

const requiredRules = [{ required: true, message: 'Field is required' }];
const validateMessages = {
  required: 'Field is required',
  types: { email: 'Enter a valid email' },
};

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

type SetupYourAgentFormProps = { serviceTemplate: ServiceTemplate };
// Agent setup form
const SetupYourAgentForm = ({ serviceTemplate }: SetupYourAgentFormProps) => {
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
        const isTwitterCredentialsValid = electronApi?.validateTwitterLogin
          ? await validateTwitterCredentials(
              values.xEmail,
              values.xUsername,
              values.xPassword,
              electronApi.validateTwitterLogin,
            )
          : false;
        setTwitterCredentialsValidationStatus(
          isTwitterCredentialsValid ? 'valid' : 'invalid',
        );
        if (!isTwitterCredentialsValid) return;

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

  const commonFieldProps = useMemo(
    () => ({ rules: requiredRules, hasFeedback: true }),
    [],
  );

  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  return (
    <Form<FieldValues>
      form={form}
      name="setup-your-agent"
      layout="vertical"
      onFinish={onFinish}
      validateMessages={validateMessages}
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

      <Form.Item name="xPassword" label="X password" {...commonFieldProps}>
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
  );
};

export const SetupYourAgent = () => {
  const { selectedAgentType } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  if (!serviceTemplate) {
    return (
      <CustomAlert
        type="error"
        showIcon
        message={<Text>Please select an agent type first!</Text>}
        className="mb-8"
      />
    );
  }

  return (
    <ConfigProvider theme={LOCAL_THEME}>
      <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }}>
        <SetupCreateHeader prev={SetupScreen.AgentSelection} />
        <Title level={3}>Set up your agent</Title>
        <Text>
          Provide your agent with a persona, access to an LLM and an X account.
        </Text>
        <Divider style={{ margin: '8px 0' }} />

        <SetupYourAgentForm serviceTemplate={serviceTemplate} />

        <Text type="secondary" style={{ display: 'block', marginTop: '-16px' }}>
          You won’t be able to update your agent’s configuration after this
          step.
        </Text>
      </CardFlex>
    </ConfigProvider>
  );
};
