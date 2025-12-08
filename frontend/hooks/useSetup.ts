import { useCallback, useContext, useEffect } from 'react';

import { SetupScreen } from '@/constants';
import { SetupContext } from '@/context/SetupProvider';
import { Address } from '@/types/Address';
import { BackupWalletType } from '@/types/BackupWallet';

import { useElectronApi } from './useElectronApi';
import { useStore } from './useStore';

export const useSetup = () => {
  const { setupObject, setSetupObject } = useContext(SetupContext);
  const { store } = useElectronApi();
  const { storeState } = useStore();

  const goto = useCallback(
    (state: SetupScreen) => {
      setSetupObject((prev) => ({ ...prev, state, prevState: prev.state }));
    },
    [setSetupObject],
  );

  const setBackupSigner = useCallback(
    ({ address, type }: { address: Address; type: BackupWalletType }) => {
      store?.set?.('lastProvidedBackupWallet', { address, type });
    },
    [store],
  );

  // Syncs the setup object with the stored backup wallet.
  // This ensures the correct value is restored both when updated manually
  // and when the app restarts - in case it was closed in the middle of onboarding
  useEffect(() => {
    const walletAddress = storeState?.lastProvidedBackupWallet?.address;
    const walletType = storeState?.lastProvidedBackupWallet?.type;
    if (walletAddress && walletType) {
      setSetupObject((prev) =>
        Object.assign(prev, {
          backupSigner: { address: walletAddress, type: walletType },
        }),
      );
    }
  }, [setSetupObject, storeState?.lastProvidedBackupWallet]);

  return {
    ...setupObject,
    setBackupSigner,
    goto,
  };
};
