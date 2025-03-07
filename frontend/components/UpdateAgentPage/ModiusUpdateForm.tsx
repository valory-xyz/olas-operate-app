import { Button, Form, Input } from 'antd';
import { get, isEqual } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

// TODO: move the following hook/components to a shared place
// once Modius work is merged
import {
  commonFieldProps,
  validateMessages,
} from '../SetupPage/SetupYourAgent/formUtils';
import {
  CoinGeckoApiKeyLabel,
  TenderlyAccessTokenLabel,
  TenderlyAccountSlugLabel,
  TenderlyProjectSlugLabel,
} from '../SetupPage/SetupYourAgent/ModiusAgentForm/labels';
import { CardLayout } from './CardLayout';
import { UpdateAgentContext } from './context/UpdateAgentProvider';

type ModiusFormValues = {
  env_variables: {
    TENDERLY_ACCESS_KEY: string;
    TENDERLY_ACCOUNT_SLUG: string;
    TENDERLY_PROJECT_SLUG: string;
    COINGECKO_API_KEY: string;
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

  return (
    <Form<ModiusFormValues>
      form={form}
      layout="vertical"
      disabled={!isEditing}
      onFinish={confirmModal.openModal}
      validateMessages={validateMessages}
      initialValues={{ ...initialFormValues }}
    >
      <Form.Item
        label={<TenderlyAccessTokenLabel />}
        name={['env_variables', 'TENDERLY_ACCESS_KEY']}
        {...commonFieldProps}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item
        label={<TenderlyAccountSlugLabel />}
        name={['env_variables', 'TENDERLY_ACCOUNT_SLUG']}
        {...commonFieldProps}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={<TenderlyProjectSlugLabel />}
        name={['env_variables', 'TENDERLY_PROJECT_SLUG']}
        {...commonFieldProps}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label={<CoinGeckoApiKeyLabel />}
        name={['env_variables', 'COINGECKO_API_KEY']}
        {...commonFieldProps}
      >
        <Input.Password />
      </Form.Item>

      <Form.Item hidden={!isEditing}>
        <Button size="large" type="primary" htmlType="submit" block>
          Save changes
        </Button>
      </Form.Item>
    </Form>
  );
};

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
        }

        return acc;
      },
      { env_variables: {} } as ModiusFormValues,
    );
  }, [selectedService?.env_variables]);

  const handleBackClick = useCallback(() => {
    const unsavedFields = get(form?.getFieldsValue(), 'env_variables');
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
