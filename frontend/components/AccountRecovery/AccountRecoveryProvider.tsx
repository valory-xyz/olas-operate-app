import { useQuery } from '@tanstack/react-query';
import { createContext, ReactNode, useContext } from 'react';

import { FIFTEEN_SECONDS_INTERVAL, REACT_QUERY_KEYS } from '@/constants';
import { OnlineStatusContext } from '@/context/OnlineStatusProvider';
import { RecoveryService } from '@/service/Recovery';

const AccountRecoveryContext = createContext<{
  example: null;
}>({
  example: null,
});

export const AccountRecoveryProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { data, isLoading } = useQuery({
    queryKey: REACT_QUERY_KEYS.EXTENDED_WALLET_KEY(),
    queryFn: ({ signal }) => RecoveryService.getExtendedWallet(signal),
    enabled: isOnline,
    refetchInterval: FIFTEEN_SECONDS_INTERVAL,
  });
  console.log({ data, isLoading });

  return (
    <AccountRecoveryContext.Provider value={{ example: null }}>
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
