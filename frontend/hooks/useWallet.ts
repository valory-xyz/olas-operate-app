import { useContext } from 'react';

import { MasterWalletContext } from '@/context/MasterWalletProvider';

export const useMasterWalletContext = () => useContext(MasterWalletContext);
