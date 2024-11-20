import { Contract as MulticallContract } from 'ethers-multicall';
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
import { MiddlewareServiceResponse } from '@/client';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { FIVE_SECONDS_INTERVAL } from '@/constants/intervals';
import { PROVIDERS } from '@/constants/providers';
import {
  LOW_AGENT_SAFE_BALANCE,
  LOW_MASTER_SAFE_BALANCE,
} from '@/constants/thresholds';
import { ChainId } from '@/enums/Chain';
import { ServiceRegistryL2ServiceState } from '@/enums/ServiceRegistryL2ServiceState';
import { TokenSymbol } from '@/enums/Token';
import { WalletOwnerType, Wallets, WalletType } from '@/enums/Wallet';
import { useServices } from '@/hooks/useServices';
import { StakedAgentService } from '@/service/agents/StakedAgentService';
import { Address } from '@/types/Address';
import { formatEther } from '@/utils/numberFormatters';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { WalletContext } from './WalletProvider';

type CrossChainStakedBalances = Array<{
  serviceId: string;
  chainId: number;
  olasBondBalance: number;
  olasDepositBalance: number;
  walletAddress: Address;
}>;

export const BalanceContext = createContext<{
  isLoaded: boolean;
  setIsLoaded: Dispatch<SetStateAction<boolean>>;
  updateBalances: () => Promise<void>;
  setIsPaused: Dispatch<SetStateAction<boolean>>;
  walletBalances: WalletBalanceResult[];
  stakedBalances: CrossChainStakedBalances;
  totalOlasBalance: number;
  totalEthBalance: number;
  totalStakedOlasBalance: number;
  lowBalances: {
    serviceConfigId: string;
    chainId: ChainId;
    walletAddress: Address;
    balance: number;
    expectedBalance: number;
  }[];
  isPaused: boolean;
}>({
  isLoaded: false,
  setIsLoaded: () => {},
  updateBalances: async () => {},
  isPaused: false,
  setIsPaused: () => {},
  walletBalances: [],
  stakedBalances: [],
  totalOlasBalance: 0,
  totalEthBalance: 0,
  totalStakedOlasBalance: 0,
  lowBalances: [],
});

export const BalanceProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { wallets } = useContext(WalletContext);
  const { services } = useServices();

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
    return stakedBalances.reduce((acc, balance) => {
      return (
        acc + (balance.olasBondBalance || 0) + (balance.olasDepositBalance || 0)
      );
    }, 0);
  }, [stakedBalances]);

  /**
   * An array of wallet addresses that have low native token balances
   */
  const lowBalances = useMemo(() => {
    const result: {
      serviceConfigId: string;
      chainId: ChainId;
      walletAddress: Address;
      balance: number;
      expectedBalance: number;
    }[] = [];

    if (!services || !wallets || !walletBalances) return result;

    for (const service of services) {
      const serviceId = service.service_config_id;
      const serviceHomeChainId = service.home_chain_id;

      const stakedBalancesForService = stakedBalances.filter(
        (balance) =>
          balance.serviceId === serviceId &&
          balance.chainId === serviceHomeChainId,
      );

      if (stakedBalancesForService.length === 0) continue;

      // Get addresses for master safe and agent home chain safe
      const masterSafeWallet = wallets.find(
        (wallet) =>
          wallet.owner === WalletOwnerType.Master &&
          wallet.type === WalletType.Safe &&
          wallet.chainId === serviceHomeChainId,
      );

      const masterSafeAddress = masterSafeWallet?.address;
      const stakedAgentSafeAddress =
        service.chain_configs[serviceHomeChainId]?.chain_data.multisig;

      if (!masterSafeAddress && !stakedAgentSafeAddress) continue;

      const masterSafeBalanceResult = walletBalances.find(
        (balance) =>
          balance.walletAddress === masterSafeAddress && balance.isNative,
      );

      const stakedAgentSafeBalanceResult = walletBalances.find(
        (balance) =>
          balance.walletAddress === stakedAgentSafeAddress && balance.isNative,
      );

      if (
        masterSafeBalanceResult &&
        masterSafeBalanceResult.balance < LOW_MASTER_SAFE_BALANCE
      ) {
        result.push({
          serviceConfigId: service.service_config_id,
          chainId: serviceHomeChainId,
          walletAddress: masterSafeBalanceResult.walletAddress,
          balance: masterSafeBalanceResult.balance,
          expectedBalance: LOW_MASTER_SAFE_BALANCE,
        });
      }

      if (
        stakedAgentSafeBalanceResult &&
        stakedAgentSafeBalanceResult.balance < LOW_AGENT_SAFE_BALANCE
      ) {
        result.push({
          serviceConfigId: service.service_config_id,
          chainId: serviceHomeChainId,
          walletAddress: stakedAgentSafeBalanceResult.walletAddress,
          balance: stakedAgentSafeBalanceResult.balance,
          expectedBalance: LOW_AGENT_SAFE_BALANCE,
        });
      }
    }

    return result;
  }, [services, stakedBalances, wallets, walletBalances]);

  const updateBalances = useCallback(async () => {
    if (wallets && services) {
      setIsUpdatingBalances(true);

      try {
        const [walletBalancesResult, stakedBalancesResult] = await Promise.all([
          getCrossChainWalletBalances(wallets),
          getCrossChainStakedBalances(services),
        ]);

        setWalletBalances(walletBalancesResult);
        setStakedBalances(stakedBalancesResult);
        setIsLoaded(true);
      } catch (error) {
        console.error('Error updating balances:', error);
      } finally {
        setIsUpdatingBalances(false);
      }
    }
  }, [services, wallets]);

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
        lowBalances,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};

