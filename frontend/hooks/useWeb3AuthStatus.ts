import { useQuery } from '@tanstack/react-query';

import {
  FIVE_MINUTE_INTERVAL,
  REACT_QUERY_KEYS,
  WEB3AUTH_STATUS_URL,
} from '@/constants';
import { Web3AuthStatusResponse } from '@/types/BackupWallet';

const fetchWeb3AuthStatus = async (
  signal: AbortSignal,
): Promise<Web3AuthStatusResponse> => {
  const response = await fetch(WEB3AUTH_STATUS_URL, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Web3Auth status: ${response.status}`);
  }

  return response.json();
};

/**
 * Whether pearl-api offers Google/Apple (Web3Auth) backup-wallet setup and recovery.
 * Fails closed: while loading, on error, or for anything but `enabled: true`,
 * `isWeb3AuthEnabled` is false.
 */
export const useWeb3AuthStatus = () => {
  const { data, isLoading } = useQuery({
    queryKey: REACT_QUERY_KEYS.WEB3AUTH_STATUS_KEY,
    queryFn: ({ signal }) => fetchWeb3AuthStatus(signal),
    staleTime: FIVE_MINUTE_INTERVAL,
    retry: 1,
  });

  return { isWeb3AuthEnabled: data?.enabled === true, isLoading };
};
