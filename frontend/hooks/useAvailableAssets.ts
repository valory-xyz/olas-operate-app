import { compact } from 'lodash';
import { useMemo } from 'react';

import {
  TOKEN_CONFIG,
  TokenConfig,
  TokenSymbol,
  TokenSymbolMap,
} from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { useMasterBalances } from '@/hooks';
import { AvailableAsset } from '@/types/Wallet';
import { sumBigNumbers } from '@/utils';
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
  const { totalStakingRewards, isLoading: isStakingRewardsLoading } =
    useStakingRewardsOf(walletChainId);
  const {
    isLoaded,
    getMasterSafeNativeBalanceOf,
    getMasterSafeErc20BalancesInStr,
    getMasterEoaNativeBalanceOf,
    getMasterSafeOlasBalanceOfInStr,
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
            return sumBigNumbers(
              compact([
                getMasterSafeOlasBalanceOfInStr(walletChainId),
                totalStakingRewards,
              ]),
            );
          }

          // balance for native tokens
          if (
            symbol ===
            asEvmChainDetails(asMiddlewareChain(walletChainId)).symbol
          ) {
            const masterSafeNativeBalanceInStr =
              getMasterSafeNativeBalanceOf(walletChainId)?.map(
                ({ balanceString }) => balanceString,
              ) ?? [];
            const masterEoaNativeBalanceInStr = includeMasterEoa
              ? getMasterEoaNativeBalanceOf(walletChainId)
              : '0';

            return sumBigNumbers(
              compact([
                ...masterSafeNativeBalanceInStr,
                masterEoaNativeBalanceInStr,
              ]),
            );
          }

          // balance for other required tokens (eg. USDC, wrapped tokens, etc)
          return (
            getMasterSafeErc20BalancesInStr(walletChainId)?.[symbol] ?? '0'
          );
        })();

        const asset: AvailableAsset = {
          address,
          symbol,
          amount: Number(balance),
          amountInStr: balance,
        };
        return asset;
      },
    );
  }, [
    walletChainId,
    getMasterSafeErc20BalancesInStr,
    getMasterSafeOlasBalanceOfInStr,
    totalStakingRewards,
    getMasterSafeNativeBalanceOf,
    includeMasterEoa,
    getMasterEoaNativeBalanceOf,
  ]);

  return {
    isLoading: isStakingRewardsLoading || !isLoaded,
    availableAssets,
  };
};
