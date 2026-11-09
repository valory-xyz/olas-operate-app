import { useEffect, useState } from 'react';

import { SETUP_SCREEN } from '@/constants';

import { useMultisigs } from './useMultisig';
import { useSetup } from './useSetup';
import { useMasterWalletContext } from './useWallet';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

/**
 * The onboarding backup signer. While Web3Auth is off, a stored Google/Apple pick is ignored
 * in favour of the on-chain backup owner. While `isPending`, don't route or create a Safe on it.
 */
export const useBackupSignerState = () => {
  const { backupSigner } = useSetup();
  const { masterSafes, isFetched: areWalletsFetched } =
    useMasterWalletContext();
  const { allBackupAddresses, masterSafesOwnersIsSuccess } =
    useMultisigs(masterSafes);
  const { status } = useWeb3AuthStatus();

  const isWeb3AuthPick = backupSigner?.type === 'web3auth';
  const onChainBackupAddress = allBackupAddresses[0];

  if (!isWeb3AuthPick || status === 'enabled') {
    return {
      backupSignerAddress: backupSigner?.address ?? onChainBackupAddress,
      isPending: false,
      needsNewBackup: false,
    };
  }

  const hasMasterSafe = !!masterSafes?.length;
  // A failed owners read must not pass for "no backup owner on-chain".
  const isPending =
    status === 'loading' ||
    !areWalletsFetched ||
    (hasMasterSafe && !masterSafesOwnersIsSuccess);

  return {
    backupSignerAddress: isPending ? undefined : onChainBackupAddress,
    isPending,
    // With nothing on-chain to fall back to, the user must pick a new backup wallet.
    needsNewBackup: !isPending && !onChainBackupAddress,
  };
};

/** The onboarding backup signer address; see `useBackupSignerState`. */
export const useBackupSigner = () => useBackupSignerState().backupSignerAddress;

/**
 * For onboarding screens that lead to Pearl Safe creation: waits for a settled backup signer
 * and sends a user who needs a new one back to the backup wallet step. Once the screen is
 * ready it stays ready, so a later status refetch never pulls the user out of a funding run
 * or on-ramp already under way.
 */
export const useBackupSignerGuard = () => {
  const { goto } = useSetup();
  const { isPending, needsNewBackup } = useBackupSignerState();
  const isReadyNow = !isPending && !needsNewBackup;
  const [hasBeenReady, setHasBeenReady] = useState(isReadyNow);

  useEffect(() => {
    if (isReadyNow) setHasBeenReady(true);
  }, [isReadyNow]);

  useEffect(() => {
    if (!hasBeenReady && needsNewBackup) goto(SETUP_SCREEN.SetupBackupSigner);
  }, [hasBeenReady, needsNewBackup, goto]);

  return { isBackupSignerReady: hasBeenReady || isReadyNow };
};
