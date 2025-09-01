import { Typography } from 'antd';
import React from 'react';

import { CustomAlert } from '@/components/Alert';
import { AgentMap } from '@/constants/agent';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useServices } from '@/hooks/useServices';

import { AgentsFunAgentSetup } from './AgentsFunAgentSetup';
import { ModiusAgentForm } from './ModiusAgentForm/ModiusAgentForm';
import { OptimusAgentForm } from './OptimusAgentForm/OptimusAgentForm';
import { AgentFormContainer, useDisplayAgentForm } from './useDisplayAgentForm';

const { Text } = Typography;

export const SetupYourAgent = () => {
  const { selectedAgentType } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );
  const displayForm = useDisplayAgentForm();

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
    <AgentFormContainer flex="none">
      {selectedAgentType === AgentMap.Modius && (
        <ModiusAgentForm
          serviceTemplate={serviceTemplate}
          renderForm={displayForm}
        />
      )}
      {selectedAgentType === AgentMap.Optimus && (
        <OptimusAgentForm
          serviceTemplate={serviceTemplate}
          renderForm={displayForm}
        />
      )}
      {selectedAgentType === AgentMap.AgentsFun && (
        <AgentsFunAgentSetup
          serviceTemplate={serviceTemplate}
          renderForm={displayForm}
        />
      )}
    </AgentFormContainer>
  );
};
