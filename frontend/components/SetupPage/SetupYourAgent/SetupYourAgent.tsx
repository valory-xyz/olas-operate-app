import { ConfigProvider, Typography } from 'antd';
import React from 'react';

import { CustomAlert } from '@/components/Alert';
import { CardFlex } from '@/components/styled/CardFlex';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { SetupScreen } from '@/enums/SetupScreen';
import { useServices } from '@/hooks/useServices';
import { LOCAL_FORM_THEME } from '@/theme';

import { SetupCreateHeader } from '../Create/SetupCreateHeader';
import { MemeooorrAgentForm } from './MemeooorrAgentForm/MemeooorrAgentForm';
import { ModiusAgentForm } from './ModiusAgentForm/ModiusAgentForm';

const { Title, Text } = Typography;

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
    <ConfigProvider theme={LOCAL_FORM_THEME}>
      <CardFlex gap={10} styles={{ body: { padding: '12px 24px' } }} noBorder>
        <SetupCreateHeader prev={SetupScreen.AgentIntroduction} />
        <Title level={3}>Set up your agent</Title>

        {selectedAgentType === AgentType.Memeooorr && (
          <MemeooorrAgentForm serviceTemplate={serviceTemplate} />
        )}

        {selectedAgentType === AgentType.Modius && (
          <ModiusAgentForm serviceTemplate={serviceTemplate} />
        )}

        <Text
          type="secondary"
          className="text-sm"
          style={{ display: 'block', marginTop: '-16px' }}
        >
          You won’t be able to update your agent’s configuration after this
          step.
        </Text>
      </CardFlex>
    </ConfigProvider>
  );
};
