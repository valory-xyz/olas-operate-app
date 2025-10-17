import { compact, sum } from 'lodash';
import { useMemo } from 'react';

import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import { useMasterBalances } from '@/hooks';
import { AvailableAsset } from '@/types/Wallet';
import { sumNumbers } from '@/utils';
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
    getMasterEoaNativeBalanceOfInStr,
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
            const masterSafeNativeBalanceInStr = compact(
              getMasterSafeNativeBalanceOf(walletChainId)?.map(
                ({ balanceString }) => balanceString,
              ) ?? [],
            );

            console.log('XDAI balance from onChain: ', {
              a: masterSafeNativeBalance,
              b: getMasterEoaNativeBalanceOf(walletChainId),
              sum: sum([
                masterSafeNativeBalance,
                includeMasterEoa
                  ? getMasterEoaNativeBalanceOf(walletChainId)
                  : 0,
              ]),
              mySum: sumNumbers([
                ...masterSafeNativeBalanceInStr,
                includeMasterEoa
                  ? (getMasterEoaNativeBalanceOfInStr(walletChainId) ?? '0')
                  : '0',
              ]),
            });

            return sum([
              masterSafeNativeBalance,
              includeMasterEoa ? getMasterEoaNativeBalanceOf(walletChainId) : 0,
            ]);
          }

          // balance for other required tokens (eg. USDC, wrapped tokens, etc)
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
    getMasterEoaNativeBalanceOfInStr,
  ]);

  return {
    isLoading: isStakingRewardsLoading || !isLoaded,
    availableAssets,
  };
};
