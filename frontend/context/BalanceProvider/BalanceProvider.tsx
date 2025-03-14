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

import { FIFTEEN_SECONDS_INTERVAL } from '@/constants/intervals';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { Address } from '@/types/Address';
import { CrossChainStakedBalances, WalletBalance } from '@/types/Balance';

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
  totalStakedOlasBalance?: number;
  lowBalances?: {
    serviceConfigId: string;
    chainId: EvmChainId;
    walletAddress: Address;
    balance: number;
    expectedBalance: number;
  }[];
  isLowBalance?: boolean;
  isPaused: boolean;
}>({
  isLoading: false,
  isLoaded: false,
  updateBalances: async () => {},
  isPaused: false,
  setIsPaused: () => {},
});

export const BalanceProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
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

      return getCrossChainBalances({
        services,
        masterWallets,
        serviceWallets,
      });
    },
    enabled: isOnline && !!masterWallets?.length && !!services,
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
          symbol === TokenSymbol.OLAS ? acc + balance : acc,
        0,
      ),
    [walletBalances],
  );

  const totalStakedOlasBalance = useMemo(
    () =>
      stakedBalances
        .filter(
          ({ evmChainId }) => evmChainId === selectedAgentConfig.evmHomeChainId,
        )
        .reduce(
          (acc, balance) =>
            sum([acc, balance.olasBondBalance, balance.olasDepositBalance]),
          0,
        ),
    [selectedAgentConfig.evmHomeChainId, stakedBalances],
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
        stakedBalances,
        totalOlasBalance,
        totalEthBalance,
        totalStakedOlasBalance,
        isPaused,
        setIsPaused,
        updateBalances,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};
