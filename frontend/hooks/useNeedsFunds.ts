import { formatUnits } from 'ethers/lib/utils';
import { useMemo } from 'react';

import { CHAINS } from '@/constants/chains';
import { getMinimumStakedAmountRequired } from '@/utils/service';

import { useBalance } from './useBalance';
import { useServiceTemplates } from './useServiceTemplates';
import { useStore } from './useStore';

export const useNeedsFunds = () => {
  const { getServiceTemplates } = useServiceTemplates();

  const serviceTemplate = useMemo(
    () => getServiceTemplates()[0],
    [getServiceTemplates],
  );

  const { storeState } = useStore();
  const {
    isBalanceLoaded,
    masterSafeBalance: safeBalance,
    totalOlasStakedBalance,
  } = useBalance();

  const serviceFundRequirements = useMemo(() => {
    const gasEstimate =
      serviceTemplate.configurations[CHAINS.GNOSIS.chainId]
        .monthly_gas_estimate;
    const monthlyGasEstimate = Number(formatUnits(`${gasEstimate}`, 18));
    const minimumStakedAmountRequired =
      getMinimumStakedAmountRequired(serviceTemplate);

    return { eth: monthlyGasEstimate, olas: minimumStakedAmountRequired };
  }, [serviceTemplate]);

  const hasEnoughEthForInitialFunding = useMemo(
    () => (safeBalance?.ETH || 0) >= (serviceFundRequirements?.eth || 0),
    [serviceFundRequirements?.eth, safeBalance],
  );

  const hasEnoughOlasForInitialFunding = useMemo(() => {
    const olasInSafe = safeBalance?.OLAS || 0;
    const olasStakedBySafe = totalOlasStakedBalance || 0;
    const olasRequiredToFundService = serviceFundRequirements.olas || 0;
    const olasInSafeAndStaked = olasInSafe + olasStakedBySafe;
    return olasInSafeAndStaked >= olasRequiredToFundService;
  }, [
    safeBalance?.OLAS,
    totalOlasStakedBalance,
    serviceFundRequirements?.olas,
  ]);

  const isInitialFunded = storeState?.isInitialFunded;
  const needsInitialFunding: boolean = useMemo(() => {
    if (isInitialFunded) return false;
    if (!isBalanceLoaded) return false;
    if (hasEnoughEthForInitialFunding && hasEnoughOlasForInitialFunding)
      return false;
    return true;
  }, [
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    isBalanceLoaded,
    isInitialFunded,
  ]);

  return {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    serviceFundRequirements,
    isInitialFunded,
    needsInitialFunding,
  };
};
