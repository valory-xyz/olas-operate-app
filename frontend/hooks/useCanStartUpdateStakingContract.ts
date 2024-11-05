import { useMemo } from 'react';

import { useBalance } from './useBalance';
import { useNeedsFunds } from './useNeedsFunds';
import { useStakingContractInfo } from './useStakingContractInfo';

export const useCanStartUpdateStakingContract = () => {
  const { isBalanceLoaded, isLowBalance } = useBalance();
  const { needsInitialFunding } = useNeedsFunds();
  const { hasEnoughServiceSlots } = useStakingContractInfo();

  const canUpdateStakingContract = useMemo(() => {
    if (!isBalanceLoaded) return false;
    if (isLowBalance) return false;
    if (needsInitialFunding) return false;
    if (!hasEnoughServiceSlots) return false;
    return true;
  }, [
    isBalanceLoaded,
    isLowBalance,
    needsInitialFunding,
    hasEnoughServiceSlots,
  ]);

  return { canUpdateStakingContract };
};
