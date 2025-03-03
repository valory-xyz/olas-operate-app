import { isEmpty, isNil, sum } from 'lodash';
import {
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { EvmChainId } from '@/enums/Chain';
import { TokenSymbol } from '@/enums/Token';
import { MasterSafe, WalletType } from '@/enums/Wallet';
import { Address } from '@/types/Address';
import { CrossChainStakedBalances, WalletBalance } from '@/types/Balance';

import { MasterWalletContext } from '../MasterWalletProvider';
import { OnlineStatusContext } from '../OnlineStatusProvider';
import { ServicesContext } from '../ServicesProvider';
import {
  getCrossChainStakedBalances,
  getCrossChainWalletBalances,
} from './utils';

export const BalanceContext = createContext<{
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
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
  isLoaded: false,
  setIsLoaded: () => {},
  updateBalances: async () => {},
  isPaused: false,
  setIsPaused: () => {},
});

export const BalanceProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { masterWallets } = useContext(MasterWalletContext);
  const { services, serviceWallets, selectedAgentConfig } =
    useContext(ServicesContext);

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isUpdatingBalances, setIsUpdatingBalances] = useState<boolean>(false);

  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [stakedBalances, setStakedBalances] =
    useState<CrossChainStakedBalances>([]);

  const totalEthBalance = useMemo(() => {
    if (!isLoaded) return 0;
    return walletBalances.reduce(
      (acc, { isNative, balance }) => (isNative ? acc + balance : acc),
      0,
    );
  }, [isLoaded, walletBalances]);

  const totalOlasBalance = useMemo(() => {
    if (!isLoaded) return 0;
    return walletBalances.reduce(
      (acc, { symbol, balance }) =>
        symbol === TokenSymbol.OLAS ? acc + balance : acc,
      0,
    );
  }, [isLoaded, walletBalances]);

  const totalStakedOlasBalance = useMemo(() => {
    return stakedBalances
      .filter(
        ({ evmChainId }) => evmChainId === selectedAgentConfig.evmHomeChainId,
      )
      .reduce((acc, balance) => {
        return sum([acc, balance.olasBondBalance, balance.olasDepositBalance]);
      }, 0);
  }, [selectedAgentConfig.evmHomeChainId, stakedBalances]);

  const updateBalances = useCallback(async () => {
    if (!isOnline) return;
    if (isNil(masterWallets) || isEmpty(masterWallets)) return;
    if (isNil(services)) return;

    setIsUpdatingBalances(true);

    try {
      const masterSafes = masterWallets.filter(
        (masterWallet) => masterWallet.type === WalletType.Safe,
      ) as MasterSafe[];

      const [walletBalancesResult, stakedBalancesResult] =
        await Promise.allSettled([
          getCrossChainWalletBalances([
            ...masterWallets,
            ...(serviceWallets || []),
          ]),
          getCrossChainStakedBalances(services, masterSafes),
        ]);

      // parse the results
      const walletBalances =
        walletBalancesResult.status === 'fulfilled'
          ? walletBalancesResult.value
          : [];

      const stakedBalances =
        stakedBalancesResult.status === 'fulfilled'
          ? stakedBalancesResult.value
          : [];

      setWalletBalances(walletBalances);
      setStakedBalances(stakedBalances);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error updating balances:', error);
    } finally {
      setIsUpdatingBalances(false);
    }
  }, [isOnline, masterWallets, services, serviceWallets]);

  // Update balances once on load, then use interval
  useEffect(() => {
    if (!isOnline || isUpdatingBalances || isLoaded) return;

    updateBalances();
  }, [isOnline, isUpdatingBalances, isLoaded, updateBalances]);

  // Update balances every 5 seconds
  useInterval(() => {
    if (!isPaused && isOnline && !isUpdatingBalances) {
      updateBalances();
    }
  }, FIVE_SECONDS_INTERVAL);

  return (
    <BalanceContext.Provider
      value={{
        isLoaded,
        setIsLoaded,
        walletBalances,
        stakedBalances,
        updateBalances,
        isPaused,
        setIsPaused,
        totalOlasBalance,
        totalEthBalance,
        totalStakedOlasBalance,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};
