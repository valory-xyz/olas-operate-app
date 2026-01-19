import { compact, isNil } from 'lodash';
import { useCallback, useMemo } from 'react';

import { TokenSymbol, TokenSymbolMap } from '@/config/tokens';
import { AddressZero, EvmChainId } from '@/constants';
import { MASTER_SAFE_REFILL_PLACEHOLDER } from '@/constants/defaults';
import {
  useBalanceAndRefillRequirementsContext,
  useBalanceContext,
  useMasterWalletContext,
  useServices,
} from '@/hooks';
import { Optional, WalletBalance } from '@/types';
import { areAddressesEqual, formatUnitsToNumber, sumBigNumbers } from '@/utils';

/** Check if a balance requires funding (greater than 0) */
const requiresFund = (balance?: string) => {
  if (isNil(balance)) return false;
  return BigInt(balance) > BigInt(0);
};

const useRefillRequirement = (wallet?: WalletBalance) => {
  const { refillRequirements } = useBalanceAndRefillRequirementsContext();
  if (!refillRequirements || !wallet) return;
  if (MASTER_SAFE_REFILL_PLACEHOLDER in refillRequirements) return;

  const requirement = refillRequirements[wallet.walletAddress]?.[AddressZero];
  return requirement;
};

const formatRequirement = (requirement?: string) => {
  if (isNil(requirement)) return;
  return formatUnitsToNumber(requirement);
};

/**
 * Balances relevant to the master wallets (EOA and Safes)
 * - master[Wallet]Balances: balances only for the selected agent's relevant chains
 * - allMasterWalletBalances: balances across all chains for master wallets
 */
