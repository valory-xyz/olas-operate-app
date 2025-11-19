import { isEqual, omitBy } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { AgentsFunFormValues } from '@/components/SetupPage/SetupYourAgent/AgentsFunAgentForm/types';
import { RenderForm } from '@/components/SetupPage/SetupYourAgent/useDisplayAgentForm';
import { Pages } from '@/enums/Pages';
import { usePageState, useServices } from '@/hooks';
import { Nullable } from '@/types/Util';
import { getXUsername } from '@/utils';

import { UpdateAgentContext } from '../context/UpdateAgentProvider';

type AgentsFunUpdateFormProps = {
  renderForm: RenderForm;
};

/**
 * @note AgentsFun is under construction and this component is not usable yet.
 */
export const AgentsFunUpdateForm = ({
  renderForm,
}: AgentsFunUpdateFormProps) => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const {
    unsavedModal,
    form,
    isEditing,
    confirmUpdateModal: confirmModal,
  } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<AgentsFunFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);
    const values = envEntries.reduce((acc, [key, { value }]) => {
      if (key === 'PERSONA') {
        acc.personaDescription = value;
      } else if (key === 'TWEEPY_CONSUMER_API_KEY') {
        acc.xConsumerApiKey = value;
      } else if (key === 'TWEEPY_CONSUMER_API_KEY_SECRET') {
        acc.xConsumerApiSecret = value;
      } else if (key === 'TWEEPY_BEARER_TOKEN') {
        acc.xBearerToken = value;
      } else if (key === 'TWEEPY_ACCESS_TOKEN') {
        acc.xAccessToken = value;
      } else if (key === 'TWEEPY_ACCESS_TOKEN_SECRET') {
        acc.xAccessTokenSecret = value;
      }
      return acc;
    }, {} as AgentsFunFormValues);
    values.xUsername = getXUsername(selectedService) || '';
    return values;
  }, [selectedService]);

  const handleClickBack = useCallback(() => {
    const unsavedFields = omitBy(
      form?.getFieldsValue(),
      (value) => value === undefined || value === '',
    );
    const hasUnsavedChanges = !isEqual(unsavedFields, initialValues);

    if (hasUnsavedChanges) {
      unsavedModal.openModal();
    } else {
      goto(Pages.Main);
    }
  }, [initialValues, form, unsavedModal, goto]);

  const onSubmit = useCallback(async () => {
    confirmModal.openModal();
  }, [confirmModal]);

  if (!initialValues) return null;

  return renderForm(
    <AgentsFunAgentForm
      form={form}
      isFormEnabled={isEditing}
      initialValues={initialValues}
      agentFormType={isEditing ? 'update' : 'view'}
      onSubmit={onSubmit}
    />,
    <></>,
    { isUpdate: true, onBack: handleClickBack },
  );
};
