import { useContext } from 'react';

import { SupportModalContext } from '@/context/SupportModalProvider';

export const useSupportModal = () => {
  const { supportModalOpen, setSupportModalOpen } =
    useContext(SupportModalContext);

  return {
    supportModalOpen,
    setSupportModalOpen,
  };
};
