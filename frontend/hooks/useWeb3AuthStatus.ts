import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  FIVE_MINUTE_INTERVAL,
  REACT_QUERY_KEYS,
  WEB3AUTH_STATUS_URL,
} from '@/constants';
import { BackupWalletService } from '@/service/BackupWalletService';

import { useElectronApi } from './useElectronApi';

/** `loading` until the first read settles (including while paused offline). */
export type Web3AuthStatus = 'loading' | 'enabled' | 'disabled';

/**
 * Whether pearl-api offers Google/Apple (Web3Auth) backup-wallet setup and recovery.
 * Fails closed: an error — even one that keeps an earlier `enabled: true` read — or
 * anything but `enabled: true` is `disabled`.
 */
export const useWeb3AuthStatus = () => {
  const { logEvent } = useElectronApi();
  const { data, isPending, isError } = useQuery({
    queryKey: REACT_QUERY_KEYS.WEB3AUTH_STATUS_KEY,
    // Logged here, once per attempt, rather than once per mounted consumer. `logEvent`
    // puts it in Pearl's exported logs, which don't include the renderer console.
    queryFn: ({ signal }) =>
      BackupWalletService.getWeb3AuthStatus(signal).catch((error: unknown) => {
        // A cancelled query reverts to its previous state: nothing failed closed.
        if (!signal.aborted) {
          const message = `Web3Auth status unavailable from ${WEB3AUTH_STATUS_URL}; treating Google/Apple as off.`;
          window.console.error(message, error);
          logEvent?.(`${message} ${error}`);
        }
        throw error;
      }),
    staleTime: FIVE_MINUTE_INTERVAL,
    retry: 1,
  });

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
    /** pearl-api answered `enabled: false`; unlike `status`, an outage doesn't count. */
    isExplicitlyDisabled: !isError && data?.enabled === false,
  };
};

/**
 * Whether Web3Auth is enabled as first settled for `key` (a screen or flow), so a later
 * refetch can't swap that screen's content mid-flow. `undefined` while loading; a new `key`
 * reads the live status again. With `key` `null`, the live status is returned.
 */
export const useLatchedWeb3AuthEnabled = (key: string | null) => {
  const { status } = useWeb3AuthStatus();
  const live = status === 'loading' ? undefined : status === 'enabled';
  const [latched, setLatched] = useState<{ key: string; enabled: boolean }>();

  useEffect(() => {
    // Leaving the screen clears the decision, so the next entry reads the status again.
    if (key === null) {
      setLatched(undefined);
      return;
    }
    if (live === undefined || latched?.key === key) return;
    setLatched({ key, enabled: live });
  }, [key, live, latched?.key]);

  if (key !== null && latched?.key === key) return latched.enabled;
  return live;
};
