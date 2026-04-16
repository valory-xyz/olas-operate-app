import { useEffect, useMemo, useState } from 'react';

import { WALLET_TYPE } from '@/constants';
import { ELECTRON_NATIVE_KEYS } from '@/context/pearlStoreKeys';
import { Address } from '@/types/Address';
import { ElectronStore } from '@/types/ElectronApi';
import { Service } from '@/types/Service';

import { useBalanceContext } from './useBalanceContext';
import { useElectronApi } from './useElectronApi';
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

  const backupEoas = useMemo(() => {
    if (!masterEoa) return;
    if (!masterSafesOwners) return;

    const result = masterSafesOwners
      .map((masterSafeOwners) => {
        const { owners, safeAddress, evmChainId } = masterSafeOwners;
        return owners
          .filter((owner): owner is Address => owner !== masterEoa.address)
          .map((address) => ({
            address,
            type: WALLET_TYPE.EOA,
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
      { masterSafe: masterSafes ?? 'undefined' },
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

  const formattedServices = useMemo(() => {
    return services?.map((item: Service) => {
      const isSameService =
        selectedService?.service_config_id === item.service_config_id;

      return {
        ...item,
        keys: item?.keys?.map((key) => key.address),
        deploymentStatus: isSameService
          ? selectedService.deploymentStatus
          : item.deploymentStatus,
      };
    });
  }, [services, selectedService]);

  return {
    isLoaded,
    data: { services: formattedServices ?? 'undefined' },
  };
};

/** Read Electron-native keys (environmentName, knownVersion, etc.) via IPC. */
const useElectronStoreLogs = () => {
  const { store } = useElectronApi();
  const [electronStoreData, setElectronStoreData] = useState<ElectronStore>();

  useEffect(() => {
    const storeGet = store?.get;
    if (!storeGet) return;

    const keys = Array.from(ELECTRON_NATIVE_KEYS);
    Promise.all(keys.map((key) => storeGet(key).then((v) => [key, v]))).then(
      (entries) => {
        const data: Record<string, unknown> = {};
        for (const [key, value] of entries) {
          if (value !== undefined && value !== null && value !== '') {
            data[key as string] = value;
          }
        }
        setElectronStoreData(data as ElectronStore);
      },
    );
  }, [store]);

  return electronStoreData;
};

export const useLogs = () => {
  const { storeState } = useStore();
  const electronStoreData = useElectronStoreLogs();

  const { isLoaded: isServicesLoaded, data: services } = useServicesLogs();
  const { isLoaded: isBalancesLoaded, data: balances } = useBalancesLogs();
  const { isLoaded: isAddressesLoaded, data: addresses } = useAddressesLogs();

  const logs = useMemo(() => {
    return {
      store: storeState,
      electronStore: electronStoreData,
      debugData: {
        services: isServicesLoaded ? services : null,
        addresses: isAddressesLoaded ? addresses : null,
        balances: isBalancesLoaded ? balances : null,
      },
    };
  }, [
    electronStoreData,
    isAddressesLoaded,
    isBalancesLoaded,
    isServicesLoaded,
    addresses,
    balances,
    services,
    storeState,
  ]);

  return logs;
};
