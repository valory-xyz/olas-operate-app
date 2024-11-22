import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { REACT_QUERY_KEYS } from '@/constants/react-query-keys';
import { ChainId } from '@/enums/Chain';
import { Eoa, WalletType } from '@/enums/Wallet';
import { Address } from '@/types/Address';
import { Optional } from '@/types/Util';

import { useBalanceContext } from './useBalanceContext';
import { useMultisigs } from './useMultisig';
import { useServices } from './useServices';
import { useStore } from './useStore';
import { useMasterWalletContext } from './useWallet';

const useAddressesLogs = () => {
  const {
    masterSafes,
    masterEoa,
    isFetching: masterWalletsIsFetching,
  } = useMasterWalletContext();

  const { owners: allMasterSafeOwners, ownersIsPending } =
    useMultisigs(masterSafes);

  const backupEoas = useMemo<Optional<Eoa[]>>(() => {
    if (!masterEoa) return;
    if (!allMasterSafeOwners) return;

    const result = allMasterSafeOwners
      .map(({ owners }) =>
          .filter((owner): owner is Address => owner !== masterEoa.address)
          .map<Eoa>((owner) => ({
            address: owner,
            type: WalletType.EOA,
            safeAddress: owners.safeAddress,
            chainId: owners.chainId,
          })),
      )
      .flat();

    return result;
  }, [allMasterSafeOwners, masterEoa]);

  return {
    isLoaded: masterWalletsIsFetching && ownersIsPending,
    data: [
      { masterEoa: masterEoa ?? 'undefined' },
      {
        masterSafes:
          masterSafes?.find((safe) => safe.chainId === ChainId.Gnosis) ??
          'undefined',
      },
      { masterSafeBackups: backupEoas ?? 'undefined' },
    ],
  };
};

const useBalancesLogs = () => {
  const { masterWallets } = useMasterWalletContext();
  const {
    isLoaded: isBalanceLoaded,
    totalEthBalance,
    totalOlasBalance,
    walletBalances,
    totalStakedOlasBalance: totalOlasStakedBalance,
  } = useBalanceContext();

  return {
    isLoaded: isBalanceLoaded,
    data: [
      { masterWallets: masterWallets ?? 'undefined' },
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