export type WalletBalanceResult = {
  walletAddress: Address;
  chainId: ChainId;
  symbol: TokenSymbol;
  isNative: boolean;
  balance: number;
};

const getCrossChainWalletBalances = async (
  wallets: Wallets,
): Promise<WalletBalanceResult[]> => {
  const balanceResults: WalletBalanceResult[] = [];

  for (const [chainIdKey, { multicallProvider }] of Object.entries(PROVIDERS)) {
    const chainId = Number(chainIdKey) as ChainId;

    const tokens = TOKEN_CONFIG[chainId];
    if (!tokens) continue;

    const relevantWallets = wallets.filter((wallet) => {
      const isEoa = wallet.type === WalletType.EOA;
      const isSafe = wallet.type === WalletType.Safe;
      const isOnSameChain = isEoa || wallet.chainId === chainId;
      return isEoa || (isSafe && isOnSameChain);
    });

    for (const [symbolKey, tokenConfig] of Object.entries(tokens)) {
      const symbol = symbolKey as TokenSymbol;

      const isNative = tokenConfig.tokenType === TokenType.NativeGas;
      const isErc20 = tokenConfig.tokenType === TokenType.Erc20;

      if (isNative) {
        const nativeBalancePromises = relevantWallets.map(async (wallet) => {
          const balance = await multicallProvider.getEthBalance(wallet.address);
          return {
            walletAddress: wallet.address,
            chainId,
            symbol,
            isNative: true,
            balance: Number(formatEther(balance)),
          } as WalletBalanceResult;
        });

        const nativeBalances = await Promise.all(nativeBalancePromises);
        balanceResults.push(...nativeBalances);
      }

      if (isErc20) {
        const erc20Contract = new MulticallContract(
          tokenConfig.address,
          ERC20_BALANCE_OF_STRING_FRAGMENT,
        );

        const erc20Calls = relevantWallets.map((wallet) =>
          erc20Contract.balanceOf(wallet.address),
        );

        const erc20Balances = await multicallProvider.all(erc20Calls);

        const erc20Results = relevantWallets.map((wallet, index) => ({
          walletAddress: wallet.address,
          chainId,
          symbol,
          isNative: false,
          balance: Number(formatEther(erc20Balances[index])),
        })) as WalletBalanceResult[];

        balanceResults.push(...erc20Results);
      }
    }
  }

  return balanceResults;
};

const getCrossChainStakedBalances = async (
  services: MiddlewareServiceResponse[],
): Promise<CrossChainStakedBalances> => {
  const result: CrossChainStakedBalances = [];

  const registryInfoPromises = services.map(async (service) => {
    const serviceId = service.service_config_id;
    const homeChainId = service.home_chain_id;
    const homeChainConfig = service.chain_configs[homeChainId];
    const { multisig, token } = homeChainConfig.chain_data;

    if (!multisig || !token) {
      return null;
    }

    const registryInfo = await StakedAgentService.getServiceRegistryInfo(
      multisig,
      token,
      homeChainId,
    );

    return {
      serviceId,
      chainId: homeChainId,
      ...registryInfo,
    };
  });

  const registryInfos = await Promise.allSettled(registryInfoPromises);

  registryInfos.forEach((res, idx) => {
    if (res.status === 'fulfilled' && res.value) {
      const { serviceId, chainId, depositValue, bondValue, serviceState } =
        res.value;

      result.push({
        serviceId,
        chainId,
        ...correctBondDepositByServiceState({
          olasBondBalance: bondValue,
          olasDepositBalance: depositValue,
          serviceState,
        }),
        walletAddress:
          services[idx].chain_configs[chainId].chain_data.multisig!, // multisig must exist if registry info is fetched
      });
    } else {
      console.error(
        'Error fetching registry info for',
        services[idx].service_config_id,
      );
    }
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
        olasDepositBalance: olasDepositBalance,
      };
    case ServiceRegistryL2ServiceState.FinishedRegistration:
    case ServiceRegistryL2ServiceState.Deployed:
      return {
        olasBondBalance: olasBondBalance,
        olasDepositBalance: olasDepositBalance,
      };
    case ServiceRegistryL2ServiceState.TerminatedBonded:
      return {
        olasBondBalance: olasBondBalance,
        olasDepositBalance: 0,
      };
    default:
      console.error('Invalid service state');
      return {
        olasBondBalance: olasBondBalance,
        olasDepositBalance: olasDepositBalance,
      };
  }
};