export const useMasterBalances = () => {
  const { selectedAgentConfig } = useServices();
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { isLoaded, walletBalances } = useBalanceContext();

  /**
   * Unstaked balances across all master safes and EOA (all chains)
   */
  const allMasterWalletBalances = useMemo<Optional<WalletBalance[]>>(() => {
    if (!walletBalances || !masterSafes) return [];
    return walletBalances.filter(({ walletAddress }) => {
      const isFromMasterSafe = masterSafes.some(({ address }) =>
        areAddressesEqual(walletAddress, address),
      );
      const isFromMasterEoa = areAddressesEqual(
        walletAddress,
        masterEoa?.address,
      );
      return isFromMasterSafe || isFromMasterEoa;
    });
  }, [masterSafes, walletBalances, masterEoa]);

  /** Internal implementation for getting master EOA native balance */
  const _getMasterEoaNativeBalanceOfCalc = useCallback(
    (chainId: EvmChainId) => {
      if (!chainId) return;
      if (isNil(masterEoa)) return;
      if (isNil(allMasterWalletBalances)) return;
      const balances = allMasterWalletBalances.filter(
        ({ walletAddress, isNative, evmChainId }) =>
          isNative &&
          chainId === evmChainId &&
          areAddressesEqual(walletAddress, masterEoa.address),
      );
      return sumBigNumbers(
        compact(balances.map(({ balanceString }) => balanceString)),
      );
    },
    [masterEoa, allMasterWalletBalances],
  );

  /** Get the master EOA native balance */
  const getMasterEoaNativeBalanceOf = useCallback(
    (chainId: EvmChainId) => {
      return _getMasterEoaNativeBalanceOfCalc(chainId);
    },
    [_getMasterEoaNativeBalanceOfCalc],
  );

  /** Get the master EOA balances as WalletBalance[] */
  const getMasterEoaBalancesOf = useCallback(
    (chainId: EvmChainId) => {
      if (!chainId) return [];
      if (isNil(masterEoa)) return [];
      if (isNil(allMasterWalletBalances)) return [];
      return allMasterWalletBalances.filter(
        ({ walletAddress, evmChainId }) =>
          chainId === evmChainId &&
          areAddressesEqual(walletAddress, masterEoa.address),
      );
    },
    [masterEoa, allMasterWalletBalances],
  );

  /** master EOA native WalletBalance for selected agent chain */
  const masterEoaNative = useMemo(() => {
    if (!selectedAgentConfig?.evmHomeChainId) return;
    const balances = getMasterEoaBalancesOf(
      selectedAgentConfig.evmHomeChainId,
    )?.filter(
      ({ isNative, evmChainId }) =>
        isNative && evmChainId === selectedAgentConfig.evmHomeChainId,
    );
    return balances && balances[0];
  }, [getMasterEoaBalancesOf, selectedAgentConfig.evmHomeChainId]);

  // master EOA balance requirement
  const masterEoaGasRequirementInWei = useRefillRequirement(masterEoaNative);
  const masterEoaGasRequirement = formatRequirement(
    masterEoaGasRequirementInWei,
  );

  /** Internal implementation for getting master Safe OLAS balance */
  const _getMasterSafeOlasBalanceOfCalc = useCallback(
    (chainId: EvmChainId) => {
      const masterSafeForProvidedChain = masterSafes?.find(
        (wallet) => wallet.evmChainId === chainId,
      );
      if (isNil(masterSafeForProvidedChain?.address)) return;
      if (isNil(allMasterWalletBalances)) return;
      const balances = compact(
        allMasterWalletBalances?.filter(
          ({ walletAddress, symbol, evmChainId }) =>
            symbol === TokenSymbolMap.OLAS &&
            evmChainId === chainId &&
            areAddressesEqual(
              walletAddress,
              masterSafeForProvidedChain.address,
            ),
        ),
      );
      return sumBigNumbers(
        compact(balances.map(({ balanceString }) => balanceString)),
      );
    },
    [allMasterWalletBalances, masterSafes],
  );

  /** Get the master Safe balances as WalletBalance[] */
  const getMasterSafeBalancesOf = useCallback(
    (chainId: EvmChainId) => {
      const masterSafeForProvidedChain = masterSafes?.find(
        (wallet) => wallet.evmChainId === chainId,
      );
      if (isNil(masterSafeForProvidedChain)) return [];
      if (isNil(allMasterWalletBalances)) return [];
      return allMasterWalletBalances.filter(
        ({ walletAddress, evmChainId }) =>
          chainId === evmChainId &&
          areAddressesEqual(walletAddress, masterSafeForProvidedChain.address),
      );
    },
    [masterSafes, allMasterWalletBalances],
  );

  /** Get the master Safe OLAS balance as a string */
  const getMasterSafeOlasBalanceOfInStr = useCallback(
    (chainId: EvmChainId) => {
      return _getMasterSafeOlasBalanceOfCalc(chainId);
    },
    [_getMasterSafeOlasBalanceOfCalc],
  );

  // TODO: why this returns an array if there can be only 1 wallet per chain with native balance?
  /** Get the master Safe native balances for a chain */
  const getMasterSafeNativeBalanceOf = useCallback(
    (chainId: EvmChainId) => {
      const masterSafeForProvidedChain = masterSafes?.find(
        (wallet) => wallet.evmChainId === chainId,
      );
      if (isNil(masterSafeForProvidedChain?.address)) return;
      if (isNil(allMasterWalletBalances)) return;
      return allMasterWalletBalances.filter(
        ({ walletAddress, evmChainId, isNative, isWrappedToken }) =>
          evmChainId === chainId &&
          isNative &&
          !isWrappedToken &&
          areAddressesEqual(walletAddress, masterSafeForProvidedChain.address),
      );
    },
    [masterSafes, allMasterWalletBalances],
  );

  const getMasterSafeErc20BalancesCalc = useCallback(
    (chainId: EvmChainId) => {
      const masterSafeForProvidedChain = masterSafes?.find(
        (wallet) => wallet.evmChainId === chainId,
      );
      if (isNil(masterSafeForProvidedChain?.address)) return;
      if (isNil(allMasterWalletBalances)) return;
      const balances = allMasterWalletBalances.filter(
        ({ walletAddress, evmChainId, symbol, isNative }) => {
          return (
            evmChainId === chainId &&
            !isNative &&
            symbol !== TokenSymbolMap.OLAS &&
            areAddressesEqual(walletAddress, masterSafeForProvidedChain.address)
          );
        },
      );
      return balances.reduce((untypedAcc, { balanceString, symbol }) => {
        const acc = untypedAcc as Record<TokenSymbol, string>;
        if (!acc[symbol]) acc[symbol] = '0';
        acc[symbol] = sumBigNumbers([acc[symbol], balanceString ?? '0']);
        return untypedAcc;
      }, {});
    },
    [masterSafes, allMasterWalletBalances],
  );

  const getMasterSafeErc20BalancesInStr = useCallback(
    (chainId: EvmChainId) => {
      return getMasterSafeErc20BalancesCalc(chainId) as Optional<
        Record<TokenSymbol, string>
      >;
    },
    [getMasterSafeErc20BalancesCalc],
  );

  return {
    isLoaded,

    // master safe
    getMasterSafeNativeBalanceOf,
    getMasterSafeOlasBalanceOfInStr,
    getMasterSafeErc20BalancesInStr,
    getMasterSafeBalancesOf,

    // master eoa
    isMasterEoaLowOnGas: requiresFund(masterEoaGasRequirementInWei),
    masterEoaGasRequirement,
    getMasterEoaNativeBalanceOf,
    getMasterEoaBalancesOf,
  };
};
