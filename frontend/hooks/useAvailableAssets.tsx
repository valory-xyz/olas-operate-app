import { sum } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import { useMasterBalances, useServices, useUsdAmounts } from '@/hooks';
import { Nullable } from '@/types/Util';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

export type AvailableAsset = {
  address?: string;
  symbol: TokenSymbol;
  amount: number;
  valueInUsd: number;
};

export const useAvailableAssets = () => {
  const { selectedAgentConfig } = useServices();

  const {
    getMasterSafeNativeBalanceOf,
    getMasterSafeOlasBalanceOf,
    getMasterSafeErc20Balances,
    getMasterEoaNativeBalanceOf,
  } = useMasterBalances();

  const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;

  const [walletChainId, setWalletChainId] =
    useState<Nullable<EvmChainId>>(evmHomeChainId);

  const chainName = walletChainId
    ? (CHAIN_CONFIG[walletChainId].name as string)
    : '';

  const usdRequirements = useMemo(() => {
    if (!walletChainId) return [];
    return Object.entries(TOKEN_CONFIG[walletChainId!]).map(
      ([untypedSymbol]) => {
        const symbol = untypedSymbol as TokenSymbol;
        return { symbol, amount: 0 };
      },
    );
  }, [walletChainId]);

  const { breakdown: usdBreakdown } = useUsdAmounts(chainName, usdRequirements);

  // OLAS token, Native Token, other ERC20 tokens
  const getAvailableAssets = useCallback(
    (chainId: Nullable<EvmChainId>): AvailableAsset[] => {
      if (!chainId) return [];

      const tokenConfig = TOKEN_CONFIG[chainId];
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
                getMasterSafeOlasBalanceOf(chainId),
                // accruedServiceStakingRewards,
              ]);
            }

            // balance for native tokens
            if (symbol === asEvmChainDetails(middlewareHomeChainId).symbol) {
              return sum([
                sum(
                  getMasterSafeNativeBalanceOf(chainId)?.map(
                    ({ balance }) => balance,
                  ) ?? [],
                ),
                getMasterEoaNativeBalanceOf(chainId),
              ]);
            }

            // balance for other required tokens (eg. USDC)
            return getMasterSafeErc20Balances(chainId)?.[symbol] ?? 0;
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
    },
    [
      usdBreakdown,
      middlewareHomeChainId,
      // accruedServiceStakingRewards,
      getMasterSafeOlasBalanceOf,
      getMasterSafeNativeBalanceOf,
      getMasterEoaNativeBalanceOf,
      getMasterSafeErc20Balances,
    ],
  );

  return getAvailableAssets;
};
