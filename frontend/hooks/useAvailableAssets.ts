import { compact } from 'lodash';
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
    getMasterSafeErc20BalancesInStr,
    getMasterEoaNativeBalanceOfInStr,
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
            return sumNumbers(
              compact([
                getMasterSafeOlasBalanceOfInStr(walletChainId),
                String(stakingRewards?.accruedServiceStakingRewards || 0),
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

            return sumNumbers(
              compact([
                ...masterSafeNativeBalanceInStr,
                includeMasterEoa
                  ? getMasterEoaNativeBalanceOfInStr(walletChainId)
                  : '0',
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
          amountString: balance,
        };
        return asset;
      },
    );
  }, [
    walletChainId,
    includeMasterEoa,
    stakingRewards?.accruedServiceStakingRewards,
    getMasterSafeNativeBalanceOf,
    getMasterSafeErc20BalancesInStr,
    getMasterEoaNativeBalanceOfInStr,
    getMasterSafeOlasBalanceOfInStr,
  ]);

  return {
    isLoading: isStakingRewardsLoading || !isLoaded,
    availableAssets,
  };
};
