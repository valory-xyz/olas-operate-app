import { BigNumberish } from 'ethers';
import { getAddress, isAddress } from 'ethers/lib/utils';
import { Contract as MulticallContract } from 'ethers-multicall';
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

import { ERC20_BALANCE_OF_STRING_FRAGMENT } from '@/abis/erc20';
import { MiddlewareChain, MiddlewareServiceResponse } from '@/client';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { PROVIDERS } from '@/constants/providers';
import { EvmChainId } from '@/enums/Chain';
import { ServiceRegistryL2ServiceState } from '@/enums/ServiceRegistryL2ServiceState';
import { TokenSymbol } from '@/enums/Token';
import { Wallets, WalletType } from '@/enums/Wallet';
import { StakedAgentService } from '@/service/agents/StakedAgentService';
import { Address } from '@/types/Address';
import { Maybe } from '@/types/Util';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { formatEther } from '@/utils/numberFormatters';

import { MasterWalletContext } from './MasterWalletProvider';
import { OnlineStatusContext } from './OnlineStatusProvider';
import { ServicesContext } from './ServicesProvider';

type CrossChainStakedBalances = Array<{
  serviceId: string;
  evmChainId: number;
  olasBondBalance: number;
  olasDepositBalance: number;
  walletAddress: Address;
}>;

