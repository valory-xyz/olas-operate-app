import { Form, FormInstance } from 'antd';
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

export const UpdateAgentContext = createContext<
  Partial<{
    confirmUpdateModal: ModalProps;
    unsavedModal: ModalProps;
    form: FormInstance;
    isEditing: boolean;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
  }>
>({});

export const UpdateAgentProvider = ({ children }: PropsWithChildren) => {
  const [form] = Form.useForm<DeepPartial<ServiceTemplate>>();
  const { selectedService, selectedAgentType } = useServices();
  const { goto } = usePageState();
  const [isEditing, setIsEditing] = useState(false);

  const confirmUpdateCallback = useCallback(async () => {
    const formValues = form.getFieldsValue();

    if (!selectedService || !selectedService.service_config_id) return;

    try {
      await ServicesService.updateService({
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
                  ...(SERVICE_TEMPLATES.find(
                    (template) =>
                      template.name === selectedService.name ||
                      template.agentType === selectedAgentType,
                  )?.env_variables?.[key] || {}),
                  // Update with the value from the form
                  value,
                },
              }),
              {},
            ),
          },
        },
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsEditing(false);
    }
  }, [form, selectedService, selectedAgentType]);

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
      <ConfirmUpdateModal />
      <UnsavedModal />
      {children}
    </UpdateAgentContext.Provider>
  );
};
