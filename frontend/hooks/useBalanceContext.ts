import { useContext, useMemo } from 'react';

import { BalanceContext, WalletBalanceResult } from '@/context/BalanceProvider';

import { useService } from './useService';
import { useMasterWalletContext } from './useWallet';

export const useBalanceContext = () => useContext(BalanceContext);

/**
 * Balances relevant to a specific service (agent)
 * @param serviceConfigId
 * @returns
 */
export const useServiceBalances = (serviceConfigId: string | undefined) => {
  const { flatAddresses, serviceSafes, serviceEoa } = useService({
    serviceConfigId,
  });
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
  const serviceSafeBalances = useMemo<WalletBalanceResult[]>(
    () =>
      walletBalances?.filter((balance) =>
        serviceSafes.find(({ address }) => balance.walletAddress === address),
      ),
    [serviceSafes, walletBalances],
  );

  /**
   * Cross-chain unstaked balances in service eoa (signer)
   */
  const serviceEoaBalances = useMemo<WalletBalanceResult[]>(
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
  const serviceWalletBalances = useMemo(
    () => [...serviceSafeBalances, ...serviceEoaBalances],
    [serviceEoaBalances, serviceSafeBalances],
  );

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

  // TODO: use flatAddresses for consistency
  const masterSafeBalances = useMemo<WalletBalanceResult[]>(
    () =>
      walletBalances?.filter((balance) =>
        masterSafes?.find(({ address }) => balance.walletAddress === address),
      ),
    [masterSafes, walletBalances],
  );

  const masterEoaBalances = useMemo<WalletBalanceResult[]>(
    () =>
      walletBalances?.filter(
        (balance) => balance.walletAddress === masterEoa?.address,
      ),
    [masterEoa?.address, walletBalances],
  );

  /**
   * Unstaked balances across master safes and eoas
   */
  const masterWalletBalances = useMemo(
    () => [...masterSafeBalances, ...masterEoaBalances],
    [masterEoaBalances, masterSafeBalances],
  );

  return {
    masterWalletBalances,
    masterSafeBalances,
    masterEoaBalances,
  };
};
