import { find, get, groupBy, isEmpty, isNil } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbolMap } from '@/constants/token';
import { BalanceContext } from '@/context/BalanceProvider/BalanceProvider';
import { WalletBalance } from '@/types/Balance';
import { Maybe, Optional } from '@/types/Util';
import { areAddressesEqual } from '@/utils/address';
import { formatUnitsToNumber } from '@/utils/numberFormatters';

import { useBalanceAndRefillRequirementsContext } from './useBalanceAndRefillRequirementsContext';
import { useService } from './useService';
import { useServices } from './useServices';
import { useMasterWalletContext } from './useWallet';

/**
 * Function to check if a balance requires funding
 * ie, greater than 0
 */
const requiresFund = (balance: Maybe<number>) => {
  if (isNil(balance)) return false;
  return isFinite(balance) && balance > 0;
};

export const useBalanceContext = () => useContext(BalanceContext);

const useRefillRequirement = (wallet?: WalletBalance) => {
  const { refillRequirements } = useBalanceAndRefillRequirementsContext();

  if (isEmpty(refillRequirements) || isEmpty(wallet)) return;

  const requirement = get(refillRequirements, [
    wallet.walletAddress,
    AddressZero,
  ]);

  if (isNil(requirement)) return;
  return requirement;
};

const formatRequirement = (requirement: number | undefined) => {
  if (isNil(requirement)) return;
  return formatUnitsToNumber(`${requirement}`);
};

// TODO: move to a separate file
/**
 * Balances relevant to a specific service (agent)
 * @param serviceConfigId
 * @returns
 */
