import { isEqual, omit } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

import {
  MemeooorrAgentForm,
  MemeooorrFormValues,
} from '../AgentForms/MemeooorrAgentForm/MemeooorrAgentForm';
import { CardLayout } from './CardLayout';
import { UpdateAgentContext } from './context/UpdateAgentProvider';

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
    return envEntries.reduce((acc, [key, { value }]) => {
      if (key === 'PERSONA') {
        acc.personaDescription = value;
      } else if (key === 'GENAI_API_KEY') {
        acc.geminiApiKey = value;
      } else if (key === 'FIREWORKS_API_KEY') {
        acc.fireworksApiKey = value;
        acc.fireworksApiEnabled = !!value;
      } else if (key === 'TWIKIT_EMAIL') {
        acc.xEmail = value;
      } else if (key === 'TWIKIT_USERNAME') {
        acc.xUsername = value;
      } else if (key === 'TWIKIT_PASSWORD') {
        acc.xPassword = value;
      }
      return acc;
    }, {} as MemeooorrFormValues);
  }, [selectedService?.env_variables]);

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
