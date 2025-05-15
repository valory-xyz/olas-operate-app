import { Divider, message, Typography } from 'antd';
import React, { useCallback } from 'react';

import { ServiceTemplate } from '@/client';
import { MemeooorrAgentForm } from '@/components/AgentForms/MemeooorrAgentForm/MemeooorrAgentForm';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { onDummyServiceCreation } from '@/utils/service';

import { MemeooorrFieldValues } from '../../AgentForms/MemeooorrAgentForm/useMemeFormValidate';

const { Text } = Typography;

type MemeooorrFormValues = MemeooorrFieldValues & {
  fireworksApiEnabled: boolean;
};

type MemeooorrAgentFormProps = { serviceTemplate: ServiceTemplate };

export const MemeooorrAgentSetup = ({
  serviceTemplate,
}: MemeooorrAgentFormProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const onSubmit = useCallback(
    async (values: MemeooorrFormValues, cookies: string) => {
      if (!defaultStakingProgramId) return;

      try {
        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          description: `Memeooorr @${values.xUsername}`,
          env_variables: {
            ...serviceTemplate.env_variables,
            TWIKIT_USERNAME: {
              ...serviceTemplate.env_variables.TWIKIT_USERNAME,
              value: values.xUsername,
            },
            TWIKIT_EMAIL: {
              ...serviceTemplate.env_variables.TWIKIT_EMAIL,
              value: values.xEmail,
            },
            TWIKIT_PASSWORD: {
              ...serviceTemplate.env_variables.TWIKIT_PASSWORD,
              value: values.xPassword,
            },
            TWIKIT_COOKIES: {
              ...serviceTemplate.env_variables.TWIKIT_COOKIES,
              value: cookies,
            },
            GENAI_API_KEY: {
              ...serviceTemplate.env_variables.GENAI_API_KEY,
              value: values.geminiApiKey,
            },
            FIREWORKS_API_KEY: {
              ...serviceTemplate.env_variables.FIREWORKS_API_KEY,
              value: values.fireworksApiEnabled ? values.fireworksApiKey : '',
            },
            PERSONA: {
              ...serviceTemplate.env_variables.PERSONA,
              value: values.personaDescription,
            },
          },
        };

        await onDummyServiceCreation(
          defaultStakingProgramId,
          overriddenServiceConfig,
        );

        message.success('Agent setup complete');

        // move to next page
        goto(SetupScreen.SetupEoaFunding);
      } catch (error) {
        message.error('Something went wrong. Please try again.');
        console.error(error);
      }
    },
    [defaultStakingProgramId, serviceTemplate, goto],
  );

  return (
    <>
      <Text>
        Provide your agent with a persona, access to an LLM and an X account.
      </Text>
      <Divider style={{ margin: '8px 0' }} />

      <MemeooorrAgentForm
        isFormEnabled={!!defaultStakingProgramId}
        onSubmit={onSubmit}
      />
    </>
  );
};
