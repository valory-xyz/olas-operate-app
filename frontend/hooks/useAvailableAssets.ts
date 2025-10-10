import { sum } from 'lodash';
import { useMemo } from 'react';

import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import { useMasterBalances } from '@/hooks';
import { AvailableAsset } from '@/types/Wallet';
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';

import { useStakingRewardsOf } from './useStakingRewardsOf';
/**
 * Hook to fetch available assets in the master safe and master eoa wallets
 * for a given chainId.
 */
export const useAvailableAssets = (
  walletChainId: EvmChainId,
  { includeMasterEoa = true } = {},
) => {
  const { isLoading: isStakingRewardsLoading, data: stakingRewards } =
    useStakingRewardsOf(walletChainId);
  const {
    isLoaded,
    getMasterSafeNativeBalanceOf,
    getMasterSafeOlasBalanceOf,
    getMasterSafeErc20Balances,
    getMasterEoaNativeBalanceOf,
  } = useMasterBalances();

  // OLAS token, Native Token, other ERC20 tokens
  const availableAssets: AvailableAsset[] = useMemo(() => {
    if (!walletChainId) return [];

    const tokenConfig = TOKEN_CONFIG[walletChainId];
    return Object.entries(tokenConfig).map(
      ([untypedSymbol, untypedTokenDetails]) => {
        const symbol = untypedSymbol as TokenSymbol;
        const { address } = untypedTokenDetails as TokenConfig;

        const balance = (() => {
          // balance for OLAS
          if (symbol === TokenSymbolMap.OLAS) {
            return sum([
              getMasterSafeOlasBalanceOf(walletChainId),
              stakingRewards?.accruedServiceStakingRewards,
            ]);
          }

          // balance for native tokens
          if (
            symbol ===
            asEvmChainDetails(asMiddlewareChain(walletChainId)).symbol
          ) {
            const masterSafeNativeBalance = sum(
              getMasterSafeNativeBalanceOf(walletChainId)?.map(
                ({ balance }) => balance,
              ) ?? [],
            );
            return sum([
              masterSafeNativeBalance,
              includeMasterEoa
                ? getMasterEoaNativeBalanceOf(walletChainId)
                : undefined,
            ]);
          }

          // balance for other required tokens (eg. USDC)
          return getMasterSafeErc20Balances(walletChainId)?.[symbol] ?? 0;
        })();

        const asset: AvailableAsset = {
          address,
          symbol,
          amount: balance,
        };
        return asset;
      },
    );
  }, [
    walletChainId,
    includeMasterEoa,
    stakingRewards?.accruedServiceStakingRewards,
    getMasterSafeOlasBalanceOf,
    getMasterSafeNativeBalanceOf,
    getMasterEoaNativeBalanceOf,
    getMasterSafeErc20Balances,
  ]);

  return {
    isLoading: isStakingRewardsLoading || !isLoaded,
    availableAssets,
  };
};