export const BalanceContext = createContext<{
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  updateBalances: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  walletBalances?: WalletBalanceResult[];
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

  const [walletBalances, setWalletBalances] = useState<WalletBalanceResult[]>(
    [],
  );
  const [stakedBalances, setStakedBalances] =
    useState<CrossChainStakedBalances>([]);

  const totalEthBalance = useMemo(() => {
    if (!isLoaded) return 0;
    return walletBalances.reduce((acc, walletBalance) => {
      if (walletBalance.isNative) {
        return acc + walletBalance.balance;
      }
      return acc;
    }, 0);
  }, [isLoaded, walletBalances]);

  const totalOlasBalance = useMemo(() => {
    if (!isLoaded) return 0;
    return walletBalances.reduce((acc, walletBalance) => {
      if (walletBalance.symbol === TokenSymbol.OLAS) {
        return acc + walletBalance.balance;
      }
      return acc;
    }, 0);
  }, [isLoaded, walletBalances]);

  const totalStakedOlasBalance = useMemo(() => {
    return stakedBalances
      .filter(
        (walletBalance) =>
          walletBalance.evmChainId === selectedAgentConfig.evmHomeChainId,
      )
      .reduce((acc, balance) => {
        return sum([acc, balance.olasBondBalance, balance.olasDepositBalance]);
      }, 0);
  }, [selectedAgentConfig.evmHomeChainId, stakedBalances]);

  const updateBalances = useCallback(async () => {
    if (!isNil(masterWallets) && !isEmpty(masterWallets) && !isNil(services)) {
      setIsUpdatingBalances(true);

      try {
        const masterSafe = masterWallets.find(
          (masterWallet) =>
            masterWallet.type === WalletType.Safe &&
            masterWallet.evmChainId === selectedAgentConfig.evmHomeChainId,
        );

        const [walletBalancesResult, stakedBalancesResult] =
          await Promise.allSettled([
            getCrossChainWalletBalances([
              ...masterWallets,
              ...(serviceWallets || []),
            ]),
            getCrossChainStakedBalances(services, masterSafe?.address),
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

        setWalletBalances(walletBalances || []);
        setStakedBalances(stakedBalances || []);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error updating balances:', error);
      } finally {
        setIsUpdatingBalances(false);
      }
    }
  }, [
    masterWallets,
    services,
    serviceWallets,
    selectedAgentConfig.evmHomeChainId,
  ]);

  useEffect(() => {
    // Update balances once on load, then use interval
    if (!isOnline || isUpdatingBalances || isLoaded) return;

    updateBalances();
  }, [isOnline, isUpdatingBalances, isLoaded, updateBalances]);

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

export type WalletBalanceResult = {
  walletAddress: Address;
  evmChainId: EvmChainId;
  symbol: TokenSymbol;
  isNative: boolean;
  balance: number;
};

const getCrossChainWalletBalances = async (
  wallets: Wallets,
): Promise<WalletBalanceResult[]> => {
  const balanceResults: WalletBalanceResult[] = [];

  const providerEntries = Object.entries(PROVIDERS);

  for (const [
    evmChainIdKey,
    { multicallProvider, provider },
  ] of providerEntries) {
    try {
      const providerEvmChainId = +evmChainIdKey as EvmChainId;

      const tokensOnChain = TOKEN_CONFIG[providerEvmChainId];
      // if (!tokensOnChain) continue;

      const relevantWallets = wallets.filter((wallet) => {
        const isEoa = wallet.type === WalletType.EOA;
        const isSafe = wallet.type === WalletType.Safe;
        const isOnProviderChain =
          isEoa || (isSafe && wallet.evmChainId === providerEvmChainId);

        return isOnProviderChain;
      });

      for (const {
        tokenType,
        symbol: tokenSymbol,
        address: tokenAddress,
      } of Object.values(tokensOnChain)) {
        const isNative = tokenType === TokenType.NativeGas;
        const isErc20 = tokenType === TokenType.Erc20;

        if (isNative) {
          // get native balances for all relevant wallets
          const nativeBalancePromises =
            relevantWallets.map<Promise<BigNumberish> | null>(
              ({ address: walletAddress }) =>
                isAddress(walletAddress)
                  ? provider.getBalance(getAddress(walletAddress))
                  : null,
            );

          const nativeBalances = await Promise.all(nativeBalancePromises).catch(
            (e) => {
              console.error('Error fetching native balances:', e);
              return [];
            },
          );

          // add the results to the balance results
          nativeBalances.forEach(
            (balance, index) =>
              !isNil(balance) &&
              balanceResults.push({
                walletAddress: relevantWallets[index].address,
                evmChainId: providerEvmChainId,
                symbol: tokenSymbol,
                isNative: true,
                balance: Number(formatEther(balance)),
              }),
          );
        }

        if (isErc20) {
          if (!tokenAddress) continue;

          const erc20Contract = new MulticallContract(
            tokenAddress,
            ERC20_BALANCE_OF_STRING_FRAGMENT,
          );

          const relevantWalletsFiltered = relevantWallets.filter((wallet) =>
            isAddress(wallet.address),
          );

          const erc20Calls = relevantWalletsFiltered.map((wallet) =>
            erc20Contract.balanceOf(wallet.address),
          );

          const erc20Balances = await multicallProvider.all(erc20Calls);

          const erc20Results = relevantWalletsFiltered.map(
            ({ address: walletAddress }, index) => ({
              walletAddress,
              evmChainId: providerEvmChainId,
              symbol: tokenSymbol,
              isNative: false,
              balance: Number(formatEther(erc20Balances[index])),
            }),
          ) as WalletBalanceResult[];

          balanceResults.push(...erc20Results);
        }
      }
    } catch (error) {
      console.error('Error fetching balances for chain:', evmChainIdKey, error);
    }
  }

  return balanceResults;
};

const getCrossChainStakedBalances = async (
  services: MiddlewareServiceResponse[],
  masterSafeAddress: Maybe<Address>,
): Promise<CrossChainStakedBalances> => {
  const result: CrossChainStakedBalances = [];

  const registryInfoPromises = services.map(async (service) => {
    const serviceConfigId = service.service_config_id;
    const middlewareChain: MiddlewareChain = service.home_chain;
    const chainConfig = service.chain_configs[middlewareChain];
    const { token: serviceNftTokenId } = chainConfig.chain_data;
    if (
      isNil(serviceNftTokenId) ||
      serviceNftTokenId <= 0 ||
      isNil(masterSafeAddress) ||
      !isAddress(masterSafeAddress)
    ) {
      return null;
    }

    const registryInfo = await StakedAgentService.getServiceRegistryInfo(
      masterSafeAddress,
      serviceNftTokenId,
      asEvmChainId(middlewareChain),
    );

    return {
      serviceId: serviceConfigId,
      chainId: middlewareChain,
      ...registryInfo,
    };
  });

  const registryInfos = await Promise.allSettled(registryInfoPromises);

  registryInfos.forEach((res, idx) => {
    if (res.status !== 'fulfilled') {
      console.error(
        'Error fetching registry info for',
        services[idx].service_config_id,
      );
      return;
    }

    const value = res.value;
    if (!value) return;

    const { serviceId, chainId, depositValue, bondValue, serviceState } = value;
    result.push({
      serviceId,
      evmChainId: asEvmChainId(chainId),
      ...correctBondDepositByServiceState({
        olasBondBalance: bondValue,
        olasDepositBalance: depositValue,
        serviceState,
      }),
      walletAddress: services[idx].chain_configs[chainId].chain_data.multisig!, // Multisig must exist if registry info is fetched
    });
  });

  return result;
};

/**
 * Corrects the bond and deposit balances based on the service state
 * @note the service state is used to determine the correct bond and deposit balances
 */
const correctBondDepositByServiceState = ({
  olasBondBalance,
  olasDepositBalance,
  serviceState,
}: {
  olasBondBalance: number;
  olasDepositBalance: number;
  serviceState: ServiceRegistryL2ServiceState;
}): {
  olasBondBalance: number;
  olasDepositBalance: number;
} => {
  switch (serviceState) {
    case ServiceRegistryL2ServiceState.NonExistent:
    case ServiceRegistryL2ServiceState.PreRegistration:
      return {
        olasBondBalance: 0,
        olasDepositBalance: 0,
      };
    case ServiceRegistryL2ServiceState.ActiveRegistration:
      return {
        olasBondBalance: 0,
        olasDepositBalance,
      };
    case ServiceRegistryL2ServiceState.FinishedRegistration:
    case ServiceRegistryL2ServiceState.Deployed:
      return {
        olasBondBalance,
        olasDepositBalance,
      };
    case ServiceRegistryL2ServiceState.TerminatedBonded:
      return {
        olasBondBalance,
        olasDepositBalance: 0,
      };
    default:
      console.error('Invalid service state');
      return {
        olasBondBalance,
        olasDepositBalance,
      };
  }
};
