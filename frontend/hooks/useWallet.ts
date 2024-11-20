import { useContext } from 'react';

import { WalletContext } from '@/context/WalletProvider';

export const useWallet = () => {
  const { wallets, setPaused, paused, togglePaused, refetch } =
    useContext(WalletContext);

  return { wallets, setPaused, paused, togglePaused, refetch };
};
