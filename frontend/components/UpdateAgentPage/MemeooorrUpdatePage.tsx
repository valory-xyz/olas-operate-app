import { Button, Form, Input } from 'antd';
import { get, isEqual, omit } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

import { FireworksApiFields } from '../SetupPage/SetupYourAgent/MemeooorrAgentForm/FireworksApiField';
import {
  InvalidXCredentials,
  XAccountCredentials,
} from '../SetupPage/SetupYourAgent/MemeooorrAgentForm/MemeooorrAgentForm';
// TODO: move the following hook/components to a shared place
// once Modius work is merged
import { useMemeFormValidate } from '../SetupPage/SetupYourAgent/MemeooorrAgentForm/useMemeFormValidate';
import { InvalidGeminiApiCredentials } from '../SetupPage/SetupYourAgent/shared/components';
import {
  commonFieldProps,
  requiredRules,
  validateMessages,
} from '../SetupPage/SetupYourAgent/shared/formUtils';
import { CardLayout } from './CardLayout';
import { UpdateAgentContext } from './context/UpdateAgentProvider';

type MemeooorrFormValues = {
  description: string;
  fireworksApiEnabled: boolean;
  env_variables: {
    GENAI_API_KEY: string;
    FIREWORKS_API_KEY: string;
    PERSONA: string;
    TWIKIT_USERNAME: string;
    TWIKIT_EMAIL: string;
    TWIKIT_PASSWORD: string;
    TWIKIT_COOKIES: string;
  };
};

type MemeUpdateFormProps = {
  initialFormValues: Nullable<MemeooorrFormValues>;
};

const MemeUpdateForm = ({ initialFormValues }: MemeUpdateFormProps) => {
  const {
    isEditing,
    form,
    confirmUpdateModal: confirmModal,
  } = useContext(UpdateAgentContext);

  const {
    isValidating,
    geminiApiKeyValidationStatus,
    twitterCredentialsValidationStatus,
    handleValidate,
  } = useMemeFormValidate();

  const handleFinish = async (values: MemeooorrFormValues) => {
    const cookies = await handleValidate({
      personaDescription: values.env_variables.PERSONA,
      geminiApiKey: values.env_variables.GENAI_API_KEY,
      fireworksApiKey: values.fireworksApiEnabled
        ? values.env_variables.FIREWORKS_API_KEY
        : '',
      xEmail: values.env_variables.TWIKIT_EMAIL,
      xUsername: values.env_variables.TWIKIT_USERNAME,
      xPassword: values.env_variables.TWIKIT_PASSWORD,
    });
    if (!cookies) return;

    // fields for firework api key
    form?.setFieldValue(
      ['env_variables', 'FIREWORKS_API_KEY'],
      values.fireworksApiEnabled ? values.env_variables.FIREWORKS_API_KEY : '',
    );

    // other fields
    form?.setFieldValue(['env_variables', 'TWIKIT_COOKIES'], cookies);
    form?.setFieldValue(
      'description',
      `Memeooorr @${values.env_variables.TWIKIT_USERNAME}`,
    );

    confirmModal.openModal();
  };

  return (
    <Form<MemeooorrFormValues>
      form={form}
      layout="vertical"
      disabled={!isEditing}
      variant={isEditing ? 'outlined' : 'borderless'}
      onFinish={handleFinish}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
    >
      <Form.Item
        label="Persona description"
        name={['env_variables', 'PERSONA']}
        {...commonFieldProps}
      >
        <Input.TextArea
          placeholder="Describe your agent's persona"
          size="small"
          rows={4}
        />
      </Form.Item>

      {/* Gemini credentials */}
      <Form.Item
        label="Gemini API key"
        name={['env_variables', 'GENAI_API_KEY']}
        {...commonFieldProps}
      >
        <Input.Password placeholder="Google Gemini API key" />
      </Form.Item>
      {geminiApiKeyValidationStatus === 'invalid' && (
        <InvalidGeminiApiCredentials />
      )}

      {/* Fireworks API */}
      <FireworksApiFields
        fireworksApiEnabledName="fireworksApiEnabled"
        fireworksApiKeyName={['env_variables', 'FIREWORKS_API_KEY']}
      />

      {/* X */}
      <XAccountCredentials />
      {twitterCredentialsValidationStatus === 'invalid' && (
        <InvalidXCredentials />
      )}
      <Form.Item
        label="X Email"
        name={['env_variables', 'TWIKIT_EMAIL']}
        rules={[{ required: true, type: 'email' }]}
        hasFeedback
      >
        <Input placeholder="X Email" />
      </Form.Item>
      <Form.Item
        label="X Username"
        name={['env_variables', 'TWIKIT_USERNAME']}
        {...commonFieldProps}
      >
        <Input
          placeholder="X Username"
          addonBefore="@"
          onKeyDown={(e) => {
            if (e.key === '@') {
              e.preventDefault();
            }
          }}
        />
      </Form.Item>
      <Form.Item
        label="X Password"
        name={['env_variables', 'TWIKIT_PASSWORD']}
        {...commonFieldProps}
        rules={[
          ...requiredRules,
          {
            validator: (_, value) => {
              if (value && value.includes('$')) {
                return Promise.reject(
                  new Error(
                    'Password must not contain the “$” symbol. Please update your password on Twitter, then retry.',
                  ),
                );
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input.Password placeholder="X Password" />
      </Form.Item>

      {/* Hidden fields that need to be accessible in Confirm Update Modal */}
      <Form.Item name={['env_variables', 'TWIKIT_COOKIES']} hidden />
      <Form.Item name={['env_variables', 'FIREWORKS_API_KEY']} hidden />
      <Form.Item name="description" hidden />
      <Form.Item hidden={!isEditing}>
        <Button
          size="large"
          type="primary"
          htmlType="submit"
          block
          loading={isValidating}
        >
          Save changes
        </Button>
      </Form.Item>
    </Form>
  );
};

export const MemeooorrUpdatePage = () => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const { unsavedModal, form } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<MemeooorrFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);

    return envEntries.reduce(
      (acc, [key, { value }]) => {
        if (key === 'PERSONA') {
          acc.env_variables.PERSONA = value;
        } else if (key === 'GENAI_API_KEY') {
          acc.env_variables.GENAI_API_KEY = value;
        } else if (key === 'FIREWORKS_API_KEY') {
          acc.env_variables.FIREWORKS_API_KEY = value;
          acc.fireworksApiEnabled = !!value;
        } else if (key === 'TWIKIT_EMAIL') {
          acc.env_variables.TWIKIT_EMAIL = value;
        } else if (key === 'TWIKIT_USERNAME') {
          acc.env_variables.TWIKIT_USERNAME = value;
        } else if (key === 'TWIKIT_PASSWORD') {
          acc.env_variables.TWIKIT_PASSWORD = value;
        }
        return acc;
      },
      { env_variables: {} } as MemeooorrFormValues,
    );
  }, [selectedService?.env_variables]);

  const handleClickBack = useCallback(() => {
    const unsavedFields = omit(
      get(form?.getFieldsValue(), 'env_variables'),
      'TWIKIT_COOKIES',
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
    <CardLayout onClickBack={handleClickBack}>
      <MemeUpdateForm initialFormValues={initialValues} />
    </CardLayout>
  );
};
