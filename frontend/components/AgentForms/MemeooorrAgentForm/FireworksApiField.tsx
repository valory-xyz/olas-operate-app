import { Flex, Form, Input, Switch, Typography } from 'antd';
import React from 'react';
import styled from 'styled-components';

import { InfoTooltip } from '@/components/InfoTooltip';
import { UNICODE_SYMBOLS } from '@/constants/symbols';

import { commonFieldProps } from '../common/formUtils';

const { Text } = Typography;

const UnhingedModeLabelContainer = styled.div`
  display: inline-block;
  top: 2px;
  position: relative;
  margin-left: 8px;
`;

const Ol = styled.ol`
  margin: 0;
  padding-left: 28px;
  li:not(:last-child) {
    margin-bottom: 6px;
  }
`;

const UnhingedModeLabel = () => (
  <UnhingedModeLabelContainer>
    Unhinged mode&nbsp;
    <InfoTooltip overlayInnerStyle={{ width: 360 }} placement="top">
      <Flex vertical gap={8}>
        <Text>
          Unhinged mode enables your agent to generate posts on X with Dobby LLM
          — an AI model with strong opinions on personal freedom,
          decentralization, and crypto. Use with caution.
        </Text>
        <Text>You can toggle Unhinged mode anytime.</Text>
      </Flex>
    </InfoTooltip>
  </UnhingedModeLabelContainer>
);

const FireworksApiLabel = () => (
  <div>
    Fireworks API (Unhinged Dobby LLM)&nbsp;
    <InfoTooltip overlayInnerStyle={{ width: 360 }}>
      <Flex vertical gap={8}>
        <Text>
          Dobby LLM requires a Fireworks AI API key (paid) to activate Unhinged
          Mode.
        </Text>
        <Text>To generate the API key:</Text>

        <Ol>
          <li>
            Log in to&nbsp;
            <a href="https://fireworks.ai" target="_blank" rel="noreferrer">
              Fireworks AI account {UNICODE_SYMBOLS.EXTERNAL_LINK}
            </a>
            .
          </li>
          <li>
            Navigate to&nbsp;
            <Text strong>Get API Key section</Text>&nbsp;and click&nbsp;
            <Text strong>Generate Key.</Text>
          </li>
          <li>
            On the&nbsp;
            <Text strong>Home page</Text>, click
            <Text strong> Set payment</Text>&nbsp;to cover usage costs based on
            tokens consumed.
          </li>
        </Ol>
      </Flex>
    </InfoTooltip>
  </div>
);

type FireworksApiFieldsProps = {
  fireworksApiEnabledName?: string;
  fireworksApiKeyName?: string | string[];
};

export const FireworksApiFields = ({
  fireworksApiEnabledName = 'fireworksApiEnabled',
  fireworksApiKeyName = 'fireworksApiKey',
}: FireworksApiFieldsProps) => {
  const isFireworksApiEnabled = Form.useWatch('fireworksApiEnabled');

  return (
    <>
      <Form.Item>
        <Form.Item
          name={fireworksApiEnabledName}
          valuePropName="checked"
          noStyle
        >
          <Switch />
        </Form.Item>
        <UnhingedModeLabel />
      </Form.Item>

      {isFireworksApiEnabled && (
        <Form.Item
          name={fireworksApiKeyName}
          label={<FireworksApiLabel />}
          {...commonFieldProps}
        >
          <Input.Password />
        </Form.Item>
      )}
    </>
  );
};
