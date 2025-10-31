import { createContext, PropsWithChildren, useContext } from 'react';
import { useToggle } from 'usehooks-ts';

import { SupportModal } from '@/components/SupportModal/SupportModal';

export const SupportModalContext = createContext<{
  supportModalOpen: boolean;
  toggleSupportModal: () => void;
}>({
  supportModalOpen: false,
  toggleSupportModal: () => {},
});

export const SupportModalProvider = ({ children }: PropsWithChildren) => {
  const [supportModalOpen, toggleSupportModal] = useToggle(false);

  return (
    <SupportModalContext.Provider
      value={{
        supportModalOpen,
        toggleSupportModal,
      }}
    >
      <SupportModal open={supportModalOpen} onClose={toggleSupportModal} />
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
