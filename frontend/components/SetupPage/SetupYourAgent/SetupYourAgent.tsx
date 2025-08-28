import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import React, { ReactNode, useCallback } from 'react';
import styled from 'styled-components';

import {
  CoinGeckoApiKeyLabelV2,
  GeminiApiKeyLabelV2,
  TenderlyAccessTokenLabelV2,
} from '@/components/AgentForms/common/labels';
import { CustomAlert } from '@/components/Alert';
import { AgentHeader } from '@/components/ui/AgentHeader';
import { COLOR } from '@/constants/colors';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { SetupScreen } from '@/enums/SetupScreen';
import { useServices } from '@/hooks/useServices';
import { useSetup } from '@/hooks/useSetup';

import { AgentsFunAgentSetup } from './AgentsFunAgentSetup';
import { ModiusAgentForm } from './ModiusAgentForm/ModiusAgentForm';
import { OptimusAgentForm } from './OptimusAgentForm/OptimusAgentForm';

const { Title, Text } = Typography;

const Container = styled(Flex)`
  margin: -44px 0;
  background: ${COLOR.WHITE};
  height: 796px;
  /* overflow: auto; */
  .setup-left-content {
    width: 492px;
    margin: 0 auto;
    padding: 64px 32px;
  }
  .setup-right-content {
    width: 392px;
    padding: 64px 32px;
    background: ${COLOR.BACKGROUND};
  }
`;

export const SetupYourAgent = () => {
  const { goto } = useSetup();
  const { selectedAgentType } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );

  const renderForm = useCallback(
    (form: ReactNode, desc: ReactNode) => {
      if (!serviceTemplate) return null;

      return (
        <>
          <Flex vertical className="setup-left-content">
            <AgentHeader
              onPrev={() => goto(SetupScreen.AgentOnboarding)}
              hideLogo
            />
            <Title level={3} style={{ margin: '16px 0 24px 0' }}>
              Configure Your Agent
            </Title>
            {form}
          </Flex>

          <Flex vertical gap={24} className="setup-right-content">
            <InfoCircleOutlined
              style={{ fontSize: 24, color: COLOR.TEXT_LIGHT }}
            />
            {desc}
          </Flex>
        </>
      );
    },
    [serviceTemplate, goto],
  );

  const renderDesc = useCallback(
    (desc: ReactNode) => (
      <Flex className="setup-right-content" vertical gap={24}>
        <InfoCircleOutlined style={{ fontSize: 24, color: COLOR.TEXT_LIGHT }} />
        {desc}
      </Flex>
    ),
    [],
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
    <Container>
      {selectedAgentType === AgentType.Optimus && (
        <OptimusAgentForm
          serviceTemplate={serviceTemplate}
          renderForm={renderForm}
        />
      )}
      <Flex vertical className="setup-left-content" style={{ display: 'none' }}>
        <AgentHeader
          onPrev={() => goto(SetupScreen.AgentOnboarding)}
          hideLogo
        />

        <Title level={3} style={{ margin: '16px 0 24px 0' }}>
          Configure Your Agent
        </Title>

        {selectedAgentType === AgentType.AgentsFun && (
          <AgentsFunAgentSetup
            serviceTemplate={serviceTemplate}
            renderDesc={renderDesc}
          />
        )}
        {selectedAgentType === AgentType.Modius && (
          <ModiusAgentForm
            serviceTemplate={serviceTemplate}
            renderDesc={renderDesc}
          />
        )}
      </Flex>

      <Flex
        vertical
        gap={24}
        className="setup-right-content"
        style={{ display: 'none' }}
      >
        <InfoCircleOutlined style={{ fontSize: 24, color: COLOR.TEXT_LIGHT }} />
        <TenderlyAccessTokenLabelV2 />
        <CoinGeckoApiKeyLabelV2 />
        <GeminiApiKeyLabelV2 />
      </Flex>
    </Container>
  );
};
