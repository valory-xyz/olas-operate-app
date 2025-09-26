import { sum } from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import { useUnmount } from 'usehooks-ts';

import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
  useRewardContext,
  useService,
  useServices,
  useUsdAmounts,
} from '@/hooks';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { AvailableAsset } from '../types';

export const useFundAgent = () => {
  const {
    isLoading: isServicesLoading,
    selectedAgentConfig,
    selectedService,
  } = useServices();
  const { isLoaded } = useService(selectedService?.service_config_id);
  const { isLoading: isBalanceLoading } = useBalanceContext();
  const { accruedServiceStakingRewards } = useRewardContext();
  const {
    masterEoaNativeBalance,
    masterSafeNativeBalance,
    masterSafeOlasBalance,
    masterSafeErc20Balances,
  } = useMasterBalances();

  const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;

  const [amountsToWithdraw, setAmountsToWithdraw] = useState<
    Partial<Record<TokenSymbol, number>>
  >({});

  const chainName = evmHomeChainId
    ? (CHAIN_CONFIG[evmHomeChainId].name as string)
    : '';

  const usdRequirements = useMemo(() => {
    if (!evmHomeChainId) return [];
    return Object.entries(TOKEN_CONFIG[evmHomeChainId!]).map(
      ([untypedSymbol]) => {
        const symbol = untypedSymbol as TokenSymbol;
        return { symbol, amount: 0 };
      },
    );
  }, [evmHomeChainId]);

  const { breakdown: usdBreakdown } = useUsdAmounts(chainName, usdRequirements);

  // OLAS token, Native Token, other ERC20 tokens
  const availableAssets: AvailableAsset[] = useMemo(() => {
    if (!evmHomeChainId) return [];

    const tokenConfig = TOKEN_CONFIG[evmHomeChainId];
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
            return sum([masterSafeOlasBalance, accruedServiceStakingRewards]);
          }

          // balance for native tokens
          if (symbol === asEvmChainDetails(middlewareHomeChainId).symbol) {
            return sum([
              sum(masterSafeNativeBalance?.map(({ balance }) => balance) ?? []),
              masterEoaNativeBalance,
            ]);
          }

          // balance for other required tokens (eg. USDC)
          return masterSafeErc20Balances?.[symbol] ?? 0;
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
    evmHomeChainId,
    usdBreakdown,
    middlewareHomeChainId,
    masterSafeErc20Balances,
    masterSafeOlasBalance,
    accruedServiceStakingRewards,
    masterSafeNativeBalance,
    masterEoaNativeBalance,
  ]);

  const onAmountChange = useCallback((symbol: TokenSymbol, amount: number) => {
    setAmountsToWithdraw((prev) => ({ ...prev, [symbol]: amount }));
  }, []);

  // Reset amounts on unmount
  useUnmount(() => {
    setAmountsToWithdraw({});
  });

  return {
    isLoading: isServicesLoading || !isLoaded || isBalanceLoading,
    availableAssets,
    amountsToWithdraw,
    onAmountChange,
  };
};
