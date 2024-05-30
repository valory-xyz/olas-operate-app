/**
 * placeholder incase required, currently not used
 */

import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useInterval } from 'usehooks-ts';

import { GnosisSafeService } from '@/service/GnosisSafe';
import { Address } from '@/types';

import { OnlineStatusContext } from './OnlineStatusProvider';
import { WalletContext } from './WalletProvider';

export const MasterSafeContext = createContext<{
  backupSafeAddress?: Address;
  masterSafeAddress?: Address;
  masterEoaAddress?: Address;
  masterSafeOwners?: Address[];
  updateMasterSafeOwners?: () => Promise<void>;
}>({
  backupSafeAddress: undefined,
  masterSafeAddress: undefined,
  masterEoaAddress: undefined,
  masterSafeOwners: undefined,
  updateMasterSafeOwners: async () => {},
});

export const MasterSafeProvider = ({ children }: PropsWithChildren) => {
  const { isOnline } = useContext(OnlineStatusContext);
  const { masterSafeAddress, masterEoaAddress } = useContext(WalletContext);

  const [masterSafeOwners, setMasterSafeOwners] = useState<Address[]>();

  const backupSafeAddress = useMemo<Address | undefined>(() => {
    if (!masterEoaAddress) return;
    if (!masterSafeOwners) return;
    if (!masterSafeOwners.length) return;
    if (!masterSafeOwners.includes(masterEoaAddress)) {
      console.error('Safe not owned by master EOA');
      return;
    }

    const currentBackupAddress = masterSafeOwners.find(
      (address) => address !== masterEoaAddress,
    );

    return currentBackupAddress;
  }, [masterEoaAddress, masterSafeOwners]);

  const updateMasterSafeOwners = async () => {
    if (!masterSafeAddress) return;
    try {
      const safeSigners = await GnosisSafeService.getOwners({
        address: masterSafeAddress,
      });
      if (!safeSigners) return;
      setMasterSafeOwners(safeSigners);
    } catch (error) {
      console.error('Error fetching safe owners', error);
    }
  };

  useInterval(
    updateMasterSafeOwners,
    (masterSafeOwners && masterSafeOwners.length >= 2) || !isOnline
      ? null
      : 5000,
  );

  return (
    <MasterSafeContext.Provider
      value={{
        backupSafeAddress,
        masterSafeOwners,
        masterSafeAddress,
        masterEoaAddress,
        updateMasterSafeOwners,
      }}
    >
      {children}
    </MasterSafeContext.Provider>
  );
};
