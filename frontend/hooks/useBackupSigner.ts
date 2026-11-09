import { useMultisigs } from './useMultisig';
import { useSetup } from './useSetup';
import { useMasterWalletContext } from './useWallet';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

/**
 * Hook to get the backup signer address.
 *
 * While Web3Auth is disabled, a stored Google/Apple pick counts as no backup
 * chosen, so onboarding sends the user back to the backup wallet step. Once a
 * Pearl Safe exists, its on-chain backup owner is used.
 */
export const useBackupSigner = () => {
  const { backupSigner } = useSetup();
  const { masterSafes } = useMasterWalletContext();
  const { allBackupAddresses } = useMultisigs(masterSafes);
  const { isWeb3AuthEnabled, isLoading: isWeb3AuthStatusLoading } =
    useWeb3AuthStatus();

  // Kept while the status loads, so a slow status call never sends users
  // with Web3Auth on back to the backup wallet step.
  const isStoredSignerUsable =
    backupSigner?.type !== 'web3auth' ||
    isWeb3AuthEnabled ||
    isWeb3AuthStatusLoading;

  const backupSignerAddress =
    (isStoredSignerUsable ? backupSigner?.address : undefined) ??
    allBackupAddresses[0];
  return backupSignerAddress;
};
