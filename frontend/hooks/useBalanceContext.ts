import { get, isEmpty, isNil } from 'lodash';
import { useContext, useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { AddressZero } from '@/constants/address';
import { BalanceContext } from '@/context/BalanceProvider/BalanceProvider';
import { WalletBalance } from '@/types/Balance';
import { Maybe, Optional } from '@/types/Util';
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

/**
 * Balances relevant to a specific service (agent)
 * @param serviceConfigId
 * @returns
 */
export const useServiceBalances = (serviceConfigId: string | undefined) => {
  const { selectedAgentConfig } = useServices();

  const { flatAddresses, serviceSafes, serviceEoa } =
    useService(serviceConfigId);
  const { walletBalances, stakedBalances } = useBalanceContext();

  /**
   * Staked balances, only relevant to safes
   */
  const serviceStakedBalances = useMemo(
    () =>
      stakedBalances?.filter((balance) =>
        flatAddresses.includes(balance.walletAddress),
      ),
    [flatAddresses, stakedBalances],
  );

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

  return {
    serviceWalletBalances,
    serviceStakedBalances,
    serviceSafeBalances,
    serviceEoaBalances,
    serviceSafeNative,
    isServiceSafeLowOnNativeGas: requiresFund(
      serviceSafeNativeGasRequirementInWei,
    ),
  };
};

/**
 * Balances relevant to the master wallets, eoa, and safes
 * @note master wallets are *shared* wallets across all services
 * @note master safe addresses are deterministic, and should be the same
 */
export const useMasterBalances = () => {
  const { selectedAgentConfig } = useServices();
  const { masterSafes, masterEoa } = useMasterWalletContext();
  const { isLoaded, walletBalances } = useBalanceContext();

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
      walletBalances?.filter(
        ({ walletAddress }) => walletAddress === masterEoa?.address,
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

  return {
    isLoaded,
    masterWalletBalances,

    // master safe
    masterSafeBalances,
    isMasterSafeLowOnNativeGas: requiresFund(
      masterSafeNativeGasRequirementInWei,
    ),
    masterSafeNativeGasRequirement,
    masterSafeNativeGasBalance: masterSafeNative?.balance,

    // master eoa
    masterEoaNativeGasBalance: masterEoaNative?.balance,
    isMasterEoaLowOnGas: requiresFund(masterEoaGasRequirementInWei),
    masterEoaGasRequirement,
    masterEoaBalances,
  };
};
