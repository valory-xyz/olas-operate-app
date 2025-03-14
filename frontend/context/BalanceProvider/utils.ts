import { BigNumberish } from 'ethers';
import { getAddress, isAddress } from 'ethers/lib/utils';
import { Contract as MulticallContract } from 'ethers-multicall';
import { isNil } from 'lodash';

import { ERC20_BALANCE_OF_STRING_FRAGMENT } from '@/abis/erc20';
import { MiddlewareChain, MiddlewareServiceResponse } from '@/client';
import { providers } from '@/config/providers';
import { TOKEN_CONFIG, TokenType } from '@/config/tokens';
import { EvmChainId } from '@/enums/Chain';
import { ServiceRegistryL2ServiceState } from '@/enums/ServiceRegistryL2ServiceState';
import {
  AgentWallet,
  MasterSafe,
  MasterWallet,
  Wallet,
  WalletType,
} from '@/enums/Wallet';
import { StakedAgentService } from '@/service/agents/shared-services/StakedAgentService';
import { CrossChainStakedBalances, WalletBalance } from '@/types/Balance';
import { asEvmChainId } from '@/utils/middlewareHelpers';
import { formatUnits } from '@/utils/numberFormatters';
import { isValidServiceId } from '@/utils/service';

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
}) => {
  switch (serviceState) {
    case ServiceRegistryL2ServiceState.NonExistent:
    case ServiceRegistryL2ServiceState.PreRegistration:
      return { olasBondBalance: 0, olasDepositBalance: 0 };
    case ServiceRegistryL2ServiceState.ActiveRegistration:
      return { olasBondBalance: 0, olasDepositBalance };
    case ServiceRegistryL2ServiceState.FinishedRegistration:
    case ServiceRegistryL2ServiceState.Deployed:
      return { olasBondBalance, olasDepositBalance };
    case ServiceRegistryL2ServiceState.TerminatedBonded:
      return { olasBondBalance, olasDepositBalance: 0 };
    default:
      console.error('Invalid service state');
      return { olasBondBalance, olasDepositBalance };
  }
};

export const getCrossChainWalletBalances = async (
  wallets: Wallet[],
): Promise<WalletBalance[]> => {
  const balanceResults: WalletBalance[] = [];

  for (const [evmChainIdKey, { multicallProvider, provider }] of providers) {
    try {
      const providerEvmChainId = +evmChainIdKey as EvmChainId;
      const tokensOnChain = TOKEN_CONFIG[providerEvmChainId];

      const connectedWallets = wallets.filter((wallet) => {
        const isEoa = wallet.type === WalletType.EOA;
        const isSafe = wallet.type === WalletType.Safe;
        const isOnActiveChain =
          isEoa || (isSafe && wallet.evmChainId === providerEvmChainId);

        return isOnActiveChain;
      });

      for (const {
        tokenType,
        symbol: tokenSymbol,
        address: tokenAddress,
        decimals,
      } of Object.values(tokensOnChain)) {
        const isNative = tokenType === TokenType.NativeGas;
        const isErc20 = tokenType === TokenType.Erc20;
        const isWrappedToken = tokenType === TokenType.Wrapped;

        if (isNative) {
          // get native balances for all relevant wallets
          const nativeBalancePromises =
            connectedWallets.map<Promise<BigNumberish> | null>(
              ({ address: walletAddress }) => {
                if (!isAddress(walletAddress)) return null;
                return provider.getBalance(getAddress(walletAddress));
              },
            );

          const nativeBalances = await Promise.all(nativeBalancePromises).catch(
            (e) => {
              console.error('Error fetching native balances:', e);
              return [];
            },
          );

          // add the results to the balance results
          nativeBalances.forEach((balance, index) => {
            if (!isNil(balance)) {
              const address = connectedWallets[index].address;

              balanceResults.push({
                walletAddress: address,
                evmChainId: providerEvmChainId,
                symbol: tokenSymbol,
                isNative: true,
                balance: Number(formatUnits(balance)),
              });
            }
          });
        }

        // get erc20 balances for all relevant wallets
        if (isErc20 || isWrappedToken) {
          if (!tokenAddress) continue;

          const erc20Contract = new MulticallContract(
            tokenAddress,
            ERC20_BALANCE_OF_STRING_FRAGMENT,
          );

          const relevantWalletsFiltered = connectedWallets.filter((wallet) =>
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
              isWrappedToken,
              balance: Number(formatUnits(erc20Balances[index], decimals)),
            }),
          ) as WalletBalance[];

          balanceResults.push(...erc20Results);
        }
      }
    } catch (error) {
      console.error('Error fetching balances for chain:', evmChainIdKey, error);
    }
  }

  return balanceResults;
};

/**
 * Get the staked balances for all services.
 * ie, the bond and deposit balances for all services on all chains.
 */
export const getCrossChainStakedBalances = async (
  services: MiddlewareServiceResponse[],
  masterSafeAddresses: MasterSafe[],
): Promise<CrossChainStakedBalances> => {
  const result: CrossChainStakedBalances = [];

  const registryInfoPromises = services.map(async (service) => {
    const serviceConfigId = service.service_config_id;
    const middlewareChain: MiddlewareChain = service.home_chain;
    const chainConfig = service.chain_configs[middlewareChain];
    const { token: serviceNftTokenId } = chainConfig.chain_data;
    const masterSafeAddress = masterSafeAddresses.find(
      (masterSafe) => masterSafe.evmChainId === asEvmChainId(middlewareChain),
    )?.address;

    if (
      isNil(serviceNftTokenId) ||
      !isValidServiceId(serviceNftTokenId) ||
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
      const id = services[idx].service_config_id;
      console.error('Error fetching registry details for', id);
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
 * Fetches wallet balances and staked balances.
 */
export const getCrossChainBalances = async ({
  services,
  masterWallets,
  serviceWallets,
}: {
  services: MiddlewareServiceResponse[];
  masterWallets: MasterWallet[];
  serviceWallets?: AgentWallet[];
}) => {
  const masterSafes = masterWallets.filter(
    (masterWallet): masterWallet is MasterSafe =>
      masterWallet.type === WalletType.Safe,
  );

  const [walletBalancesResult, stakedBalancesResult] = await Promise.allSettled(
    [
      getCrossChainWalletBalances([
        ...masterWallets,
        ...(serviceWallets || []),
      ]),
      getCrossChainStakedBalances(services, masterSafes),
    ],
  );

  return {
    walletBalances:
      walletBalancesResult.status === 'fulfilled'
        ? walletBalancesResult.value
        : [],
    stakedBalances:
      stakedBalancesResult.status === 'fulfilled'
        ? stakedBalancesResult.value
        : [],
  };
};
