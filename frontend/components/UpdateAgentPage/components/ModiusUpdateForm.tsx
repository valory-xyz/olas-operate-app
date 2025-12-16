import { Button, Form, Input } from 'antd';
import { get, isEqual, isUndefined, omitBy } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { RequiredMark } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState, useServices } from '@/hooks';
import { Nullable } from '@/types/Util';

import {
  optionalFieldProps,
  requiredFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
} from '../../AgentForms/common/formUtils';
import { InvalidGeminiApiCredentials } from '../../AgentForms/common/InvalidGeminiApiCredentials';
import {
  CoinGeckoApiKeyDesc,
  CoinGeckoApiKeyLabel,
  CoinGeckoApiKeySubHeader,
  GeminiApiKeyDesc,
  GeminiApiKeyLabel,
  GeminiApiKeySubHeader,
} from '../../AgentForms/common/labels';
import { useModiusFormValidate } from '../../SetupPage/SetupYourAgent/ModiusAgentForm/useModiusFormValidate';
import { RenderForm } from '../../SetupPage/SetupYourAgent/useDisplayAgentForm';
import { UpdateAgentContext } from '../context/UpdateAgentProvider';

type ModiusFormValues = {
  env_variables: {
    COINGECKO_API_KEY: string;
    GENAI_API_KEY: string;
  };
};

type ModiusUpdateFormProps = {
  initialFormValues: Nullable<ModiusFormValues>;
};

const ModiusUpdateForm = ({ initialFormValues }: ModiusUpdateFormProps) => {
  const { form, confirmUpdateModal: confirmModal } =
    useContext(UpdateAgentContext);

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
      onFinish={handleFinish}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
      className="label-no-padding"
      requiredMark={RequiredMark}
    >
      <CoinGeckoApiKeySubHeader />
      <Form.Item
        label={<CoinGeckoApiKeyLabel />}
        name={['env_variables', 'COINGECKO_API_KEY']}
        {...requiredFieldProps}
        rules={[...requiredRules, { validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>
      <div style={{ paddingBottom: 42 }} />

      <GeminiApiKeySubHeader name="Modius" />
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

type ModiusUpdatePageProps = {
  renderForm: RenderForm;
};

/**
 * Form for updating Modius agent.
 */
export const ModiusUpdatePage = ({ renderForm }: ModiusUpdatePageProps) => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const { unsavedModal, form } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<ModiusFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);

    return envEntries.reduce(
      (acc, [key, { value }]) => {
        if (key === 'COINGECKO_API_KEY') {
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
      goto(PAGES.Main);
    }
  }, [initialValues, form, unsavedModal, goto]);

  return renderForm(
    <ModiusUpdateForm initialFormValues={initialValues} />,
    <>
      <CoinGeckoApiKeyDesc />
      <GeminiApiKeyDesc />
    </>,
    { isUpdate: true, onBack: handleBackClick },
  );
};
