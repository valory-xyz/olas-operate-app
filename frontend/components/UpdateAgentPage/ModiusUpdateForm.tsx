import { Button, Form, Input } from 'antd';
import { get, isEqual, isUndefined, omitBy } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

import {
  CoinGeckoApiKeyLabel,
  ModiusGeminiApiKeyLabel,
  TenderlyAccessTokenLabel,
  TenderlyAccountSlugLabel,
  TenderlyProjectSlugLabel,
} from '../SetupPage/SetupYourAgent/ModiusAgentForm/labels';
import { useModiusFormValidate } from '../SetupPage/SetupYourAgent/ModiusAgentForm/useModiusFormValidate';
import { InvalidGeminiApiCredentials } from '../SetupPage/SetupYourAgent/shared/components';
// TODO: move the following hook/components to a shared place
// once Modius work is merged
import {
  modiusAgentFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
  validateSlug,
} from '../SetupPage/SetupYourAgent/shared/formUtils';
import { CardLayout } from './CardLayout';
import { UpdateAgentContext } from './context/UpdateAgentProvider';

type ModiusFormValues = {
  env_variables: {
    TENDERLY_ACCESS_KEY: string;
    TENDERLY_ACCOUNT_SLUG: string;
    TENDERLY_PROJECT_SLUG: string;
    COINGECKO_API_KEY: string;
    GENAI_API_KEY: string;
  };
};

type ModiusUpdateFormProps = {
  initialFormValues: Nullable<ModiusFormValues>;
};

const ModiusUpdateForm = ({ initialFormValues }: ModiusUpdateFormProps) => {
  const {
    isEditing,
    form,
    confirmUpdateModal: confirmModal,
  } = useContext(UpdateAgentContext);

  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = useModiusFormValidate('Save Changes');

  const handleFinish = useCallback(
    async (values: ModiusFormValues) => {
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
    <Form<ModiusFormValues>
      form={form}
      layout="vertical"
      disabled={!isEditing}
      onFinish={handleFinish}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
    >
      <Form.Item
        label={<TenderlyAccessTokenLabel />}
        name={['env_variables', 'TENDERLY_ACCESS_KEY']}
        {...modiusAgentFieldProps}
        rules={[...requiredRules, { validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label={<TenderlyAccountSlugLabel />}
        name={['env_variables', 'TENDERLY_ACCOUNT_SLUG']}
        {...modiusAgentFieldProps}
        rules={[...requiredRules, { validator: validateSlug }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={<TenderlyProjectSlugLabel />}
        name={['env_variables', 'TENDERLY_PROJECT_SLUG']}
        {...modiusAgentFieldProps}
        rules={[...requiredRules, { validator: validateSlug }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={<CoinGeckoApiKeyLabel />}
        name={['env_variables', 'COINGECKO_API_KEY']}
        {...modiusAgentFieldProps}
        rules={[...requiredRules, { validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label={<ModiusGeminiApiKeyLabel />}
        name={['env_variables', 'GENAI_API_KEY']}
        {...modiusAgentFieldProps}
        rules={[{ validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>
      {geminiApiKeyValidationStatus === 'invalid' && (
        <InvalidGeminiApiCredentials />
      )}

      <Form.Item hidden={!isEditing}>
        <Button size="large" type="primary" htmlType="submit" block>
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

/**
 * Form for updating Modius agent.
 */
export const ModiusUpdatePage = () => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const { unsavedModal, form } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<ModiusFormValues>>(() => {
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
      { env_variables: {} } as ModiusFormValues,
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

  return (
    <CardLayout onClickBack={handleBackClick}>
      <ModiusUpdateForm initialFormValues={initialValues} />
    </CardLayout>
  );
};
