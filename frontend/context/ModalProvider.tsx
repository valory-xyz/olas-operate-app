import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

import { MigrationSuccessModal } from '@/components/MainPage/modals/MigrationModal';
import { SupportModal } from '@/components/SupportModal/SupportModal';

export const ModalContext = createContext<{
  migrationModalOpen: boolean;
  supportModalOpen: boolean;
  setMigrationModalOpen: Dispatch<SetStateAction<boolean>>;
  setSupportModalOpen: Dispatch<SetStateAction<boolean>>;
}>({
  migrationModalOpen: false,
  supportModalOpen: false,
  setMigrationModalOpen: () => {},
  setSupportModalOpen: () => {},
});

export const ModalProvider = ({ children }: PropsWithChildren) => {
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(true);

  const closeMigrationModal = () => {
    setMigrationModalOpen(false);
  };

  const closeSupportModal = () => {
    setSupportModalOpen(false);
  };

  return (
    <ModalContext.Provider
      value={{
        migrationModalOpen,
        setMigrationModalOpen,
        supportModalOpen,
        setSupportModalOpen,
      }}
    >
      <MigrationSuccessModal
        open={migrationModalOpen}
        onClose={() => closeMigrationModal()}
      />
      <SupportModal
        open={supportModalOpen}
        onClose={() => closeSupportModal()}
      />
      {children}
    </ModalContext.Provider>
  );
};
