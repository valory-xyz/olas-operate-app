import { Divider, message, Typography } from 'antd';
import React, { useCallback } from 'react';

import { ServiceTemplate } from '@/client';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';
import { onDummyServiceCreation } from '@/utils/service';

import {
  AgentsFunAgentForm,
  AgentsFunFormValues,
} from '../../AgentForms/AgentsFunAgentForm';

const { Text } = Typography;

type AgentsFunAgentFormProps = { serviceTemplate: ServiceTemplate };

export const AgentsFunAgentSetup = ({
  serviceTemplate,
}: AgentsFunAgentFormProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const onSubmit = useCallback(
    async (values: AgentsFunFormValues & { fireworksApiEnabled: boolean }) => {
      if (!defaultStakingProgramId) return;

      try {
        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          description: `Agents.Fun @${values.xUsername}`,
          env_variables: {
            ...serviceTemplate.env_variables,
            TWEEPY_CONSUMER_API_KEY: {
              ...serviceTemplate.env_variables.TWEEPY_CONSUMER_API_KEY,
              value: values.xConsumerApiKey,
            },
            TWEEPY_CONSUMER_API_KEY_SECRET: {
              ...serviceTemplate.env_variables.TWEEPY_CONSUMER_API_KEY_SECRET,
              value: values.xConsumerApiSecret,
            },
            TWEEPY_BEARER_TOKEN: {
              ...serviceTemplate.env_variables.TWEEPY_BEARER_TOKEN,
              value: values.xBearerToken,
            },
            TWEEPY_ACCESS_TOKEN: {
              ...serviceTemplate.env_variables.TWEEPY_ACCESS_TOKEN,
              value: values.xAccessToken,
            },
            TWEEPY_ACCESS_TOKEN_SECRET: {
              ...serviceTemplate.env_variables.TWEEPY_ACCESS_TOKEN_SECRET,
              value: values.xAccessTokenSecret,
            },
            GENAI_API_KEY: {
              ...serviceTemplate.env_variables.GENAI_API_KEY,
              value: values.geminiApiKey || '',
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
      <Text className="text-lighter">
        Provide your agent with a persona, access to an LLM and an X account.
      </Text>
      <Divider style={{ margin: '8px 0' }} />

      <AgentsFunAgentForm
        isFormEnabled={!!defaultStakingProgramId}
        agentFormType="create"
        onSubmit={onSubmit}
      />
    </>
  );
};
