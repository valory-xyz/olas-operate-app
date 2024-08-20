import { useContext } from 'react';

import { BalanceContext } from '@/context/main/BalanceProvider';

export const useBalance = () => useContext(BalanceContext);
