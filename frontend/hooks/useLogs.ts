import { useMemo } from 'react';

import { EvmChainId } from '@/enums/Chain';
import { Eoa, WalletType } from '@/enums/Wallet';
import { Address } from '@/types/Address';
import { Service } from '@/types/Service';
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
    isFetched: masterWalletsIsFetched,
  } = useMasterWalletContext();

  const { masterSafesOwners, masterSafesOwnersIsFetched } =
    useMultisigs(masterSafes);

  const backupEoas = useMemo<Optional<Eoa[]>>(() => {
    if (!masterEoa) return;
    if (!masterSafesOwners) return;

    const result = masterSafesOwners
      .map((masterSafeOwners) => {
        const { owners, safeAddress, evmChainId } = masterSafeOwners;
        return owners
          .filter((owner): owner is Address => owner !== masterEoa.address)
          .map<Eoa>((address) => ({
            address,
            type: WalletType.EOA,
            safeAddress,
            evmChainId,
          }));
      })
      .flat();

    return result;
  }, [masterSafesOwners, masterEoa]);

  return {
    isLoaded: masterWalletsIsFetched && masterSafesOwnersIsFetched,
    data: [
      { masterEoa: masterEoa ?? 'undefined' },
      {
        masterSafes:
          masterSafes?.find((safe) => safe.evmChainId === EvmChainId.Gnosis) ??
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
  const { services, isFetched: isLoaded, selectedService } = useServices();
  // const { getQueryData } = useQueryClient();

  return {
    isLoaded,
    data: {
      services:
        services?.map((item: Service) => ({
          ...item,
          keys: item.keys.map((key) => key.address),
          deploymentStatus:
            selectedService?.service_config_id === item.service_config_id
              ? selectedService.deploymentStatus
              : item.deploymentStatus,
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
