import { Form, FormInstance } from 'antd';
import { noop } from 'lodash';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useState,
} from 'react';

import { ServiceTemplate } from '@/client';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { AgentType } from '@/enums/Agent';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { ServicesService } from '@/service/Services';
import { DeepPartial } from '@/types/Util';

import { useConfirmUpdateModal } from '../hooks/useConfirmModal';
import { ModalProps } from '../hooks/useModal';
import { useUnsavedModal } from '../hooks/useUnsavedModal';
import { ConfirmUpdateModal } from '../modals/ConfirmUpdateModal';
import { UnsavedModal } from '../modals/UnsavedModal';

export const UpdateAgentContext = createContext<{
  confirmUpdateModal?: ModalProps;
  unsavedModal?: ModalProps;
  form?: FormInstance;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
}>({
  isEditing: false,
  setIsEditing: noop,
});

export const UpdateAgentProvider = ({ children }: PropsWithChildren) => {
  const [form] = Form.useForm<DeepPartial<ServiceTemplate>>(); // TODO: wrong type, fix it
  const {
    refetch: refetchServices,
    selectedService,
    selectedAgentType,
  } = useServices();
  const { goto } = usePageState();
  const [isEditing, setIsEditing] = useState(false);

  const confirmUpdateCallback = useCallback(async () => {
    const formValues = form.getFieldsValue();

    if (!selectedService || !selectedService.service_config_id) return;

    const currentTemplate = SERVICE_TEMPLATES.find(
      ({ name, agentType }) =>
        name === selectedService.name || agentType === selectedAgentType,
    );

    // TODO: This should be in MemesUpdatePage and not here
    // Better approach would be to pass formValues as a argument to the function
    if (selectedAgentType === AgentType.Memeooorr) {
      if ('fireworksApiEnabled' in formValues) {
        delete formValues.fireworksApiEnabled;
      }
    }

    const partialServiceTemplate = {
      serviceConfigId: selectedService.service_config_id,
      partialServiceTemplate: {
        ...formValues,
        env_variables: {
          ...Object.entries(formValues.env_variables ?? {}).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key]: {
                // Pass the environment variable details
                // in case the variable doesn't exist yet in the service
                ...(currentTemplate?.env_variables?.[key] || {}),
                value, // Update with the value from the form
              },
            }),
            {},
          ),
        },
      },
    };

    try {
      await ServicesService.updateService(partialServiceTemplate);
      await refetchServices?.();
    } catch (error) {
      console.error(error);
    } finally {
      setIsEditing(false);
    }
  }, [form, selectedAgentType, selectedService, refetchServices]);

  const confirmUnsavedCallback = useCallback(async () => {
    goto(Pages.Main);
  }, [goto]);

  const confirmUpdateModal = useConfirmUpdateModal({
    confirmCallback: confirmUpdateCallback,
  });

  const unsavedModal = useUnsavedModal({
    confirmCallback: confirmUnsavedCallback,
  });

  return (
    <UpdateAgentContext.Provider
      value={{
        confirmUpdateModal,
        unsavedModal,
        form,
        isEditing,
        setIsEditing,
      }}
    >
      <ConfirmUpdateModal isLoading={isEditing} />
      <UnsavedModal />
      {children}
    </UpdateAgentContext.Provider>
  );
};
