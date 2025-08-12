import { CheckCircleOutlined } from '@ant-design/icons';
import { Button, Checkbox, Flex, Typography } from 'antd';
import { useState } from 'react';
import styled from 'styled-components';

import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';

const { Title: AntTitle, Text } = Typography;

const Title = styled(AntTitle)`
  font-weight: normal !important;
  margin: 0 !important;
`;

const CheckedCircle = styled(CheckCircleOutlined)`
  display: inline-block;
  margin: 4px 8px 0 0;
  color: ${COLOR.V1_SUCCESS};
`;

const OwnYourAgentCard = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  padding: 24px;
  border-radius: 8px;
`;

const ownYourAgentsList = [
  'This is open-source software, you can inspect it all.',
  'You are self-custodying your agents, they are yours and yours only.',
  "You are self-custodying your funds, you're in control.",
  'You take responsibility, these are your agents and you take care of them.',
];

const OwnYourAgents = () => (
  <OwnYourAgentCard vertical gap={16}>
    <Title level={4} className="text-center">
      Own your AI agents
    </Title>
    {ownYourAgentsList.map((item, index) => (
      <Flex key={index} align="stretch" justify="start">
        <CheckedCircle />
        <Text className="text-light">{item}</Text>
      </Flex>
    ))}
  </OwnYourAgentCard>
);

export const SetupWelcomeCreate = () => {
  const { goto } = useSetup();
  const [isFormValid, setIsFormValid] = useState(false);

  return (
    <Flex vertical gap={24} style={{ marginTop: 24 }}>
      <Title level={4} className="text-center">
        Hi, let&apos;s create your Pearl account
      </Title>
      <OwnYourAgents />

      <Checkbox onChange={(e) => setIsFormValid(e.target.checked)}>
        I agree to the Pearl&nbsp;
        <a
          href="https://olas.network/pearl-terms"
          target="_blank"
          rel="noreferrer"
        >
          Terms & Conditions
        </a>
      </Checkbox>

      <Flex vertical gap={16}>
        <Button
          color="primary"
          type="primary"
          size="large"
          disabled={!isFormValid}
          onClick={() => goto(SetupScreen.SetupPassword)}
        >
          Create account
        </Button>
      </Flex>
    </Flex>
  );
};
