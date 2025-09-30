import { sum } from 'lodash';
import { useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import { useMasterBalances, useUsdAmounts } from '@/hooks';
import { AvailableAsset } from '@/types/Wallet';
import {
  asEvmChainDetails,
  asMiddlewareChain,
} from '@/utils/middlewareHelpers';

import { useStakingRewardsOf } from './useStakingRewardsOf';

const useUsdBreakdown = (chainId: EvmChainId) => {
  const chainName = chainId ? CHAIN_CONFIG[chainId].name : '';

  const usdRequirements = useMemo(() => {
    if (!chainId) return [];
    return Object.entries(TOKEN_CONFIG[chainId!]).map(([untypedSymbol]) => {
      const symbol = untypedSymbol as TokenSymbol;
      return { symbol, amount: 0 };
    });
  }, [chainId]);

  const { breakdown: usdBreakdown } = useUsdAmounts(chainName, usdRequirements);
  return usdBreakdown;
};

/**
 * Hook to fetch available assets in the master safe and master eoa wallets
 * for a given chainId.
 */
export const useAvailableAssets = (walletChainId: EvmChainId) => {
  const usdBreakdown = useUsdBreakdown(walletChainId);
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
        const { usdPrice } = usdBreakdown.find(
          (breakdown) => breakdown.symbol === symbol,
        ) ?? { usdPrice: 0 };

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
            return sum([
              sum(
                getMasterSafeNativeBalanceOf(walletChainId)?.map(
                  ({ balance }) => balance,
                ) ?? [],
              ),
              getMasterEoaNativeBalanceOf(walletChainId),
            ]);
          }

          // balance for other required tokens (eg. USDC)
          return getMasterSafeErc20Balances(walletChainId)?.[symbol] ?? 0;
        })();

        const asset: AvailableAsset = {
          address,
          symbol,
          amount: balance,
          valueInUsd: usdPrice * balance,
        };
        return asset;
      },
    );
  }, [
    walletChainId,
    usdBreakdown,
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
