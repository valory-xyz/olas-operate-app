import { Button, Form, Input } from 'antd';
import { get, isEqual, isUndefined, omitBy } from 'lodash';
import { useCallback, useContext, useMemo, useState } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState, useServices } from '@/hooks';
import { Nullable } from '@/types/Util';

import {
  requiredFieldProps,
  requiredRules,
  validateApiKey,
  validateMessages,
} from '../../AgentForms/common/formUtils';
import {
  OpenAiApiKeyDesc,
  OpenAiApiKeyLabel,
  OpenAiApiKeySubHeader,
} from '../../AgentForms/common/labels';
import { RenderForm } from '../../SetupPage/SetupYourAgent/useDisplayAgentForm';
import { UpdateAgentContext } from '../context/UpdateAgentProvider';

type PettAiFormValues = {
  env_variables: {
    OPENAI_API_KEY: string;
  };
};

type PettAiUpdateFormProps = {
  initialFormValues: Nullable<PettAiFormValues>;
};

const DEFAULT_SUBMIT_BUTTON_TEXT = 'Continue';

const PettAiUpdateForm = ({ initialFormValues }: PettAiUpdateFormProps) => {
  const { form, confirmUpdateModal: confirmModal } =
    useContext(UpdateAgentContext);
  const [submitButtonText, setSubmitButtonText] = useState(
    DEFAULT_SUBMIT_BUTTON_TEXT,
  );

  const handleFinish = useCallback(async () => {
    confirmModal.openModal();
    setSubmitButtonText('Save Changes');
  }, [confirmModal]);

  return (
    <Form<PettAiFormValues>
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
      className="label-no-padding"
    >
      <OpenAiApiKeySubHeader />
      <Form.Item
        label={<OpenAiApiKeyLabel />}
        name={['env_variables', 'OPENAI_API_KEY']}
        {...requiredFieldProps}
        rules={[...requiredRules, { validator: validateApiKey }]}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item>
        <Button size="large" type="primary" htmlType="submit" block>
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

type PettAiUpdatePageProps = {
  renderForm: RenderForm;
};

/**
 * Form for updating PettAi agent.
 */
export const PettAiUpdatePage = ({ renderForm }: PettAiUpdatePageProps) => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const { unsavedModal, form } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<PettAiFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);

    return envEntries.reduce(
      (acc, [key, { value }]) => {
        if (key === 'OPENAI_API_KEY') {
          acc.env_variables.OPENAI_API_KEY = value;
        }

        return acc;
      },
      { env_variables: {} } as PettAiFormValues,
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
    <PettAiUpdateForm initialFormValues={initialValues} />,
    <>
      <OpenAiApiKeyDesc />
    </>,
    { isUpdate: true, onBack: handleBackClick },
  );
};
