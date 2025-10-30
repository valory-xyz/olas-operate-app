import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

import { SupportModal } from '@/components/SupportModal/SupportModal';

export const SupportModalContext = createContext<{
  supportModalOpen: boolean;
  setSupportModalOpen: Dispatch<SetStateAction<boolean>>;
}>({
  supportModalOpen: false,
  setSupportModalOpen: () => {},
});

export const SupportModalProvider = ({ children }: PropsWithChildren) => {
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const closeSupportModal = () => {
    setSupportModalOpen(false);
  };

  return (
    <SupportModalContext.Provider
      value={{
        supportModalOpen,
        setSupportModalOpen,
      }}
    >
      <SupportModal
        open={supportModalOpen}
        onClose={() => closeSupportModal()}
      />
      {children}
    </SupportModalContext.Provider>
  );
};
