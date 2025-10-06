import { sum } from 'lodash';
import { useMemo } from 'react';

import { TOKEN_CONFIG, TokenConfig } from '@/config/tokens';
import { TokenSymbol, TokenSymbolMap } from '@/constants';
import { AvailableAsset } from '@/types/Wallet';
import { asEvmChainDetails } from '@/utils';

import { useServiceBalances } from './useBalanceContext';
import { useServices } from './useServices';

export const useAvailableAgentAssets = () => {
  const { selectedAgentConfig } = useServices();
  const { selectedService } = useServices();
  const { evmHomeChainId, middlewareHomeChainId } = selectedAgentConfig;
  const {
    serviceSafeNativeBalances,
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
    serviceSafeOlas,
  } = useServiceBalances(selectedService?.service_config_id);

  // TODO: create a separate hook and reuse it in FundAgent and PearlWalletProvider
  // OLAS token, Native Token, other ERC20 tokens
  const availableAssets: AvailableAsset[] = useMemo(() => {
    if (!evmHomeChainId) return [];

    const tokenConfig = TOKEN_CONFIG[evmHomeChainId];
    const serviceSafeBalances = serviceSafeErc20Balances?.reduce<{
      [tokenSymbol: string]: number;
    }>((acc, { balance, symbol }) => {
      if (!acc[symbol]) acc[symbol] = 0;
      acc[symbol] += balance;
      return acc;
    }, {});

    return Object.entries(tokenConfig).map(
      ([untypedSymbol, untypedTokenDetails]) => {
        const symbol = untypedSymbol as TokenSymbol;
        const { address } = untypedTokenDetails as TokenConfig;

        const balance = (() => {
          // balance for OLAS
          if (symbol === TokenSymbolMap.OLAS) {
            return sum([serviceSafeOlas?.balance]);
          }

          // balance for native tokens
          if (symbol === asEvmChainDetails(middlewareHomeChainId).symbol) {
            const serviceSafeNativeBalance = serviceSafeNativeBalances?.find(
              (nativeBalance) => nativeBalance.symbol === symbol,
            )?.balance;
            return sum([
              serviceSafeNativeBalance,
              serviceEoaNativeBalance?.balance,
            ]);
          }

          // balance for other required tokens (eg. USDC)
          return serviceSafeBalances?.[symbol] ?? 0;
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
    evmHomeChainId,
    middlewareHomeChainId,
    serviceSafeNativeBalances,
    serviceEoaNativeBalance,
    serviceSafeErc20Balances,
    serviceSafeOlas?.balance,
  ]);

  return availableAssets;
};
