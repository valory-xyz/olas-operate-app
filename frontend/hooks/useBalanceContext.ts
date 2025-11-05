import { compact, get, isEmpty, isNil } from 'lodash';
import { useCallback, useContext, useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { AddressZero } from '@/constants/address';
import { EvmChainId } from '@/constants/chains';
import { TokenSymbol, TokenSymbolMap } from '@/constants/token';
import { BalanceContext } from '@/context/BalanceProvider/BalanceProvider';
import { WalletBalance } from '@/types/Balance';
import { Maybe, Optional } from '@/types/Util';
import { areAddressesEqual, formatUnitsToNumber, sumBigNumbers } from '@/utils';

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

  const { agentAddresses, serviceSafes, serviceEoa } =
    useService(serviceConfigId);
  const { walletBalances, stakedBalances } = useBalanceContext();

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
  };
};

// TODO: move to a separate file
// TODO: refactor so the separation of balances for selectedAgent
// and all wallets across chains is clearer
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
            areAddressesEqual(walletAddress, masterSafeAddress) &&
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
   * Only contains wallets related to the selected agent's home chain id
   */
  const masterWalletBalances = useMemo<Optional<WalletBalance[]>>(() => {
    return [...(masterSafeBalances || []), ...(masterEoaBalances || [])];
  }, [masterEoaBalances, masterSafeBalances]);

  /**
   * Unstaked balances across all master safes and eoas
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

  /** master EOA native balance of selected agent home chain */
  const masterEoaNativeBalance: Optional<number> = useMemo(() => {
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

  /** Internal implementation for getting master EOA native balance */
  const _getMasterEoaNativeBalanceOfCalc = useCallback(
    (chainId: EvmChainId, returnType: 'string' | 'number') => {
      if (!chainId) return;
      if (isNil(masterEoa)) return;
      if (isNil(allMasterWalletBalances)) return;

      const balances = allMasterWalletBalances.filter(
        ({ walletAddress, isNative, evmChainId }) =>
          isNative &&
          chainId === evmChainId &&
          areAddressesEqual(walletAddress, masterEoa.address),
      );

      if (returnType === 'string') {
        return sumBigNumbers(
          compact(balances.map(({ balanceString }) => balanceString)),
        );
      }

      return balances.reduce((acc, { balance }) => acc + balance, 0);
    },
    [masterEoa, allMasterWalletBalances],
  );

  /** Get the master EOA native balance as a number */
  const getMasterEoaNativeBalanceOf = useCallback(
    (chainId: EvmChainId) => {
      return _getMasterEoaNativeBalanceOfCalc(
        chainId,
        'number',
      ) as Optional<number>;
    },
    [_getMasterEoaNativeBalanceOfCalc],
  );

  /** Get the master EOA native balance as a string */
  const getMasterEoaNativeBalanceOfInStr = useCallback(
    (chainId: EvmChainId) => {
      return _getMasterEoaNativeBalanceOfCalc(
        chainId,
        'string',
      ) as Optional<string>;
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

  /** Get the master Safe OLAS balance of a currently selected agent */
  const masterSafeOlasBalance = masterWalletBalances
    ?.filter(
      ({ symbol, evmChainId }) =>
        symbol === TokenSymbolMap.OLAS &&
        selectedAgentConfig.requiresMasterSafesOn.includes(evmChainId),
    )
    .reduce((acc, balance) => acc + balance.balance, 0);

  /** Internal implementation for getting master Safe OLAS balance */
  const _getMasterSafeOlasBalanceOfCalc = useCallback(
    (chainId: EvmChainId, type: 'string' | 'number') => {
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

      if (type === 'string') {
        return sumBigNumbers(
          compact(balances.map(({ balanceString }) => balanceString)),
        );
      }
      return balances.reduce((acc, { balance }) => acc + balance, 0);
    },
    [allMasterWalletBalances, masterSafes],
  );

  /** Get the master Safe OLAS balance as a string */
  const getMasterSafeOlasBalanceOfInStr = useCallback(
    (chainId: EvmChainId) => {
      return _getMasterSafeOlasBalanceOfCalc(
        chainId,
        'string',
      ) as Optional<string>;
    },
    [_getMasterSafeOlasBalanceOfCalc],
  );

  /** Get the master Safe balances as WalletBalance[] */
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

  const masterSafeNativeBalance = useMemo(
    () => getMasterSafeNativeBalanceOf(evmHomeChainId),
    [getMasterSafeNativeBalanceOf, evmHomeChainId],
  );

  const getMasterSafeErc20BalancesCalc = useCallback(
    (chainId: EvmChainId, type: 'string' | 'number') => {
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

      const initialAcc =
        type === 'string'
          ? ({} as Record<TokenSymbol, string>)
          : ({} as Record<TokenSymbol, number>);

      return balances.reduce(
        (untypedAcc, { balanceString, balance, symbol }) => {
          if (type === 'string') {
            const acc = untypedAcc as Record<TokenSymbol, string>;
            if (!acc[symbol]) acc[symbol] = '0';
            acc[symbol] = sumBigNumbers([acc[symbol], balanceString ?? '0']);
          } else {
            const acc = untypedAcc as Record<TokenSymbol, number>;
            if (!acc[symbol]) acc[symbol] = 0;
            acc[symbol] += balance;
          }
          return untypedAcc;
        },
        initialAcc,
      );
    },
    [masterSafes, allMasterWalletBalances],
  );

  const getMasterSafeErc20BalancesInStr = useCallback(
    (chainId: EvmChainId) => {
      return getMasterSafeErc20BalancesCalc(chainId, 'string') as Optional<
        Record<TokenSymbol, string>
      >;
    },
    [getMasterSafeErc20BalancesCalc],
  );

  const masterSafeErc20Balances = useMemo(
    () => getMasterSafeErc20BalancesCalc(evmHomeChainId, 'number'),
    [getMasterSafeErc20BalancesCalc, evmHomeChainId],
  );

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
    getMasterSafeNativeBalanceOf,
    masterSafeOlasBalance,
    getMasterSafeOlasBalanceOfInStr,
    masterSafeErc20Balances,
    getMasterSafeErc20BalancesInStr,

    // master eoa
    masterEoaNativeGasBalance: masterEoaNative?.balance,
    isMasterEoaLowOnGas: requiresFund(masterEoaGasRequirementInWei),
    masterEoaGasRequirement,
    masterEoaBalances,
    masterEoaNativeBalance,
    getMasterEoaNativeBalanceOf,
    getMasterEoaNativeBalanceOfInStr,
    getMasterEoaBalancesOf,
  };
};
