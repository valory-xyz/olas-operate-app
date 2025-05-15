import { isEqual, omit } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

import {
  MemeooorrAgentForm,
  MemeooorrFormValues,
} from '../AgentForms/MemeooorrAgentForm';
import { CardLayout } from './CardLayout';
import { UpdateAgentContext } from './context/UpdateAgentProvider';
import { getXUsername } from '@/utils/x';

export const MemeooorrUpdatePage = () => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const {
    unsavedModal,
    form,
    isEditing,
    confirmUpdateModal: confirmModal,
  } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<MemeooorrFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);
    const values= envEntries.reduce((acc, [key, { value }]) => {
      if (key === 'PERSONA') {
        acc.personaDescription = value;
      } else if (key === 'GENAI_API_KEY') {
        acc.geminiApiKey = value;
      } else if (key === 'FIREWORKS_API_KEY') {
        acc.fireworksApiKey = value;
        acc.fireworksApiEnabled = !!value;
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
    }, {} as MemeooorrFormValues);
    values.xUsername = getXUsername(selectedService) || '';
    return values;
  }, [selectedService?.env_variables]);

  // TODO: update
  const handleClickBack = useCallback(() => {
    const unsavedFields = omit(form?.getFieldsValue(), ['xCookies']);
    const currentValues = initialValues?.fireworksApiKey
      ? initialValues
      : omit(initialValues, ['fireworksApiKey']);
    const hasUnsavedChanges = !isEqual(unsavedFields, currentValues);

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

  return (
    <CardLayout onClickBack={handleClickBack}>
      <MemeooorrAgentForm
        form={form}
        isFormEnabled={isEditing}
        initialValues={initialValues}
        variant={isEditing ? 'outlined' : 'borderless'}
        onSubmit={onSubmit}
      />
    </CardLayout>
  );
};
