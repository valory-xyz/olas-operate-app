import { Button, Form, Input } from 'antd';
import { isEqual, isUndefined, omitBy } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import {
  requiredFieldProps,
  validateMessages,
} from '@/components/AgentForms/common/formUtils';
import {
  XAccountAccessTokenLabel,
  XAccountAccessTokenSecretLabel,
  XAccountApiTokensDesc,
  XAccountApiTokensSubHeader,
  XAccountBearerTokenLabel,
  XAccountConsumerApiKeyLabel,
  XAccountConsumerApiKeySecretLabel,
  XAccountUsernameLabel,
} from '@/components/AgentForms/common/labels';
import { RenderForm } from '@/components/SetupPage/SetupYourAgent/useDisplayAgentForm';
import { RequiredMark } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState, useServices } from '@/hooks';
import { Nullable } from '@/types/Util';
import { getXUsername } from '@/utils';

import { UpdateAgentContext } from '../context/UpdateAgentProvider';

type AgentsFunUpdateFormValues = {
  xUsername: string;
  env_variables: {
    TWEEPY_CONSUMER_API_KEY: string;
    TWEEPY_CONSUMER_API_KEY_SECRET: string;
    TWEEPY_BEARER_TOKEN: string;
    TWEEPY_ACCESS_TOKEN: string;
    TWEEPY_ACCESS_TOKEN_SECRET: string;
  };
};

const agentsFunEnvKeys = [
  'TWEEPY_CONSUMER_API_KEY',
  'TWEEPY_CONSUMER_API_KEY_SECRET',
  'TWEEPY_BEARER_TOKEN',
  'TWEEPY_ACCESS_TOKEN',
  'TWEEPY_ACCESS_TOKEN_SECRET',
] as const;

type AgentsFunUpdateFormContentProps = {
  initialFormValues: Nullable<AgentsFunUpdateFormValues>;
};

const AgentsFunUpdateFormContent = ({
  initialFormValues,
}: AgentsFunUpdateFormContentProps) => {
  const { form, confirmUpdateModal: confirmModal } =
    useContext(UpdateAgentContext);

  const handleFinish = useCallback(async () => {
    confirmModal.openModal();
  }, [confirmModal]);

  return (
    <Form<AgentsFunUpdateFormValues>
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
      className="label-no-padding"
      requiredMark={RequiredMark}
    >
      <XAccountApiTokensSubHeader />
      <Form.Item
        label={<XAccountUsernameLabel />}
        name="xUsername"
        {...requiredFieldProps}
      >
        <Input addonBefore="@" />
      </Form.Item>

      <Form.Item
        label={<XAccountConsumerApiKeyLabel />}
        name={['env_variables', 'TWEEPY_CONSUMER_API_KEY']}
        {...requiredFieldProps}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label={<XAccountConsumerApiKeySecretLabel />}
        name={['env_variables', 'TWEEPY_CONSUMER_API_KEY_SECRET']}
        {...requiredFieldProps}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label={<XAccountBearerTokenLabel />}
        name={['env_variables', 'TWEEPY_BEARER_TOKEN']}
        {...requiredFieldProps}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label={<XAccountAccessTokenLabel />}
        name={['env_variables', 'TWEEPY_ACCESS_TOKEN']}
        {...requiredFieldProps}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label={<XAccountAccessTokenSecretLabel />}
        name={['env_variables', 'TWEEPY_ACCESS_TOKEN_SECRET']}
        {...requiredFieldProps}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item>
        <Button size="large" type="primary" htmlType="submit" block>
          Save Changes
        </Button>
      </Form.Item>
    </Form>
  );
};

type AgentsFunUpdateFormProps = {
  renderForm: RenderForm;
};

type AgentsFunEnvVariableKey = (typeof agentsFunEnvKeys)[number];
/**
 * Form for updating Agents.Fun agent.
 */
export const AgentsFunUpdateForm = ({
  renderForm,
}: AgentsFunUpdateFormProps) => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const { unsavedModal, form } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<AgentsFunUpdateFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);

    return {
      xUsername: getXUsername(selectedService) || '',
      env_variables: envEntries.reduce(
        (acc, [key, { value }]) => {
          if (agentsFunEnvKeys.includes(key as AgentsFunEnvVariableKey)) {
            acc[key as AgentsFunEnvVariableKey] = value;
          }
          return acc;
        },
        {} as AgentsFunUpdateFormValues['env_variables'],
      ),
    };
  }, [selectedService]);

  const handleBackClick = useCallback(() => {
    // Check if there are unsaved changes and omit empty fields
    const formValues = form?.getFieldsValue();
    const unsavedFields = {
      xUsername: formValues?.xUsername,
      env_variables: omitBy(
        formValues?.env_variables,
        (value) => isUndefined(value) || value === '',
      ),
    };

    const hasUnsavedChanges = !isEqual(unsavedFields, initialValues);
    if (hasUnsavedChanges) {
      unsavedModal.openModal();
    } else {
      goto(PAGES.Main);
    }
  }, [initialValues, form, unsavedModal, goto]);

  return renderForm(
    <AgentsFunUpdateFormContent initialFormValues={initialValues} />,
    <XAccountApiTokensDesc />,
    { isUpdate: true, onBack: handleBackClick },
  );
};
