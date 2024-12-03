import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { Button, ConfigProvider, Divider, Flex, Form, Input, Typography } from "antd";
import type { FormInstance } from "antd/lib/form";
import React, { useState } from "react";

import { CardFlex } from "@/components/styled/CardFlex";
import { SetupScreen } from "@/enums/SetupScreen";

import { SetupCreateHeader } from "../Create/SetupCreateHeader";
import { CustomAlert } from "@/components/Alert";

const { Title, Text } = Typography;


// TODO: consolidate theme into mainTheme
const LOCAL_THEME = { components: { Input: { fontSize: 16 } } };

type FieldValues = {
  personaDescription: string;
  geminiApiKey: string;
  email: string;
  username: string;
  password: string;
};

const requiredRules = [{ required: true, message: "Field is required" }];
const validateMessages = {
  required: "Field is required",
  types: {
    email: "Please enter a valid email",
  },
};

const XAccountCredentials = () => (
  <Flex vertical>
    <Divider style={{ margin: "16px 0" }} />
    <Title level={5} className="mt-0">
      X account credentials
    </Title>
    <Text type="secondary" className="mb-16">
      Create a new account for your agent at{" "}
      <a href="https://x.com" target="_blank" rel="noreferrer">
        x.com
      </a>{" "}
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
  const [form] = Form.useForm<FieldValues>();
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  const onFinish = (values: Record<string, string>) => {
    console.log("Form values:", values);
  };

  // const onFinishFailed = (errorInfo: any) => {
  //   console.log("Form failed:", errorInfo);
  // };

  return (
    <Form<FieldValues>
      form={form}
      name="setup-your-agent"
      layout="vertical"
      onFinish={onFinish}
      // onFinishFailed={onFinishFailed}
      validateMessages={validateMessages}
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
      <InvalidGeminiApiCredentials />

      {/* X */}
      <XAccountCredentials />
      <InvalidXCredentials />

      <Form.Item
        name="email"
        label="X email"
        rules={[{ required: true, type: "email" }]}
        hasFeedback
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="username"
        label="X username"
        rules={requiredRules}
        hasFeedback
      >
        <Input />
      </Form.Item>

      <Form.Item
        name="password"
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
        <Button type="primary" htmlType="submit" size="large" block>
          Continue
        </Button>
      </Form.Item>
    </Form>
  );
};

export const SetupYourAgent = () => {
  return (
    <ConfigProvider theme={LOCAL_THEME}>
      <CardFlex gap={10} styles={{ body: { padding: "12px 24px" } }}>
        <SetupCreateHeader prev={SetupScreen.AgentSelection} />
        <Title level={3}>Set up your agent</Title>
        <Text>
          Provide your agent with a persona, access to an LLM and X account.
        </Text>
        <Divider style={{ margin: "12px 0" }} />

        <SetupYourAgentForm />

        <Text type="secondary" style={{ display: "block", marginTop: "-16px" }}>
          You won’t be able to update your agent’s configuration after this
          step.
        </Text>
      </CardFlex>
    </ConfigProvider>
  );
};
