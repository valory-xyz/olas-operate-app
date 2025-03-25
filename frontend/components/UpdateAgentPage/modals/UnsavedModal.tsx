import { Modal } from 'antd';
import { useContext } from 'react';

import { UpdateAgentContext } from '../context/UpdateAgentProvider';

export const UnsavedModal = () => {
  const { unsavedModal } = useContext(UpdateAgentContext);

  return (
    <Modal
      title="Unsaved changes"
      open={unsavedModal.open}
      onOk={unsavedModal.confirm}
      onCancel={unsavedModal.cancel}
      okText="Discard changes"
    >
      You have unsaved changes. Are you sure you want to leave this page?
    </Modal>
  );
};
