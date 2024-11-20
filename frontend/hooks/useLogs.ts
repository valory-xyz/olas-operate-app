import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';

import { useBalanceContext } from './useBalanceContext';
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
  } = useBalanceContext();

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
  const { services, isFetched: isLoaded } = useServices();
  const { getQueryData } = useQueryClient();

  return {
    isLoaded: isLoaded,
    data: {
      services:
        services?.map((item) => ({
          ...item,
          keys: item.keys.map((key) => key.address),
          deploymentStatus: getQueryData<string>([
            REACT_QUERY_KEYS.SERVICE_DEPLOYMENT_STATUS_KEY(
              item.service_config_id,
            ),
            item.service_config_id,
          ]),
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
