import { Flex, Typography } from 'antd';
import React from 'react';
import styled from 'styled-components';

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
      <Flex vertical className="setup-left-content">
        <AgentHeader
          onPrev={() => goto(SetupScreen.AgentOnboarding)}
          hideLogo
        />

        <Title level={3} className="mb-0">
          Configure Your Agent
        </Title>

        {selectedAgentType === AgentType.AgentsFun && (
          <AgentsFunAgentSetup serviceTemplate={serviceTemplate} />
        )}
        {selectedAgentType === AgentType.Modius && (
          <ModiusAgentForm serviceTemplate={serviceTemplate} />
        )}
        {selectedAgentType === AgentType.Optimus && (
          <OptimusAgentForm serviceTemplate={serviceTemplate} />
        )}
      </Flex>
      <Flex className="setup-right-content">
        <Title level={4} className="mb-0">
          Agent Details
        </Title>
      </Flex>
    </Container>
  );
};
