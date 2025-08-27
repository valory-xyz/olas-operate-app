import { useMultisigs } from './useMultisig';
import { useSetup } from './useSetup';
import { useMasterWalletContext } from './useWallet';

/**
 * Hook to get the backup signer address.
 */
export const useBackupSigner = () => {
  const { backupSigner } = useSetup();
  const { masterSafes } = useMasterWalletContext();
  const { allBackupAddresses } = useMultisigs(masterSafes);

  const backupSignerAddress = backupSigner?.address ?? allBackupAddresses[0];
  return backupSignerAddress;
};
