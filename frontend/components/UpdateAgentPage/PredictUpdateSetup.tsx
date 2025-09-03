import { isEqual, isUndefined, omitBy } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { Nullable } from '@/types/Util';

import { PredictAgentForm, PredictFormValues } from '../AgentForms/PredictForm';
import { UpdateAgentContext } from './context/UpdateAgentProvider';
import { UpdateAgentCard } from './UpdateAgentCard';

export const PredictUpdateSetup = () => {
  const { goto } = usePageState();
  const { selectedService } = useServices();
  const {
    unsavedModal,
    form,
    isEditing,
    confirmUpdateModal: confirmModal,
  } = useContext(UpdateAgentContext);

  const initialValues = useMemo<Nullable<PredictFormValues>>(() => {
    if (!selectedService?.env_variables) return null;

    const envEntries = Object.entries(selectedService.env_variables);
    const values = envEntries.reduce((acc, [key, { value }]) => {
      if (key === 'GENAI_API_KEY') {
        acc.geminiApiKey = value;
      }
      return acc;
    }, {} as PredictFormValues);
    return values;
  }, [selectedService]);

  const handleClickBack = useCallback(() => {
    // Check if there are unsaved changes and omit empty fields
    const unsavedFields = omitBy(form?.getFieldsValue(), (value) =>
      isUndefined(value),
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

  return (
    <UpdateAgentCard onClickBack={handleClickBack}>
      <PredictAgentForm
        form={form}
        isFormEnabled={isEditing}
        initialValues={initialValues}
        agentFormType={isEditing ? 'update' : 'view'}
        onSubmit={onSubmit}
      />
    </UpdateAgentCard>
  );
};
