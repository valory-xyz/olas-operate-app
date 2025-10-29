import { useContext } from 'react';

import { BalancesAndRefillRequirementsProviderContext } from '@/context/BalancesAndRefillRequirementsProvider';

export const useBalanceAndRefillRequirementsContext = () =>
  useContext(BalancesAndRefillRequirementsProviderContext);
