import { Button, Divider, Form, Input, message, Typography } from 'antd';
import React, { useCallback, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { ServiceTemplate } from '@/client';
import { SetupScreen } from '@/enums/SetupScreen';
import { useSetup } from '@/hooks/useSetup';
import { useStakingProgram } from '@/hooks/useStakingProgram';

import { commonFieldProps, validateMessages } from '../formUtils';
import { onDummyServiceCreation } from '../utils';

const { Text } = Typography;

type FieldValues = {
  tenderlyAccessToken: string;
  tenderlyAccountSlug: string;
  tenderlyProjectSlug: string;
  CoinGeckoApiKey: string;
};

type ModiusAgentFormProps = { serviceTemplate: ServiceTemplate };

export const ModiusAgentForm = ({ serviceTemplate }: ModiusAgentFormProps) => {
  const { goto } = useSetup();
  const { defaultStakingProgramId } = useStakingProgram();

  const [form] = Form.useForm<FieldValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Continue');

  const onFinish = useCallback(
    async (values: Record<keyof FieldValues, string>) => {
      if (!defaultStakingProgramId) return;

      try {
        setIsSubmitting(true);

        // wait for agent setup to complete
        setSubmitButtonText('Setting up agent...');

        const overriddenServiceConfig: ServiceTemplate = {
          ...serviceTemplate,
          env_variables: {
            ...serviceTemplate.env_variables,
            TENDERLY_ACCESS_KEY: {
              ...serviceTemplate.env_variables.TENDERLY_ACCESS_KEY,
              value: values.tenderlyAccessToken,
            },
            TENDERLY_ACCOUNT_SLUG: {
              ...serviceTemplate.env_variables.TENDERLY_ACCOUNT_SLUG,
              value: values.tenderlyAccountSlug,
            },
            TENDERLY_PROJECT_SLUG: {
              ...serviceTemplate.env_variables.TENDERLY_PROJECT_SLUG,
              value: values.tenderlyProjectSlug,
            },
            COINGECKO_API_KEY: {
              ...serviceTemplate.env_variables.COINGECKO_API_KEY,
              value: values.CoinGeckoApiKey,
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
      } finally {
        setIsSubmitting(false);
        setSubmitButtonText('Continue');
      }
    },
    [defaultStakingProgramId, serviceTemplate, goto],
  );

  // Clean up
  useUnmount(async () => {
    setIsSubmitting(false);
    setSubmitButtonText('Continue');
  });

  const canSubmitForm = isSubmitting || !defaultStakingProgramId;

  return (
    <>
      <Text>
        Set up your agent with access to a Tenderly project for simulating
        bridge and swap routes to select the best available option at the time
        of investment. Additionally, provide a CoinGecko API key as a price
        source to calculate the initial investment assets required for the
        agent.
      </Text>
      <Divider style={{ margin: '8px 0' }} />

      <Form<FieldValues>
        form={form}
        name="setup-your-agent"
        layout="vertical"
        onFinish={onFinish}
        validateMessages={validateMessages}
        disabled={canSubmitForm}
      >
        <Form.Item
          name="tenderlyAccessToken"
          label="Tenderly access token"
          {...commonFieldProps}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="tenderlyAccountSlug"
          label="Tenderly account slug"
          {...commonFieldProps}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="tenderlyProjectSlug"
          label="Tenderly project slug"
          {...commonFieldProps}
        >
          <Input
            addonBefore="@"
            onKeyDown={(e) => {
              if (e.key === '@') {
                e.preventDefault();
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="CoinGeckoApiKey"
          label="CoinGecko API key"
          {...commonFieldProps}
        >
          <Input />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isSubmitting}
            disabled={canSubmitForm}
          >
            {submitButtonText}
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};