export const useServiceBalances = (serviceConfigId: string | undefined) => {
  const { selectedAgentConfig } = useServices();

  const { allAgentAddresses, serviceSafes, serviceEoa } =
    useService(serviceConfigId);
  const { walletBalances, stakedBalances } = useBalanceContext();

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;

  /**
   * Staked balances, only relevant to safes
   */
  const serviceStakedBalances = useMemo(() => {
    if (!stakedBalances) return;
    return stakedBalances.filter(({ walletAddress }) =>
      allAgentAddresses.includes(walletAddress),
    );
  }, [allAgentAddresses, stakedBalances]);

  /**
   * Cross-chain unstaked balances in service safes
   */
  const serviceSafeBalances = useMemo<Optional<WalletBalance[]>>(
    () =>
      walletBalances?.filter((balance) =>
        serviceSafes.find(({ address }) => balance.walletAddress === address),
      ),
    [serviceSafes, walletBalances],
  );

  /**
   * Cross-chain unstaked balances in service eoa (signer)
   */
  const serviceEoaBalances = useMemo<Optional<WalletBalance[]>>(
    () =>
      walletBalances?.filter(
        (balance) => balance.walletAddress === serviceEoa?.address,
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

  /**
   * service safe native balance requirement
   */
  const serviceSafeNativeGasRequirementInWei =
    useRefillRequirement(serviceSafeNative);

  const serviceSafeNativeBalances = useMemo(() => {
    if (!serviceSafeBalances) return null;

    const nativeBalances = serviceSafeBalances.filter(
      ({ evmChainId }) => evmChainId === evmHomeChainId,
    );

    /**
     * Native balances with wrapped token balances
     * @example { xDai: 100, Wrapped xDai: 50 } => { xDai: 150 }
     */
    const groupedNativeBalances = Object.entries(
      groupBy(nativeBalances, 'walletAddress'),
    ).map(([address, items]) => {
      const nativeTokenBalance = find(items, { isNative: true })?.balance || 0;
      const wrappedBalance =
        find(items, { isWrappedToken: true })?.balance || 0;
      const totalBalance = nativeTokenBalance + wrappedBalance;

      return {
        ...items[0],
        walletAddress: address,
        balance: totalBalance,
      } as WalletBalance;
    });

    return groupedNativeBalances;
  }, [serviceSafeBalances, evmHomeChainId]);

  /** service safe native balances for current chain */
  const serviceSafeErc20Balances = useMemo(
    () =>
      serviceSafeBalances?.filter(
        ({ isNative, symbol, evmChainId, isWrappedToken }) =>
          !isNative &&
          symbol !== TokenSymbolMap.OLAS &&
          !isWrappedToken &&
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
    isServiceSafeLowOnNativeGas: requiresFund(
      serviceSafeNativeGasRequirementInWei,
    ),
    serviceSafeNativeBalances,
    serviceSafeErc20Balances,
    serviceEoaNativeBalance,
  };
};

// TODO: move to a separate file
/**
 * Balances relevant to the master wallets, eoa, and safes
 * @note master wallets are *shared* wallets across all services
 * @note master safe addresses are deterministic, and should be the same
 */
export const useMasterBalances = () => {
  const { selectedAgentConfig } = useServices();
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { isLoaded, walletBalances } = useBalanceContext();

  const evmHomeChainId = selectedAgentConfig?.evmHomeChainId;
  const masterSafeBalances = useMemo<Optional<WalletBalance[]>>(
    () =>
      walletBalances?.filter(({ walletAddress }) =>
        masterSafes?.find(
          ({ address: masterSafeAddress, evmChainId }) =>
            walletAddress === masterSafeAddress &&
            selectedAgentConfig.requiresAgentSafesOn.includes(evmChainId),
        ),
      ),
    [masterSafes, walletBalances, selectedAgentConfig.requiresAgentSafesOn],
  );

  const masterEoaBalances = useMemo<Optional<WalletBalance[]>>(
    () =>
      walletBalances?.filter(({ walletAddress }) =>
        areAddressesEqual(walletAddress, masterEoa?.address),
      ),
    [masterEoa?.address, walletBalances],
  );

  /**
   * Unstaked balances across master safes and eoas
   */
  const masterWalletBalances = useMemo<Optional<WalletBalance[]>>(() => {
    return [...(masterSafeBalances || []), ...(masterEoaBalances || [])];
  }, [masterEoaBalances, masterSafeBalances]);

  const homeChainNativeToken = useMemo(() => {
    if (!selectedAgentConfig?.evmHomeChainId) return;
    return CHAIN_CONFIG[selectedAgentConfig.evmHomeChainId].nativeToken;
  }, [selectedAgentConfig.evmHomeChainId]);

  const masterSafeNative = useMemo(() => {
    if (!masterSafeBalances) return;
    if (!selectedAgentConfig?.evmHomeChainId) return;
    if (!homeChainNativeToken) return;

    return masterSafeBalances.find(
      ({ isNative, evmChainId, symbol }) =>
        isNative &&
        evmChainId === selectedAgentConfig.evmHomeChainId &&
        symbol === homeChainNativeToken.symbol,
    );
  }, [
    masterSafeBalances,
    selectedAgentConfig.evmHomeChainId,
    homeChainNativeToken,
  ]);

  /**
   * master safe native balance requirement
   */
  const masterSafeNativeGasRequirementInWei =
    useRefillRequirement(masterSafeNative);
  const masterSafeNativeGasRequirement = formatRequirement(
    masterSafeNativeGasRequirementInWei,
  );

  /**
   * master EOA balance
   */
  const masterEoaNative = useMemo(() => {
    if (!masterEoaBalances) return;
    if (!selectedAgentConfig?.evmHomeChainId) return;
    if (!homeChainNativeToken) return;

    return masterEoaBalances.find(
      ({ isNative, evmChainId, symbol }) =>
        isNative &&
        evmChainId === selectedAgentConfig.evmHomeChainId &&
        symbol === homeChainNativeToken.symbol,
    );
  }, [
    masterEoaBalances,
    selectedAgentConfig.evmHomeChainId,
    homeChainNativeToken,
  ]);

  /**
   * master EOA balance requirement
   */
  const masterEoaGasRequirementInWei = useRefillRequirement(masterEoaNative);
  const masterEoaGasRequirement = formatRequirement(
    masterEoaGasRequirementInWei,
  );

  /** master EOA balance of selected agent home chain */
  const masterEoaBalance: Optional<number> = useMemo(() => {
    if (!selectedAgentConfig.evmHomeChainId) return;
    if (isNil(masterEoa)) return;
    if (isNil(masterWalletBalances)) return;

    return masterWalletBalances
      .filter(
        ({ walletAddress, isNative, evmChainId }) =>
          isNative &&
          selectedAgentConfig.evmHomeChainId === evmChainId &&
          areAddressesEqual(walletAddress, masterEoa.address),
      )
      .reduce((acc, { balance }) => acc + balance, 0);
  }, [masterEoa, masterWalletBalances, selectedAgentConfig.evmHomeChainId]);

  /**
   * Function to get the master EOA balance of a specific chain
   */
  const getMasterEoaBalanceOf = useCallback(
    (chainId: EvmChainId) => {
      if (!chainId) return;
      if (isNil(masterEoa)) return;
      if (isNil(masterWalletBalances)) return;

      return masterWalletBalances
        .filter(
          ({ walletAddress, isNative, evmChainId }) =>
            isNative &&
            chainId === evmChainId &&
            areAddressesEqual(walletAddress, masterEoa.address),
        )
        .reduce((acc, { balance }) => acc + balance, 0);
    },
    [masterEoa, masterWalletBalances],
  );

  const masterSafeOlasBalance = masterWalletBalances
    ?.filter(
      (walletBalance) =>
        walletBalance.symbol === TokenSymbolMap.OLAS &&
        selectedAgentConfig.requiresMasterSafesOn.includes(
          walletBalance.evmChainId,
        ),
    )
    .reduce((acc, balance) => acc + balance.balance, 0);

  const masterSafe = useMemo(() => {
    return masterSafes?.find(({ evmChainId }) => evmChainId === evmHomeChainId);
  }, [masterSafes, evmHomeChainId]);

  const masterSafeNativeBalance: Optional<number> = useMemo(() => {
    if (isNil(masterSafe?.address)) return;
    if (isNil(masterSafeBalances)) return;

    return masterSafeBalances
      .filter(({ walletAddress, evmChainId, isNative, isWrappedToken }) => {
        return (
          evmChainId === evmHomeChainId &&
          isNative &&
          !isWrappedToken &&
          walletAddress === masterSafe.address
        );
      })
      .reduce((acc, { balance }) => acc + balance, 0);
  }, [masterSafeBalances, masterSafe?.address, evmHomeChainId]);

  const masterSafeErc20Balances = useMemo(() => {
    if (isNil(masterSafe?.address)) return;
    if (isNil(masterSafeBalances)) return;

    return masterSafeBalances
      .filter(
        ({ walletAddress, evmChainId, symbol, isNative, isWrappedToken }) => {
          return (
            evmChainId === evmHomeChainId &&
            !isNative &&
            !isWrappedToken &&
            symbol !== TokenSymbolMap.OLAS &&
            walletAddress === masterSafe.address
          );
        },
      )
      .reduce<{ [tokenSymbol: string]: number }>((acc, { balance, symbol }) => {
        if (!acc[symbol]) acc[symbol] = 0;
        acc[symbol] += balance;

        return acc;
      }, {});
  }, [masterSafeBalances, masterSafe?.address, evmHomeChainId]);

  return {
    isLoaded,
    masterWalletBalances,

    // master safe
    masterSafeBalances,
    isMasterSafeLowOnNativeGas: requiresFund(
      masterSafeNativeGasRequirementInWei,
    ),
    masterSafeNativeGasRequirement,
    masterSafeNativeBalance,
    masterSafeNativeGasBalance: masterSafeNative?.balance,
    masterSafeOlasBalance,
    masterSafeErc20Balances,

    // master eoa
    masterEoaNativeGasBalance: masterEoaNative?.balance,
    isMasterEoaLowOnGas: requiresFund(masterEoaGasRequirementInWei),
    masterEoaGasRequirement,
    masterEoaBalances,
    masterEoaBalance,
    getMasterEoaBalanceOf,
  };
};
