import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  FIVE_MINUTE_INTERVAL,
  REACT_QUERY_KEYS,
  WEB3AUTH_STATUS_URL,
} from '@/constants';
import { BackupWalletService } from '@/service/BackupWalletService';

/** `loading` until the first read settles (including while paused offline). */
export type Web3AuthStatus = 'loading' | 'enabled' | 'disabled';

/**
 * Whether pearl-api offers Google/Apple (Web3Auth) backup-wallet setup and recovery.
 * Fails closed: an error — even one that keeps an earlier `enabled: true` read — or
 * anything but `enabled: true` is `disabled`.
 */
export const useWeb3AuthStatus = () => {
  const { data, isPending, isError, error } = useQuery({
    queryKey: REACT_QUERY_KEYS.WEB3AUTH_STATUS_KEY,
    queryFn: ({ signal }) => BackupWalletService.getWeb3AuthStatus(signal),
    staleTime: FIVE_MINUTE_INTERVAL,
    retry: 1,
  });

  useEffect(() => {
    if (!error) return;
    window.console.error(
      `Web3Auth status unavailable from ${WEB3AUTH_STATUS_URL}; treating Google/Apple as off.`,
      error,
    );
  }, [error]);

  const status: Web3AuthStatus = isError
    ? 'disabled'
    : isPending
      ? 'loading'
      : data?.enabled === true
        ? 'enabled'
        : 'disabled';

  return {
    status,
    isWeb3AuthEnabled: status === 'enabled',
    isLoading: status === 'loading',
  };
};
