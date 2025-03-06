import { Modal } from 'antd';
import { useContext, useMemo } from 'react';

import { useService } from '@/hooks/useService';

import { UpdateAgentContext } from '../context/UpdateAgentProvider';

type ConfirmUpdateModalProps = { isLoading: boolean };

export const ConfirmUpdateModal = ({ isLoading }: ConfirmUpdateModalProps) => {
  const { isServiceRunning } = useService();
  const { confirmUpdateModal } = useContext(UpdateAgentContext);

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
      open={confirmUpdateModal.open}
      onOk={confirmUpdateModal.confirm}
      okButtonProps={{ loading: isLoading }}
      onCancel={confirmUpdateModal.cancel}
      okText={btnText}
      closable={!isLoading}
    >
      These changes will only take effect when you restart the agent.
    </Modal>
  );
};
