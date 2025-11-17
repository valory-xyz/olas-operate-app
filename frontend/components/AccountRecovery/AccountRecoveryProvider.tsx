import { useQuery } from '@tanstack/react-query';
import { createContext, ReactNode, useContext, useMemo } from 'react';

import { FIFTEEN_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { useMasterWalletContext } from '@/hooks';
import { RecoveryService } from '@/service/Recovery';

import { getBackupWalletStatus } from './utils';

const AccountRecoveryContext = createContext<{
  isLoading: boolean;
  /** Indicates if account recovery is available based on backup wallet */
  isRecoveryAvailable: boolean;
  /** Indicates if there are backup wallets across every chain */
  hasBackupWallets: boolean;
}>({
  isLoading: true,
  isRecoveryAvailable: false,
  hasBackupWallets: false,
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

  const isLoading = isMasterWalletLoading || isExtendedWalletLoading;

  const backupWalletDetails = useMemo(() => {
    if (isLoading) return;
    if (!extendedWallets?.safes) return;
    if (!masterSafes) return;
    return getBackupWalletStatus(extendedWallets.safes, masterSafes);
  }, [masterSafes, extendedWallets, isLoading]);

  const isRecoveryAvailable =
    backupWalletDetails?.areAllBackupOwnersSame &&
    backupWalletDetails?.hasBackupWalletsAcrossEveryChain;

  return (
    <AccountRecoveryContext.Provider
      value={{
        isLoading,
        isRecoveryAvailable: !!isRecoveryAvailable,
        hasBackupWallets:
          !!backupWalletDetails?.hasBackupWalletsAcrossEveryChain,
      }}
    >
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
