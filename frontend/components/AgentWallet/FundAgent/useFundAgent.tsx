import { useMutation } from '@tanstack/react-query';
import { sum } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import { ServiceConfigId } from '@/client';
import { CHAIN_CONFIG } from '@/config/chains';
import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import {
  BACKEND_URL_V2,
  CONTENT_TYPE_JSON_UTF8,
  SupportedMiddlewareChain,
} from '@/constants';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import {
  useBalanceContext,
  useMasterBalances,
  useRewardContext,
  useService,
  useServices,
  useUsdAmounts,
} from '@/hooks';
import { Address } from '@/types/Address';
import { asEvmChainDetails } from '@/utils/middlewareHelpers';

import { AvailableAsset } from '../types';

type FundsTo = {
  [chain in SupportedMiddlewareChain]: {
    [address: Address]: {
      [address: Address]: number;
    };
  };
};

/**
 * Withdraws the balance of a service
 *
 * @param withdrawAddress Address
 * @param serviceTemplate ServiceTemplate
 * @returns Promise<Service>
 */
const fundAgent = async ({
  funds,
  serviceConfigId,
}: {
  funds: FundsTo;
  serviceConfigId: ServiceConfigId;
}): Promise<{ error: string | null }> =>
  new Promise((resolve, reject) =>
    fetch(`${BACKEND_URL_V2}/service/${serviceConfigId}/fund`, {
      method: 'POST',
      body: JSON.stringify(funds),
      headers: { ...CONTENT_TYPE_JSON_UTF8 },
    }).then((response) => {
      if (response.ok) {
        resolve(response.json());
      } else {
        reject('Failed to withdraw balance');
      }
    }),
  );

const useConfirmTransfer = () => {
  const { isPending, isSuccess, isError, mutateAsync } = useMutation({
    mutationFn: async () => {
      await fundAgent({ funds: {}, serviceConfigId: '' });
    },
  });

  const onFundAgent = useCallback(async () => {
    try {
      await mutateAsync();
    } catch (error) {
      console.error(error);
    }
  }, [mutateAsync]);
};

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
    masterEoaBalance,
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
            return sum([masterSafeNativeBalance, masterEoaBalance]);
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
    masterEoaBalance,
  ]);

  const onAmountChange = useCallback((symbol: TokenSymbol, amount: number) => {
    setAmountsToWithdraw((prev) => ({ ...prev, [symbol]: amount }));
  }, []);

  const onReset = useCallback(() => {
    setAmountsToWithdraw({});
  }, []);

  const onConfirmTransfer = useCallback(() => {
    console.log('Confirm transfer', amountsToWithdraw);
  }, [amountsToWithdraw]);

  return {
    isLoading: isServicesLoading || !isLoaded || isBalanceLoading,
    availableAssets,
    amountsToWithdraw,
    onAmountChange,
    onConfirmTransfer,
  };
};
