import { useMemo } from 'react';

import { TokenSymbolMap } from '@/config/tokens';
import { Optional, WalletBalance } from '@/types';
import { areAddressesEqual } from '@/utils';

import { useBalanceContext } from './useBalanceContext';
import { useService } from './useService';
import { useServices } from './useServices';

/**
 * Balances relevant to a specific service (agent)
 * @param serviceConfigId
 * @returns
 */
export const useServiceBalances = (serviceConfigId: string | undefined) => {
  const { selectedAgentConfig } = useServices();

  const { serviceSafes, serviceEoa } = useService(serviceConfigId);
  const { walletBalances, isLoading } = useBalanceContext();

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;

  /**
   * Cross-chain unstaked balances in service safes
   */
  const serviceSafeBalances = useMemo<Optional<WalletBalance[]>>(
    () =>
      walletBalances?.filter((balance) =>
        serviceSafes.find(({ address }) =>
          areAddressesEqual(balance.walletAddress, address),
        ),
      ),
    [serviceSafes, walletBalances],
  );

  /**
   * Cross-chain unstaked balances in service eoa (signer)
   */
  const serviceEoaBalances = useMemo<Optional<WalletBalance[]>>(
    () =>
      walletBalances?.filter((balance) =>
        areAddressesEqual(balance.walletAddress, serviceEoa?.address),
      ),
    [serviceEoa?.address, walletBalances],
  );

  const serviceSafeNativeBalances = useMemo(() => {
    if (!serviceSafeBalances) return null;
    return serviceSafeBalances.filter(
      ({ evmChainId, isNative }) => evmChainId === evmHomeChainId && isNative,
    );
  }, [serviceSafeBalances, evmHomeChainId]);

  /** service safe native balances for current chain */
  const serviceSafeErc20Balances = useMemo(
    () =>
      serviceSafeBalances?.filter(
        ({ isNative, symbol, evmChainId }) =>
          !isNative &&
          symbol !== TokenSymbolMap.OLAS &&
          evmChainId === evmHomeChainId,
      ),
    [serviceSafeBalances, evmHomeChainId],
  );

  /** service eoa native balance for current chain */
  const serviceEoaNativeBalance = useMemo(
    () =>
      serviceEoaBalances?.find(
        ({ isNative, evmChainId }) => isNative && evmChainId === evmHomeChainId,
      ),
    [serviceEoaBalances, evmHomeChainId],
  );

  /** service eoa ERC20 balances for current chain (excluding OLAS) */
  const serviceEoaErc20Balances = useMemo(
    () =>
      serviceEoaBalances?.filter(
        ({ isNative, symbol, evmChainId }) =>
          !isNative &&
          symbol !== TokenSymbolMap.OLAS &&
          evmChainId === evmHomeChainId,
      ),
    [serviceEoaBalances, evmHomeChainId],
  );

  /** claimed OLAS */
  const serviceSafeOlas = useMemo(
    () =>
      serviceSafeBalances?.find(
        ({ symbol, evmChainId }) =>
          symbol === TokenSymbolMap.OLAS && evmChainId === evmHomeChainId,
      ),
    [serviceSafeBalances, evmHomeChainId],
  );

  return {
    serviceSafeBalances,
    serviceSafeOlas,
    serviceSafeNativeBalances,
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
    serviceEoaErc20Balances,
    isLoading,
  };
};
