import { entries, sum } from 'lodash';
import { useMemo } from 'react';

import {
  TOKEN_CONFIG,
  TokenConfig,
  TokenSymbol,
  TokenSymbolMap,
  TokenType,
} from '@/config/tokens';
import { AvailableAsset } from '@/types';
import { asEvmChainDetails } from '@/utils';

import { useServiceBalances } from './useServiceBalances';
import { useServices } from './useServices';

export const useAvailableAgentAssets = () => {
  const { selectedAgentConfig } = useServices();
  const { selectedService } = useServices();
  const { evmHomeChainId, middlewareHomeChainId, erc20Tokens } =
    selectedAgentConfig;
  const {
    serviceSafeNativeBalances,
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
    serviceEoaErc20Balances,
    serviceSafeOlas,
    isLoading,
  } = useServiceBalances(selectedService?.service_config_id);

  const availableAssets: AvailableAsset[] = useMemo(() => {
    if (!evmHomeChainId) return [];

    const tokenConfig = TOKEN_CONFIG[evmHomeChainId];

    // Filter tokens: always include native + OLAS, only include other ERC20s
    // if they are listed in the agent's erc20Tokens config
    const filteredTokenEntries = entries(tokenConfig).filter(
      ([symbol, { tokenType }]) => {
        if (tokenType === TokenType.NativeGas) return true;
        if (symbol === TokenSymbolMap.OLAS) return true;
        return erc20Tokens?.includes(symbol as TokenSymbol) ?? false;
      },
    );

    const serviceSafeBalances = serviceSafeErc20Balances?.reduce<{
      [tokenSymbol: string]: number;
    }>((acc, { balance, symbol }) => {
      if (!acc[symbol]) acc[symbol] = 0;
      acc[symbol] += balance;
      return acc;
    }, {});

    const serviceEoaErc20BalanceMap = serviceEoaErc20Balances?.reduce<{
      [tokenSymbol: string]: number;
    }>((acc, { balance, symbol }) => {
      if (!acc[symbol]) acc[symbol] = 0;
      acc[symbol] += balance;
      return acc;
    }, {});

    return filteredTokenEntries.map(([untypedSymbol, untypedTokenDetails]) => {
      const symbol = untypedSymbol as TokenSymbol;
      const { address } = untypedTokenDetails as TokenConfig;

      const balance = (() => {
        // balance for OLAS
        if (symbol === TokenSymbolMap.OLAS) {
          return sum([serviceSafeOlas?.balance]) ?? 0;
        }

        // balance for native tokens
        if (symbol === asEvmChainDetails(middlewareHomeChainId).symbol) {
          const serviceSafeNativeBalance = serviceSafeNativeBalances?.find(
            (nativeBalance) => nativeBalance.symbol === symbol,
          )?.balance;
          return (
            sum([serviceSafeNativeBalance, serviceEoaNativeBalance?.balance]) ??
            0
          );
        }

        // balance for other required tokens (eg. USDC)
        // includes both safe and EOA balances
        return sum([
          serviceSafeBalances?.[symbol] ?? 0,
          serviceEoaErc20BalanceMap?.[symbol] ?? 0,
        ]);
      })();

      const asset: AvailableAsset = {
        address,
        symbol,
        amount: balance,
      };
      return asset;
    });
  }, [
    evmHomeChainId,
    erc20Tokens,
    middlewareHomeChainId,
    serviceSafeNativeBalances,
    serviceEoaNativeBalance,
    serviceSafeErc20Balances,
    serviceEoaErc20Balances,
    serviceSafeOlas?.balance,
  ]);

  return { availableAssets, isLoading };
};
