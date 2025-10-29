import { useContext } from 'react';

import { ModalContext } from '@/context/ModalProvider';

export const useModals = () => {
  const {
    migrationModalOpen,
    setMigrationModalOpen,
    supportModalOpen,
    setSupportModalOpen,
  } = useContext(ModalContext);

  return {
    migrationModalOpen,
    setMigrationModalOpen,
    supportModalOpen,
    setSupportModalOpen,
  };
};
