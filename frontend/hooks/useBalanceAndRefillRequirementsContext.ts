import { useContext } from 'react';

import { BalancesAndRefillRequirementsProviderContext } from '@/context/BalancesAndRefillRequirementsProvider/BalancesAndRefillRequirementsProvider';

export const useBalanceAndRefillRequirementsContext = () =>
  useContext(BalancesAndRefillRequirementsProviderContext);
