import { useMemo } from 'react';

import { DeploymentStatus } from '@/client';

import { useBalance } from './useBalance';
import { useMasterSafe } from './useMasterSafe';
import { useServices } from './useServices';
import { useStore } from './useStore';
import { useWallet } from './useWallet';

const useAddressesLogs = () => {
  const { wallets, masterEoaAddress, masterSafeAddress } = useWallet();

  const { backupSafeAddress, masterSafeOwners } = useMasterSafe();

  return {
    isLoaded: wallets?.length !== 0 && !!masterSafeOwners,
    data: [
      { backupSafeAddress: backupSafeAddress ?? 'undefined' },
      { masterSafeAddress: masterSafeAddress ?? 'undefined' },
      { masterEoaAddress: masterEoaAddress ?? 'undefined' },
      { masterSafeOwners: masterSafeOwners ?? 'undefined' },
    ],
  };
};

const useBalancesLogs = () => {
  const {
    isBalanceLoaded,
    totalEthBalance,
    totalOlasBalance,
    wallets,
    walletBalances,
    totalOlasStakedBalance,
  } = useBalance();

  return {
    isLoaded: isBalanceLoaded,
    data: [
      { wallets: wallets ?? 'undefined' },
      { walletBalances: walletBalances ?? 'undefined' },
      { totalOlasStakedBalance: totalOlasStakedBalance ?? 'undefined' },
      { totalEthBalance: totalEthBalance ?? 'undefined' },
      { totalOlasBalance: totalOlasBalance ?? 'undefined' },
    ],
  };
};

const useServicesLogs = () => {
  const { serviceStatus, services, hasInitialLoaded } = useServices();

  return {
    isLoaded: hasInitialLoaded,
    data: {
      serviceStatus: serviceStatus
        ? DeploymentStatus[serviceStatus]
        : 'undefined',
      services:
        services?.map((item) => ({
          ...item,
          keys: item.keys.map((key) => key.address),
        })) ?? 'undefined',
    },
  };
};

export const useLogs = () => {
  const { storeState } = useStore();

  const { isLoaded: isServicesLoaded, data: services } = useServicesLogs();
  const { isLoaded: isBalancesLoaded, data: balances } = useBalancesLogs();
  const { isLoaded: isAddressesLoaded, data: addresses } = useAddressesLogs();

  const logs = useMemo(() => {
    if (isServicesLoaded && isBalancesLoaded && isAddressesLoaded) {
      return {
        store: storeState,
        debugData: {
          services,
          addresses,
          balances,
        },
      };
    }
  }, [
    addresses,
    balances,
    isAddressesLoaded,
    isBalancesLoaded,
    isServicesLoaded,
    services,
    storeState,
  ]);

  return logs;
};
