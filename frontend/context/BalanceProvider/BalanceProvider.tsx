import { useQuery } from '@tanstack/react-query';
import { sum } from 'lodash';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { TokenSymbolMap } from '@/config/tokens';
import { EvmChainId, FIFTEEN_SECONDS_INTERVAL } from '@/constants';
import { usePageState } from '@/hooks/usePageState';
import { Address } from '@/types/Address';
import { CrossChainStakedBalances, WalletBalance } from '@/types/Balance';
import { areAddressesEqual } from '@/utils';

import { MasterWalletContext } from '../MasterWalletProvider';
import { OnlineStatusContext } from '../OnlineStatusProvider';
import { ServicesContext } from '../ServicesProvider';
import { getCrossChainBalances } from './utils';

export const BalanceContext = createContext<{
  isLoading: boolean;
  /** @deprecated use isLoading instead */
  isLoaded: boolean;
  updateBalances: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  walletBalances?: WalletBalance[];
  stakedBalances?: CrossChainStakedBalances;
  totalOlasBalance?: number;
  totalEthBalance?: number;
  /**
   * Chain-wide staked OLAS aggregate. Sums every service on the selected
   * agent's home chain — NOT scoped to the selected service.
   * @deprecated For per-service displays (e.g. switch eligibility, withdraw
   * review), use {@link getStakedOlasBalanceByServiceConfigId} instead.
   * Retained for telemetry-only consumption in `useLogs`.
   */
  totalStakedOlasBalance?: number;
  /** Get staked olas balance of a specific agent wallet address */
  getStakedOlasBalanceOf: (walletAddress: Address) => number;
  /** Get staked olas balance of a specific service by service config id */
  getStakedOlasBalanceByServiceConfigId: (serviceConfigId?: string) => number;
  /** @deprecated not used */
  lowBalances?: {
    serviceConfigId: string;
    chainId: EvmChainId;
    walletAddress: Address;
    balance: number;
    expectedBalance: number;
  }[];
  /** @deprecated not used */
  isLowBalance?: boolean;
  isPaused: boolean;
}>({
  isLoading: false,
  isLoaded: false,
  updateBalances: async () => {},
  getStakedOlasBalanceOf: () => 0,
  getStakedOlasBalanceByServiceConfigId: () => 0,
  isPaused: false,
  setIsPaused: () => {},
});

export const BalanceProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { isUserLoggedIn } = usePageState();
  const { masterWallets } = useContext(MasterWalletContext);
  const { services, serviceWallets, selectedAgentConfig } =
    useContext(ServicesContext);
  const [isPaused, setIsPaused] = useState(false);

  const refetchInterval = useMemo(
    () => (isPaused ? false : FIFTEEN_SECONDS_INTERVAL),
    [isPaused],
  );

  const { isLoading, data, refetch } = useQuery({
    queryKey: [
      'balances',
      isOnline,
      masterWallets?.map((w) => w.address),
      services?.map((s) => s.service_config_id),
      serviceWallets?.map((sw) => sw.address),
    ],
    queryFn: async () => {
      if (!isOnline || !masterWallets?.length || !services) {
        throw new Error('Invalid state, should not be enabled');
      }

      return getCrossChainBalances({ services, masterWallets, serviceWallets });
    },
    enabled:
      isOnline && isUserLoggedIn && !!masterWallets?.length && !!services,
    refetchInterval,
  });

  const walletBalances = useMemo(() => data?.walletBalances ?? [], [data]);
  const stakedBalances = useMemo(() => data?.stakedBalances ?? [], [data]);

  const totalEthBalance = useMemo(
    () =>
      walletBalances.reduce(
        (acc, { isNative, balance }) => (isNative ? acc + balance : acc),
        0,
      ),
    [walletBalances],
  );

  const totalOlasBalance = useMemo(
    () =>
      walletBalances.reduce(
        (acc, { symbol, balance }) =>
          symbol === TokenSymbolMap.OLAS ? acc + balance : acc,
        0,
      ),
    [walletBalances],
  );

  const getTotalStakedOlasBalanceOf = useCallback(
    (chainId: EvmChainId) => {
      return stakedBalances
        .filter(({ evmChainId }) => evmChainId === chainId)
        .reduce(
          (acc, balance) =>
            sum([acc, balance.olasBondBalance, balance.olasDepositBalance]),
          0,
        );
    },
    [stakedBalances],
  );

  const totalStakedOlasBalance = useMemo(
    () =>
      selectedAgentConfig?.evmHomeChainId
        ? getTotalStakedOlasBalanceOf(selectedAgentConfig.evmHomeChainId)
        : undefined,
    [selectedAgentConfig.evmHomeChainId, getTotalStakedOlasBalanceOf],
  );

  const getStakedOlasBalanceOf = useCallback(
    (walletAddress: Address) => {
      if (!walletAddress) return 0;

      const balances = stakedBalances.filter(
        ({ walletAddress: stakedWalletAddress }) =>
          areAddressesEqual(walletAddress, stakedWalletAddress),
      );
      return balances.reduce(
        (acc, balance) =>
          acc + balance.olasBondBalance + balance.olasDepositBalance,
        0,
      );
    },
    [stakedBalances],
  );

  // Filters by `serviceConfigId` only (no chain filter). Safe because
  // `service_config_id` is unique across all chains, so a single id can match
  // at most one entry in `stakedBalances`.
  const getStakedOlasBalanceByServiceConfigId = useCallback(
    (serviceConfigId?: string) => {
      if (!serviceConfigId) return 0;
      return stakedBalances
        .filter(({ serviceConfigId: id }) => id === serviceConfigId)
        .reduce((acc, b) => acc + b.olasBondBalance + b.olasDepositBalance, 0);
    },
    [stakedBalances],
  );

  const updateBalances = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <BalanceContext.Provider
      value={{
        isLoading,
        isLoaded: !!data,
        walletBalances,
        totalOlasBalance,
        totalEthBalance,
        totalStakedOlasBalance,
        getStakedOlasBalanceOf,
        getStakedOlasBalanceByServiceConfigId,
        isPaused,
        setIsPaused,
        updateBalances,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};
