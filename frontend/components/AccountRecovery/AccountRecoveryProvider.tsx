import { useQuery } from '@tanstack/react-query';
import { createContext, ReactNode, useContext, useMemo } from 'react';

import { FIFTEEN_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { useMasterWalletContext } from '@/hooks';
import { RecoveryService } from '@/service/Recovery';

import { getBackupWalletStatus } from './utils';

const AccountRecoveryContext = createContext<{
  isLoading: boolean;
}>({
  isLoading: true,
});

export const AccountRecoveryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { data: extendedWallets, isLoading: isExtendedWalletLoading } =
    useQuery({
      queryKey: REACT_QUERY_KEYS.EXTENDED_WALLET_KEY(),
      queryFn: ({ signal }) => RecoveryService.getExtendedWallet(signal),
      enabled: isOnline,
      refetchInterval: FIFTEEN_SECONDS_INTERVAL,
      select: (data) => data[0],
    });
  // console.log({ data, isLoading });

  const { masterSafes, isLoading: isMasterWalletLoading } =
    useMasterWalletContext();

  console.log({ masterSafes, extendedWallets });

  const isLoading = isMasterWalletLoading || isExtendedWalletLoading;

  const details = useMemo(() => {
    if (isLoading) return;
    if (!extendedWallets?.safes) return;
    if (!masterSafes) return;
    getBackupWalletStatus(extendedWallets.safes, masterSafes);
  }, [masterSafes, extendedWallets, isLoading]);

  return (
    <AccountRecoveryContext.Provider value={{ isLoading }}>
      {children}
    </AccountRecoveryContext.Provider>
  );
};

export const useAccountRecoveryContext = () => {
  const context = useContext(AccountRecoveryContext);
  if (!context) {
    throw new Error(
      'useAccountRecoveryContext must be used within a AccountRecoveryProvider',
    );
  }
  return context;
};
