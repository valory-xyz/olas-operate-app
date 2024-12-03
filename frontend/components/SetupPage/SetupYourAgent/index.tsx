import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Button, ConfigProvider, Form, Input, Typography } from 'antd';
import type { FormInstance } from 'antd/lib/form';
import React, { useState } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { SetupScreen } from '@/enums/SetupScreen';

import { SetupCreateHeader } from '../Create/SetupCreateHeader';

const { Title, Text } = Typography;

const requiredRules = [
  { required: true, message: 'Please enter your API key' },
];

export const SetupYourAgentForm = () => {
  const [form] = Form.useForm<FormInstance>();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const onFinish = (values: Record<string, string>) => {
    console.log('Form values:', values);
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log('Form failed:', errorInfo);
  };

  const validateMessages = {
    required: 'This field is required!',
    types: {
      email: 'Not a valid email!',
    },
  };

  return (
    <Form
      form={form}
      name="setup-your-agent"
      layout="vertical"
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      validateMessages={validateMessages}
    >
      {/* Persona Description */}
      <Form.Item
        name="personaDescription"
        label="Persona Description"
        rules={[{ required: true, message: 'Please enter a description' }]}
        hasFeedback
      >
        <Input.TextArea
          size="small"
          rows={4}
          placeholder="Enter persona description"
        />
      </Form.Item>

      {/* Gemini API Key */}
      <Form.Item
        name="geminiApiKey"
        label="Gemini API Key"
        rules={requiredRules}
        hasFeedback
      >
        <Input.Password
          placeholder="Enter API key"
          iconRender={(visible) =>
            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
          }
        />
      </Form.Item>

      {/* Email */}
      <Form.Item
        name="email"
        label="Email"
        rules={[{ required: true, type: 'email' }]}
        hasFeedback
      >
        <Input placeholder="Enter your email" />
      </Form.Item>

      {/* Username */}
      <Form.Item
        name="username"
        label="Username"
        rules={requiredRules}
        hasFeedback
      >
        <Input placeholder="Enter your username" />
      </Form.Item>

      {/* Password */}
      <Form.Item
        name="password"
        label="Password"
        rules={requiredRules}
        hasFeedback
      >
        <Input.Password
          placeholder="Enter your password"
          iconRender={(visible) =>
            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
          }
        />
      </Form.Item>

      {/* Submit Button */}
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Continue
        </Button>
      </Form.Item>
    </Form>
  );
};

// TODO: consolidate theme into mainTheme
const theme = { components: { Input: { fontSize: 16 } } };

export const SetupYourAgent = () => {
  return (
    <ConfigProvider theme={theme}>
      <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }}>
        <SetupCreateHeader prev={SetupScreen.AgentSelection} />
        <Title level={3}>Set up your agent</Title>
        <Text type="secondary">
          Provide your agent with a persona, access to an LLM and X account.
        </Text>
        <SetupYourAgentForm />
      </CardFlex>
    </ConfigProvider>
  );
};
