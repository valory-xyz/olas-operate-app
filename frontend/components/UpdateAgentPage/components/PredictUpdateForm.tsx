import { Button, Form, Input } from 'antd';
import { get, isEqual, isUndefined, omitBy } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { RequiredMark } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState, useServices } from '@/hooks';
import { Nullable } from '@/types/Util';

import {
  optionalFieldProps,
  validateApiKey,
  validateMessages,
} from '../../AgentForms/common/formUtils';
import { InvalidGeminiApiCredentials } from '../../AgentForms/common/InvalidGeminiApiCredentials';
import {
  GeminiApiKeyDesc,
  GeminiApiKeyLabel,
  GeminiApiKeySubHeader,
} from '../../AgentForms/common/labels';
import { usePredictFormValidate } from '../../SetupPage/SetupYourAgent/PredictAgentForm/usePredictFormValidate';
import { RenderForm } from '../../SetupPage/SetupYourAgent/useDisplayAgentForm';
import { UpdateAgentContext } from '../context/UpdateAgentProvider';

type PredictFormValues = {
  env_variables: {
    GENAI_API_KEY: string;
  };
};

type PredictUpdateFormProps = {
  initialFormValues: Nullable<PredictFormValues>;
};

const PredictUpdateForm = ({ initialFormValues }: PredictUpdateFormProps) => {
  const { form, confirmUpdateModal: confirmModal } =
    useContext(UpdateAgentContext);

  const {
    geminiApiKeyValidationStatus,
    submitButtonText,
    updateSubmitButtonText,
    validateForm,
  } = usePredictFormValidate('Save Changes');

  const handleFinish = useCallback(
    async (values: PredictFormValues) => {
      try {
        const envVariables = values.env_variables;
        const userInputs = {
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
    <Form<PredictFormValues>
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
      className="label-no-padding"
      requiredMark={RequiredMark}
    >
      <GeminiApiKeySubHeader name="Prediction" />
      <Form.Item
        label={<GeminiApiKeyLabel />}
        name={['env_variables', 'GENAI_API_KEY']}
        {...optionalFieldProps}
        rules={[{ validator: validateApiKey }]}
        className="mb-8"
      >
        <Input.Password />
      </Form.Item>
      {geminiApiKeyValidationStatus === 'invalid' && (
        <InvalidGeminiApiCredentials />
      )}

      <Form.Item>
        <Button
          size="large"
          type="primary"
          htmlType="submit"
          block
          className="mt-12"
        >
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

type PredictUpdatePageProps = {
  renderForm: RenderForm;
};

/**
 * Form for updating Predict agent.
 */
export const PredictUpdatePage = ({ renderForm }: PredictUpdatePageProps) => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const { unsavedModal, form } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<PredictFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);

    return envEntries.reduce(
      (acc, [key, { value }]) => {
        if (key === 'GENAI_API_KEY') {
          acc.env_variables.GENAI_API_KEY = value;
        }
        return acc;
      },
      { env_variables: {} } as PredictFormValues,
    );
  }, [selectedService?.env_variables]);

  const handleClickBack = useCallback(() => {
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
    <PredictUpdateForm initialFormValues={initialValues} />,
    <>
      <GeminiApiKeyDesc />
    </>,
    { isUpdate: true, onBack: handleClickBack },
  );
};
