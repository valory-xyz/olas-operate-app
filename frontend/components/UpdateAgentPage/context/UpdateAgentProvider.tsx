import { Button, Flex, Form, FormInstance } from 'antd';
import { noop } from 'lodash';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { Modal } from '@/components/ui';
import { AgentMap, PAGES } from '@/constants';
import { SERVICE_TEMPLATES } from '@/constants/serviceTemplates';
import { usePageState, useService, useServices } from '@/hooks';
import { ServicesService } from '@/service/Services';
import { DeepPartial, ServiceTemplate } from '@/types';

import { useConfirmUpdateModal } from '../hooks/useConfirmModal';
import { defaultModalProps, ModalProps } from '../hooks/useModal';
import { useUnsavedModal } from '../hooks/useUnsavedModal';

export const UpdateAgentContext = createContext<{
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  form?: FormInstance;
  confirmUpdateModal: ModalProps;
  unsavedModal: ModalProps;
}>({
  isEditing: false,
  setIsEditing: noop,
  unsavedModal: defaultModalProps,
  confirmUpdateModal: defaultModalProps,
});

const ConfirmUpdateModal = ({ isLoading }: { isLoading: boolean }) => {
  const { isServiceRunning } = useService();
  const { confirmUpdateModal } = useContext(UpdateAgentContext);
  const { open, confirm, cancel } = confirmUpdateModal;

  const btnText = useMemo(() => {
    if (isServiceRunning) {
      return isLoading
        ? 'Saving and restarting agent...'
        : 'Save and restart agent';
    }

    return isLoading ? 'Saving...' : 'Save';
  }, [isServiceRunning, isLoading]);

  return (
    <Modal
      title="Confirm changes"
      description="These changes will only take effect when you restart the agent."
      okButtonProps={{ loading: isLoading }}
      onCancel={cancel}
      okText={btnText}
      closable={!isLoading}
      footer={
        <Flex justify="flex-end" gap={12}>
          <Button onClick={cancel}>Cancel</Button>
          <Button type="primary" onClick={confirm}>
            Confirm and Continue
          </Button>
        </Flex>
      }
      open={open}
      size="small"
    />
  );
};

const UnsavedModal = () => {
  const { unsavedModal } = useContext(UpdateAgentContext);
  const { open, confirm, cancel } = unsavedModal;

  return (
    <Modal
      title="Unsaved changes"
      okText="Discard changes"
      description="You have unsaved changes. Are you sure you want to leave this page?"
      onCancel={cancel}
      footer={
        <Flex justify="flex-end" gap={12}>
          <Button onClick={cancel}>Cancel</Button>
          <Button type="primary" onClick={confirm}>
            Discard changes
          </Button>
        </Flex>
      }
      open={open}
      size="small"
      closable
    />
  );
};

export const UpdateAgentProvider = ({ children }: PropsWithChildren) => {
  const [form] = Form.useForm<DeepPartial<ServiceTemplate>>();
  const {
    refetch: refetchServices,
    selectedService,
    selectedAgentType,
  } = useServices();
  const { goto } = usePageState();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Save button loading state

  const confirmUpdateCallback = useCallback(async () => {
    const formValues = form.getFieldsValue();

    if (!selectedService || !selectedService.service_config_id) return;

    setIsSaving(true);

    const currentTemplate = SERVICE_TEMPLATES.find(
      ({ name, agentType }) =>
        name === selectedService.name || agentType === selectedAgentType,
    );

    const envVariables =
      formValues.env_variables as ServiceTemplate['env_variables'];

    const formValuesWithoutEnv = (() => {
      if (selectedAgentType === AgentMap.AgentsFun) {
        const agentsFunValues = formValues as DeepPartial<ServiceTemplate> & {
          xUsername: string;
        };
        return { description: `Agents.Fun @${agentsFunValues.xUsername}` };
      }
      return formValues;
    })();

    const partialServiceTemplate = {
      serviceConfigId: selectedService.service_config_id,
      partialServiceTemplate: {
        ...formValuesWithoutEnv,
        env_variables: {
          ...Object.entries(envVariables).reduce(
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
      setIsSaving(false);
    }
  }, [form, selectedAgentType, selectedService, refetchServices]);

  const confirmUnsavedCallback = useCallback(async () => {
    goto(PAGES.Main);
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
      <ConfirmUpdateModal isLoading={isSaving} />
      <UnsavedModal />
      {children}
    </UpdateAgentContext.Provider>
  );
};
