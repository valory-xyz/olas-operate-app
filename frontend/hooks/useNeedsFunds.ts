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
  const { safeBalance, totalOlasStakedBalance } = useBalance();

  const isInitialFunded = storeState?.isInitialFunded;

  const serviceFundRequirements = useMemo(() => {
    const monthlyGasEstimate = Number(
      formatUnits(
        `${serviceTemplate.configurations[CHAINS.GNOSIS.chainId].monthly_gas_estimate}`,
        18,
      ),
    );

    const minimumStakedAmountRequired =
      getMinimumStakedAmountRequired(serviceTemplate);

    return {
      eth: monthlyGasEstimate,
      olas: minimumStakedAmountRequired,
    };
  }, [serviceTemplate]);

  const hasEnoughEthForInitialFunding = useMemo<boolean | undefined>(() => {
    if (!safeBalance?.ETH) return;
    if (!serviceFundRequirements?.eth) return;

    return (safeBalance.ETH || 0) >= (serviceFundRequirements.eth || 0);
  }, [serviceFundRequirements?.eth, safeBalance]);

  const hasEnoughOlasForInitialFunding = useMemo<boolean | undefined>(() => {
    if (!safeBalance?.OLAS) return;

    const olasInSafe = safeBalance.OLAS || 0;
    const olasStakedBySafe = totalOlasStakedBalance || 0;

    const olasInSafeAndStaked = olasInSafe + olasStakedBySafe;

    return olasInSafeAndStaked >= serviceFundRequirements.olas;
  }, [
    safeBalance?.OLAS,
    totalOlasStakedBalance,
    serviceFundRequirements?.olas,
  ]);

  return {
    hasEnoughEthForInitialFunding,
    hasEnoughOlasForInitialFunding,
    serviceFundRequirements,
    isInitialFunded,
  };
};
