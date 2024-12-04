import { useContext, useMemo } from 'react';

import { CHAIN_CONFIG } from '@/config/chains';
import { BalanceContext, WalletBalanceResult } from '@/context/BalanceProvider';
import { Optional } from '@/types/Util';

import { useService } from './useService';
import { useServices } from './useServices';
import { useMasterWalletContext } from './useWallet';

export const useBalanceContext = () => useContext(BalanceContext);

/**
 * Balances relevant to a specific service (agent)
 * @param serviceConfigId
 * @returns
 */
export const useServiceBalances = (serviceConfigId: string | undefined) => {
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
  const serviceSafeBalances = useMemo<Optional<WalletBalanceResult[]>>(
    () =>
      walletBalances?.filter((balance) =>
        serviceSafes.find(({ address }) => balance.walletAddress === address),
      ),
    [serviceSafes, walletBalances],
  );

  /**
   * Cross-chain unstaked balances in service eoa (signer)
   */
  const serviceEoaBalances = useMemo<Optional<WalletBalanceResult[]>>(
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
  const serviceWalletBalances = useMemo<Optional<WalletBalanceResult[]>>(() => {
    let result;
    if (serviceSafeBalances || serviceEoaBalances) {
      result = [...(serviceSafeBalances || []), ...(serviceEoaBalances || [])];
    }
    return result;
  }, [serviceEoaBalances, serviceSafeBalances]);

  return {
    serviceWalletBalances,
    serviceStakedBalances,
    serviceSafeBalances,
    serviceEoaBalances,
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
  const { walletBalances } = useBalanceContext();

  // TODO: unused, check only services stake?
  // const masterStakedBalances = useMemo(
  //   () =>
  //     stakedBalances?.filter((balance) =>
  //       masterSafes?.find((safe) => safe.address === balance.walletAddress),
  //     ),
  //   [masterSafes, stakedBalances],
  // );

  const masterSafeBalances = useMemo<Optional<WalletBalanceResult[]>>(
    () =>
      walletBalances?.filter(({ walletAddress }) =>
        masterSafes?.find(
          ({ address: masterSafeAddress }) =>
            walletAddress === masterSafeAddress,
        ),
      ),
    [masterSafes, walletBalances],
  );

  const masterEoaBalances = useMemo<Optional<WalletBalanceResult[]>>(
    () =>
      walletBalances?.filter(
        ({ walletAddress }) => walletAddress === masterEoa?.address,
      ),
    [masterEoa?.address, walletBalances],
  );

  /**
   * Unstaked balances across master safes and eoas
   */
  const masterWalletBalances = useMemo<Optional<WalletBalanceResult[]>>(() => {
    let result;
    if (masterSafeBalances || masterEoaBalances) {
      result = [...(masterSafeBalances || []), ...(masterEoaBalances || [])];
    }
    return result;
  }, [masterEoaBalances, masterSafeBalances]);

  const isMasterSafeLowOnNativeGas = useMemo(() => {
    if (!masterSafeBalances) return;
    if (!selectedAgentConfig?.evmHomeChainId) return;

    const homeChainNativeToken =
      CHAIN_CONFIG[selectedAgentConfig?.evmHomeChainId].nativeToken;

    const nativeGasBalance = masterSafeBalances.find(
      (walletBalance) =>
        walletBalance.isNative &&
        walletBalance.evmChainId === selectedAgentConfig.evmHomeChainId &&
        walletBalance.symbol === homeChainNativeToken.symbol,
    );

    if (!nativeGasBalance) return;

    const agentNativeGasRequirement =
      selectedAgentConfig.agentSafeFundingRequirements?.[
        homeChainNativeToken.symbol
      ];

    return nativeGasBalance.balance < agentNativeGasRequirement;
  }, [
    masterSafeBalances,
    selectedAgentConfig.agentSafeFundingRequirements,
    selectedAgentConfig.evmHomeChainId,
  ]);

  return {
    masterWalletBalances,
    masterSafeBalances,
    masterEoaBalances,
    isMasterSafeLowOnNativeGas,
  };
};
