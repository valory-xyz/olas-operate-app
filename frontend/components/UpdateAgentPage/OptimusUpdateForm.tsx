import { Button, Form, Input } from 'antd';
import { get, isEqual, isUndefined, omitBy } from 'lodash';
import { ReactNode, useCallback, useContext, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

import {
  optionalFieldProps,
  requiredFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
  validateSlug,
} from '../AgentForms/common/formUtils';
import { InvalidGeminiApiCredentials } from '../AgentForms/common/InvalidGeminiApiCredentials';
import {
  CoinGeckoApiKeyDesc,
  CoinGeckoApiKeySubHeader,
  GeminiApiKeyDesc,
  GeminiApiKeyLabel,
  GeminiApiKeySubHeader,
  TenderlyAccessTokenDesc,
  TenderlyApiKeySubHeader,
} from '../AgentForms/common/labels';
import { useOptimusFormValidate } from '../SetupPage/SetupYourAgent/OptimusAgentForm/useOptimusFormValidate';
import { UpdateAgentContext } from './context/UpdateAgentProvider';

type OptimusFormValues = {
  env_variables: {
    TENDERLY_ACCESS_KEY: string;
    TENDERLY_ACCOUNT_SLUG: string;
    TENDERLY_PROJECT_SLUG: string;
    COINGECKO_API_KEY: string;
    GENAI_API_KEY: string;
  };
};

type OptimusUpdateFormProps = {
  initialFormValues: Nullable<OptimusFormValues>;
};

const OptimusUpdateForm = ({ initialFormValues }: OptimusUpdateFormProps) => {
  const { form, confirmUpdateModal: confirmModal } =
    useContext(UpdateAgentContext);

  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useOptimusFormValidate('Save Changes');

  const handleFinish = useCallback(
    async (values: OptimusFormValues) => {
      try {
        const envVariables = values.env_variables;
        const userInputs = {
          tenderlyAccessToken: envVariables.TENDERLY_ACCESS_KEY,
          tenderlyAccountSlug: envVariables.TENDERLY_ACCOUNT_SLUG,
          tenderlyProjectSlug: envVariables.TENDERLY_PROJECT_SLUG,
          coinGeckoApiKey: envVariables.COINGECKO_API_KEY,
          geminiApiKey: envVariables.GENAI_API_KEY,
        };
        const isFormValid = await validateForm(userInputs);
        if (!isFormValid) return;

        updateSubmitButtonText('Updating agent...');
        confirmModal.openModal();
      } catch (error) {
        console.error('Error validating form:', error);
      } finally {
        updateSubmitButtonText('Save Changes');
      }
    },
    [validateForm, confirmModal, updateSubmitButtonText],
  );

  return (
    <Form<OptimusFormValues>
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
    >
      <TenderlyApiKeySubHeader />
      <Form.Item
        label="Tenderly access token"
        name={['env_variables', 'TENDERLY_ACCESS_KEY']}
        {...requiredFieldProps}
        rules={[...requiredRules, { validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label="Tenderly account slug"
        name={['env_variables', 'TENDERLY_ACCOUNT_SLUG']}
        {...requiredFieldProps}
        rules={[...requiredRules, { validator: validateSlug }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Tenderly project slug"
        name={['env_variables', 'TENDERLY_PROJECT_SLUG']}
        {...requiredFieldProps}
        rules={[...requiredRules, { validator: validateSlug }]}
      >
        <Input />
      </Form.Item>
      <div style={{ paddingBottom: 42 }} />

      <CoinGeckoApiKeySubHeader />
      <Form.Item
        label="CoinGecko API key"
        name={['env_variables', 'COINGECKO_API_KEY']}
        {...requiredFieldProps}
        rules={[...requiredRules, { validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>
      <div style={{ paddingBottom: 42 }} />

      <GeminiApiKeySubHeader name="Optimus" />
      <Form.Item
        label={<GeminiApiKeyLabel />}
        name={['env_variables', 'GENAI_API_KEY']}
        {...optionalFieldProps}
        rules={[{ validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>
      {geminiApiKeyValidationStatus === 'invalid' && (
        <InvalidGeminiApiCredentials />
      )}

      <Form.Item>
        <Button size="large" type="primary" htmlType="submit" block>
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

type OptimusUpdatePageProps = {
  renderForm: (
    form: ReactNode,
    desc: ReactNode,
    onBack?: () => void,
  ) => ReactNode;
};

/**
 * Form for updating Optimus agent.
 */
export const OptimusUpdatePage = ({ renderForm }: OptimusUpdatePageProps) => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const { unsavedModal, form } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<OptimusFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);

    return envEntries.reduce(
      (acc, [key, { value }]) => {
        if (key === 'TENDERLY_ACCESS_KEY') {
          acc.env_variables.TENDERLY_ACCESS_KEY = value;
        } else if (key === 'TENDERLY_ACCOUNT_SLUG') {
          acc.env_variables.TENDERLY_ACCOUNT_SLUG = value;
        } else if (key === 'TENDERLY_PROJECT_SLUG') {
          acc.env_variables.TENDERLY_PROJECT_SLUG = value;
        } else if (key === 'COINGECKO_API_KEY') {
          acc.env_variables.COINGECKO_API_KEY = value;
        } else if (key === 'GENAI_API_KEY') {
          acc.env_variables.GENAI_API_KEY = value;
        }

        return acc;
      },
      { env_variables: {} } as OptimusFormValues,
    );
  }, [selectedService?.env_variables]);

  const handleBackClick = useCallback(() => {
    // Check if there are unsaved changes and omit empty fields
    const unsavedFields = omitBy(
      get(form?.getFieldsValue(), 'env_variables'),
      (value) => isUndefined(value),
    );
    const previousValues = initialValues?.env_variables;

    const hasUnsavedChanges = !isEqual(unsavedFields, previousValues);
    if (hasUnsavedChanges) {
      unsavedModal.openModal();
    } else {
      goto(Pages.Main);
    }
  }, [initialValues, form, unsavedModal, goto]);

  return renderForm(
    <OptimusUpdateForm initialFormValues={initialValues} />,
    <>
      <TenderlyAccessTokenDesc />
      <CoinGeckoApiKeyDesc />
      <GeminiApiKeyDesc />
    </>,
    handleBackClick,
  );
};
