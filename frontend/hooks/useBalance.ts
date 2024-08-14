import { useContext } from 'react';

import { BalanceContext } from '@/context/BalanceProvider';

export const useBalance = () => useContext(BalanceContext);
