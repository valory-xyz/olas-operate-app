import { InfoCircleOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';
import React, { ReactNode, useCallback } from 'react';
import styled from 'styled-components';

import { CustomAlert } from '@/components/Alert';
import { AgentHeader } from '@/components/ui/AgentHeader';
import { AgentMap } from '@/constants/agent';
import { COLOR } from '@/constants/colors';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
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
  /* min-height: 796px; */
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
      {selectedAgentType === AgentMap.AgentsFun && (
        <AgentsFunAgentSetup
          serviceTemplate={serviceTemplate}
          renderForm={renderForm}
        />
      )}
      {selectedAgentType === AgentMap.Optimus && (
        <OptimusAgentForm
          serviceTemplate={serviceTemplate}
          renderForm={renderForm}
        />
      )}
      {selectedAgentType === AgentMap.Modius && (
        <ModiusAgentForm
          serviceTemplate={serviceTemplate}
          renderForm={renderForm}
        />
      )}
    </Container>
  );
};
