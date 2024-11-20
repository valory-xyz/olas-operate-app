import { useContext, useMemo } from 'react';

import { BalanceContext, WalletBalanceResult } from '@/context/BalanceProvider';

import { useService } from './useService';

export const useBalanceContext = () => useContext(BalanceContext);

export const useServiceBalances = (serviceConfigId: string) => {
  const { flatAddresses } = useService({ serviceConfigId });
  const { walletBalances, lowBalances, stakedBalances } = useBalanceContext();

  const serviceWalletBalances = useMemo(
    () =>
      walletBalances?.filter((balance) =>
        flatAddresses.includes(balance.walletAddress),
      ),
    [flatAddresses, walletBalances],
  );

  const serviceStakedBalances = useMemo(
    () =>
      stakedBalances?.filter((balance) =>
        flatAddresses.includes(balance.walletAddress),
      ),
    [flatAddresses, stakedBalances],
  );

  const serviceLowBalances = useMemo(
    () => lowBalances?.filter((balance) => balance.walletAddress),
    [lowBalances],
  );

  const isLowBalance = useMemo(
    () => serviceLowBalances?.length > 0,
    [serviceLowBalances],
  );

  const serviceSafeBalances = useMemo<WalletBalanceResult[]>(
    () =>
      walletBalances?.filter((balance) =>
        flatAddresses.includes(balance.walletAddress),
      ),
    [flatAddresses, walletBalances],
  );

  return {
    serviceWalletBalances,
    serviceStakedBalances,
    serviceSafeBalances,
    serviceLowBalances,
    isLowBalance,
  };
};
