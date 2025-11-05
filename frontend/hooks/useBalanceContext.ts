import { useContext } from 'react';

import { BalanceContext } from '@/context/BalanceProvider/BalanceProvider';

export const useBalanceContext = () => useContext(BalanceContext);
