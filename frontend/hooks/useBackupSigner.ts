import { useMultisigs } from './useMultisig';
import { useSetup } from './useSetup';
import { useMasterWalletContext } from './useWallet';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

/**
 * Hook to get the backup signer address.
 *
 * While Web3Auth is disabled, a stored Google/Apple pick counts as no backup
 * chosen, so onboarding sends the user back to the backup wallet step. Once a
 * Pearl Safe exists, its on-chain backup owner is used as before.
 */
export const useBackupSigner = () => {
  const { backupSigner } = useSetup();
  const { masterSafes } = useMasterWalletContext();
  const { allBackupAddresses } = useMultisigs(masterSafes);
  const { isWeb3AuthEnabled } = useWeb3AuthStatus();

  const isStoredSignerUsable =
    backupSigner?.type !== 'web3auth' || isWeb3AuthEnabled;

  const backupSignerAddress =
    (isStoredSignerUsable ? backupSigner?.address : undefined) ??
    allBackupAddresses[0];
  return backupSignerAddress;
};
