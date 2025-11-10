import { useMemo } from 'react';

import { TokenSymbolMap } from '@/constants';
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

  const { agentAddresses, serviceSafes, serviceEoa } =
    useService(serviceConfigId);
  const { walletBalances, stakedBalances, isLoading } = useBalanceContext();

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;

  /**
   * Staked balances, only relevant to safes
   */
  const serviceStakedBalances = useMemo(() => {
    if (!stakedBalances) return;
    return stakedBalances.filter(({ walletAddress }) =>
      agentAddresses.includes(walletAddress),
    );
  }, [agentAddresses, stakedBalances]);

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

  /**
   * Balances i.e. native, erc20, etc
   * Across all service wallets, including eoa
   * @note NOT STAKED BALANCES
   */
  const serviceWalletBalances = useMemo<Optional<WalletBalance[]>>(() => {
    let result;
    if (serviceSafeBalances || serviceEoaBalances) {
      result = [...(serviceSafeBalances || []), ...(serviceEoaBalances || [])];
    }
    return result;
  }, [serviceEoaBalances, serviceSafeBalances]);

  /**
   * Native service safe
   * @example XDAI on gnosis
   */
  const serviceSafeNative = useMemo(
    () =>
      serviceSafeBalances?.find(
        ({ isNative, evmChainId }) =>
          isNative && evmChainId === selectedAgentConfig.evmHomeChainId,
      ),
    [serviceSafeBalances, selectedAgentConfig],
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
    serviceWalletBalances,
    serviceStakedBalances,
    serviceSafeBalances,
    serviceSafeOlas,
    serviceEoaBalances,
    serviceSafeNative,
    serviceSafeNativeBalances,
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
    isLoading,
  };
};
