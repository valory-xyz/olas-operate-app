import { sum } from 'lodash';
import { createContext, useMemo } from 'react';

import { TokenSymbol } from '@/enums/Token';
import {
  useBalanceContext,
  useMasterBalances,
  useServiceBalances,
} from '@/hooks/useBalanceContext';
import { useReward } from '@/hooks/useReward';
import { useServices } from '@/hooks/useServices';
import { Optional } from '@/types/Util';

export const SharedContext = createContext<{
  isMainOlasBalanceLoading: boolean;
  mainOlasBalance: Optional<number>;
}>({
  isMainOlasBalanceLoading: true,
  mainOlasBalance: undefined,
});

/**
 * hook to get the main OLAS balance owned by the selected service
 */
export const useMainOlasBalance = () => {
  const { isLoaded: isBalanceLoaded } = useBalanceContext();
  const { selectedService, selectedAgentConfig } = useServices();
  const { masterWalletBalances } = useMasterBalances();
  const { serviceStakedBalances, serviceWalletBalances } = useServiceBalances(
    selectedService?.service_config_id,
  );
  const {
    isStakingRewardsDetailsLoading,
    isAvailableRewardsForEpochLoading,
    optimisticRewardsEarnedForEpoch,
    accruedServiceStakingRewards,
  } = useReward();

  const mainOlasBalance = useMemo(() => {
    // olas across master wallet (safes and eoa) on relevant chains for agent
    const masterWalletOlasBalance = masterWalletBalances?.reduce(
      (acc, { symbol, balance, evmChainId }) => {
        if (
          symbol === TokenSymbol.OLAS &&
          selectedAgentConfig.requiresAgentSafesOn.includes(evmChainId)
        ) {
          return acc + Number(balance);
        }
        return acc;
      },
      0,
    );

    // olas across all wallets owned by selected service
    const serviceWalletOlasBalance = serviceWalletBalances?.reduce(
      (acc, { symbol, balance, evmChainId }) => {
        if (
          symbol === TokenSymbol.OLAS &&
          selectedAgentConfig.requiresAgentSafesOn.includes(evmChainId)
        ) {
          return acc + Number(balance);
        }
        return acc;
      },
      0,
    );

    // olas staked across services on relevant chains for agent
    const serviceStakedOlasBalance = serviceStakedBalances?.reduce(
      (acc, { olasBondBalance, olasDepositBalance, evmChainId }) => {
        if (!selectedAgentConfig.requiresAgentSafesOn.includes(evmChainId)) {
          return acc;
        }
        return acc + Number(olasBondBalance) + Number(olasDepositBalance);
      },
      0,
    );

    const totalBalance = sum([
      masterWalletOlasBalance,
      serviceWalletOlasBalance,
      serviceStakedOlasBalance,
      optimisticRewardsEarnedForEpoch,
      accruedServiceStakingRewards,
    ]);

    return totalBalance;
  }, [
    masterWalletBalances,
    serviceStakedBalances,
    serviceWalletBalances,
    accruedServiceStakingRewards,
    optimisticRewardsEarnedForEpoch,
    selectedAgentConfig.requiresAgentSafesOn,
  ]);

  const isMainOlasBalanceLoading = [
    !isBalanceLoaded,
    isStakingRewardsDetailsLoading,
    isAvailableRewardsForEpochLoading,
  ].some(Boolean);

  return { isMainOlasBalanceLoading, mainOlasBalance };
};
