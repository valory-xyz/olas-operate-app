import { useContext } from 'react';

import { WalletContext } from '@/context/main/WalletProvider';

export const useWallet = () => useContext(WalletContext);
