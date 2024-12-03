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
import React, { useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

import { SetupCreateHeader } from '../Create/SetupCreateHeader';
import { validateGeminiApiKey, validateTwitterCredentials } from './validation';

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
  types: {
    email: 'Please enter a valid email',
  },
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

const SetupYourAgentForm = () => {
  const { goto } = useSetup();

  const [form] = Form.useForm<FieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geminiApiKeyValidationStatus, setGeminiApiKeyValidationStatus] =
    useState<ValidationStatus>('unknown');
  const [
    twitterCredentialsValidationStatus,
    setTwitterCredentialsValidationStatus,
  ] = useState<ValidationStatus>('unknown');

  const onFinish = async (values: Record<string, string>) => {
    try {
      setIsSubmitting(true);

      const isGeminiValid = await validateGeminiApiKey(values.geminiApiKey);
      setGeminiApiKeyValidationStatus(isGeminiValid ? 'valid' : 'invalid');
      if (!isGeminiValid) return;

      const isTwitterValid = await validateTwitterCredentials(
        values.xEmail,
        values.xUsername,
        values.xPassword,
      );
      setTwitterCredentialsValidationStatus(
        isTwitterValid ? 'valid' : 'invalid',
      );
      if (!isTwitterValid) return;

      // TODO: send to backend maybe?
      message.success('Agent setup complete');

      goto(SetupScreen.SetupEoaFunding);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }

    // TODO: validate the gemini API

    // TODO: validate the twitter credentials

    // TODO: move to next page
  };

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    setGeminiApiKeyValidationStatus('unknown');
    setTwitterCredentialsValidationStatus('unknown');
  });

  return (
    <Form<FieldValues>
      form={form}
      name="setup-your-agent"
      layout="vertical"
      onFinish={onFinish}
      validateMessages={validateMessages}
      disabled={isSubmitting}
    >
      <Form.Item
        name="personaDescription"
        label="Persona Description"
        rules={requiredRules}
        hasFeedback
      >
        <Input.TextArea size="small" rows={4} placeholder="e.g. ..." />
      </Form.Item>

      <Form.Item
        name="geminiApiKey"
        label="Gemini API Key"
        rules={requiredRules}
        hasFeedback
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

      <Form.Item
        name="xUsername"
        label="X username"
        rules={requiredRules}
        hasFeedback
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="xPassword"
        label="X password"
        rules={requiredRules}
        hasFeedback
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
        >
          Continue
        </Button>
      </Form.Item>
    </Form>
  );
};

export const SetupYourAgent = () => {
  return (
    <ConfigProvider theme={LOCAL_THEME}>
      <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }}>
        <SetupCreateHeader prev={SetupScreen.AgentSelection} />
        <Title level={3}>Set up your agent</Title>
        <Text>
          Provide your agent with a persona, access to an LLM and X account.
        </Text>
        <Divider style={{ margin: '8px 0' }} />

        <SetupYourAgentForm />

        <Text type="secondary" style={{ display: 'block', marginTop: '-16px' }}>
          You won’t be able to update your agent’s configuration after this
          step.
        </Text>
      </CardFlex>
    </ConfigProvider>
  );
};
