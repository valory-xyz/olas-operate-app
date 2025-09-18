import { message } from 'antd';
import React, { useCallback } from 'react';

import { ServiceTemplate } from '@/client';
import { GeminiApiKeyDesc } from '@/components/AgentForms/common/labels';
import {
  PredictAgentForm,
  PredictFormValues,
} from '@/components/AgentForms/PredictForm';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { onDummyServiceCreation } from '@/utils/service';

import { RenderForm } from './useDisplayAgentForm';

type PredictAgentSetupFormProps = { serviceTemplate: ServiceTemplate };

export const PredictAgentSetup = ({
  serviceTemplate,
  renderForm,
}: PredictAgentSetupFormProps & {
  renderForm: RenderForm;
}) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const onSubmit = useCallback(
    async (values: PredictFormValues) => {
      if (!defaultStakingProgramId) return;

      try {
        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          env_variables: {
            ...serviceTemplate.env_variables,
            GENAI_API_KEY: {
              ...serviceTemplate.env_variables.GENAI_API_KEY,
              value: values.geminiApiKey || '',
            },
          },
        };

        await onDummyServiceCreation(
          defaultStakingProgramId,
          overriddenServiceConfig,
        );

        message.success('Agent setup complete');

        // move to next page
        goto(SetupScreen.FundYourAgent);
      } catch (error) {
        message.error('Something went wrong. Please try again.');
        console.error(error);
      }
    },
    [defaultStakingProgramId, serviceTemplate, goto],
  );

  return renderForm(
    <PredictAgentForm
      isFormEnabled={!!defaultStakingProgramId}
      agentFormType="create"
      onSubmit={onSubmit}
    />,
    <>
      <GeminiApiKeyDesc />
    </>,
    { onBack: undefined },
  );
};
