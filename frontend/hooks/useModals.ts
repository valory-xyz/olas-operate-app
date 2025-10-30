import { useContext } from 'react';

import { ModalContext } from '@/context/ModalProvider';

export const useModals = () => {
  const { migrationModalOpen, setMigrationModalOpen } =
    useContext(ModalContext);

  return {
    migrationModalOpen,
    setMigrationModalOpen,
  };
};
