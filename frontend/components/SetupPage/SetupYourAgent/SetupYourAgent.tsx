import { Typography } from 'antd';
import React from 'react';

import { CustomAlert } from '@/components/Alert';
import { AgentMap } from '@/constants/agent';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { useServices } from '@/hooks/useServices';

import { AgentsFunAgentSetup } from './AgentsFunAgentForm/AgentsFunAgentForm';
import { ModiusAgentForm } from './ModiusAgentForm/ModiusAgentForm';
import { OptimusAgentForm } from './OptimusAgentForm/OptimusAgentForm';
import { PredictAgentSetup } from './PredictAgentForm/PredictAgentForm';
import { AgentFormContainer, useDisplayAgentForm } from './useDisplayAgentForm';

const { Text } = Typography;

export const SetupYourAgent = () => {
  const { selectedAgentType, selectedAgentConfig } = useServices();
  const serviceTemplate = SERVICE_TEMPLATES.find(
    (template) => template.agentType === selectedAgentType,
  );
  const displayForm = useDisplayAgentForm();

  const { isX402Enabled } = selectedAgentConfig;

  if (isX402Enabled) {
    throw new Error(
      'Setting up agent feature is not supported for the selected agent.',
    );
  }

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
    <AgentFormContainer flex="none" $hasMinHeight>
      {selectedAgentType === AgentMap.PredictTrader && (
        <PredictAgentSetup
          serviceTemplate={serviceTemplate}
          renderForm={displayForm}
        />
      )}
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
