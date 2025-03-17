import { noop } from 'lodash';
import { useCallback, useState } from 'react';

export const defaultModalProps = {
  open: false,
  openModal: noop,
  closeModal: noop,
  cancel: noop,
  confirm: noop,
};

export type ModalProps = {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
  cancel: () => void;
  confirm: () => void;
};

export const useModal = (): ModalProps => {
  const [open, setOpen] = useState(false);
  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  const cancel = useCallback(async () => {
    closeModal();
  }, []);

  const confirm = useCallback(async () => {
    closeModal();
  }, []);

  return {
    open,
    openModal,
    closeModal,
    cancel,
    confirm,
  };
};
