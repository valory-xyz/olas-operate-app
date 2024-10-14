import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

import { MigrationSuccessModal } from '@/components/Pages/MainPage/modals/MigrationModal';

export const ModalContext = createContext<{
  migrationModalOpen: boolean;
  setMigrationModalOpen: Dispatch<SetStateAction<boolean>>;
}>({
  migrationModalOpen: false,
  setMigrationModalOpen: () => {},
});

export const ModalProvider = ({ children }: PropsWithChildren) => {
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);

  return (
    <ModalContext.Provider
      value={{ migrationModalOpen, setMigrationModalOpen }}
    >
      <MigrationSuccessModal
        open={migrationModalOpen}
        onClose={() => setMigrationModalOpen(false)}
      />
      {children}
    </ModalContext.Provider>
  );
};
