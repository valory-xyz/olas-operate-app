import { CheckCircleOutlined } from '@ant-design/icons';
import { Button, Checkbox, Flex, Typography } from 'antd';
import { MouseEvent, useCallback, useState } from 'react';
import styled from 'styled-components';

import { COLOR, SETUP_SCREEN } from '@/constants';
import { useElectronApi, useSetup } from '@/hooks';

const { Title: AntTitle, Text } = Typography;

const Title = styled(AntTitle)`
  font-weight: normal !important;
  margin: 0 !important;
`;

const CheckedCircle = styled(CheckCircleOutlined)`
  display: inline-block;
  margin: 4px 8px 0 0;
  color: ${COLOR.SUCCESS};
`;

const OwnYourAgentCard = styled(Flex)`
  background: ${COLOR.BACKGROUND};
  padding: 24px;
  border-radius: 8px;
`;

const CustomCheckbox = styled(Checkbox)`
  .ant-checkbox {
    align-self: start;
  }
`;

const ownYourAgentsList = [
  'This is open-source software, you can inspect it all.',
  'You are self-custodying your agents, they are yours and yours only.',
  "You are self-custodying your funds, you're in control.",
  'You take responsibility, these are your agents and you take care of them.',
] as const;

const OwnYourAgents = () => (
  <OwnYourAgentCard vertical gap={16}>
    <Title level={4} className="text-center">
      Own your AI agents
    </Title>
    <Text className="text-light text-sm">Pearl is designed so that:</Text>
    {ownYourAgentsList.map((item, index) => (
      <Flex key={index} align="stretch" justify="start">
        <CheckedCircle />
        <Text className="text-light text-sm">{item}</Text>
      </Flex>
    ))}
  </OwnYourAgentCard>
);

export const SetupWelcomeCreate = () => {
  const { goto } = useSetup();
  const [isFormValid, setIsFormValid] = useState(false);
  const { termsAndConditionsWindow } = useElectronApi();

  const onTermsClick = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      termsAndConditionsWindow?.show?.();
    },
    [termsAndConditionsWindow],
  );

  return (
    <Flex vertical gap={24} style={{ marginTop: 24 }}>
      <Title level={4} className="text-center">
        Hi, let&apos;s get you set up!
      </Title>
      <OwnYourAgents />

      <CustomCheckbox
        onChange={(e) => setIsFormValid(e.target.checked)}
        className="text-xs text-neutral-tertiary"
      >
        By downloading, installing, or using the Pearl Application, you
        acknowledge and agree to be bound by the{' '}
        <a onClick={onTermsClick}>Pearl Terms</a>, including the related terms
        and privacy policies of{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://valory.xyz/terms"
        >
          Valory
        </a>
        ,{' '}
        <a target="_blank" rel="noopener noreferrer" href="https://pearl.you">
          the Pearl Site
        </a>
        ,{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://olas.network/"
        >
          the Olas Site
        </a>
        , and any additional Third-Party Integrations you may choose to access
        via Pearl Application, each under their own applicable terms.
      </CustomCheckbox>

      <Flex vertical gap={16}>
        <Button
          color="primary"
          type="primary"
          size="large"
          disabled={!isFormValid}
          onClick={() => goto(SETUP_SCREEN.SetupPassword)}
        >
          Create account
        </Button>
      </Flex>
    </Flex>
  );
};
