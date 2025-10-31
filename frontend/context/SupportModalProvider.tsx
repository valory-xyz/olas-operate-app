import { createContext, PropsWithChildren, useContext, useState } from 'react';

import { SupportModal } from '@/components/SupportModal/SupportModal';

export const SupportModalContext = createContext<{
  supportModalOpen: boolean;
  toggleSupportModal: () => void;
}>({
  supportModalOpen: false,
  toggleSupportModal: () => {},
});

export const SupportModalProvider = ({ children }: PropsWithChildren) => {
  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const closeSupportModal = () => {
    setSupportModalOpen(false);
  };

  const toggleSupportModal = () => {
    setSupportModalOpen(!supportModalOpen);
  };

  return (
    <SupportModalContext.Provider
      value={{
        supportModalOpen,
        toggleSupportModal,
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

export const useSupportModal = () => {
  const { supportModalOpen, toggleSupportModal } =
    useContext(SupportModalContext);

  return {
    supportModalOpen,
    toggleSupportModal,
  };
};
