import { useEffect, useState } from 'react';

import { SETUP_SCREEN } from '@/constants';
import { Address } from '@/types/Address';

import { useMultisigs } from './useMultisig';
import { useSetup } from './useSetup';
import { useMasterWalletContext } from './useWallet';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

export type BackupSignerState =
  /** Not decided yet: don't route or create a Safe on it. */
  | { state: 'pending' }
  /** The Safe owners can't be read; the query keeps retrying. */
  | { state: 'error' }
  /** Nothing usable: the user must pick a new backup wallet. */
  | { state: 'needsNewBackup' }
  | { state: 'ready'; backupSignerAddress?: Address };

/**
 * The onboarding backup signer. While Web3Auth is off, a stored Google/Apple pick is ignored
 * in favour of the on-chain backup owner.
 */
export const useBackupSignerState = (): BackupSignerState => {
  const { backupSigner } = useSetup();
  const { masterWallets, masterSafes } = useMasterWalletContext();
  const {
    allBackupAddresses,
    masterSafesOwnersIsSuccess,
    masterSafesOwnersIsError,
  } = useMultisigs(masterSafes);
  const { status } = useWeb3AuthStatus();

  const onChainBackupAddress = allBackupAddresses[0] as Address | undefined;

  if (backupSigner?.type !== 'web3auth' || status === 'enabled') {
    return {
      state: 'ready',
      backupSignerAddress:
        (backupSigner?.address as Address | undefined) ?? onChainBackupAddress,
    };
  }

  // Wallet data, not `isFetched`: a failed wallets read must not pass for "no Safe".
  if (status === 'loading' || masterWallets === undefined) {
    return { state: 'pending' };
  }

  if (masterSafes?.length) {
    // Likewise a failed owners read must not pass for "no backup owner on-chain".
    if (masterSafesOwnersIsError && !masterSafesOwnersIsSuccess) {
      return { state: 'error' };
    }
    if (!masterSafesOwnersIsSuccess) return { state: 'pending' };
  }

  return onChainBackupAddress
    ? { state: 'ready', backupSignerAddress: onChainBackupAddress }
    : { state: 'needsNewBackup' };
};

/** The onboarding backup signer address once ready; see `useBackupSignerState`. */
export const useBackupSigner = () => {
  const signer = useBackupSignerState();
  return signer.state === 'ready' ? signer.backupSignerAddress : undefined;
};

/**
 * For onboarding screens that lead to Pearl Safe creation: waits for a settled backup signer
 * and sends a user who needs a new one back to the backup wallet step. The first ready
 * decision — including its address — is kept for the screen's lifetime, so a later status
 * refetch never pulls the user out of a run in progress or changes the Safe's backup owner.
 */
export const useBackupSignerGuard = () => {
  const { goto } = useSetup();
  const signer = useBackupSignerState();
  const [latched, setLatched] = useState<Extract<
    BackupSignerState,
    { state: 'ready' }
  > | null>(signer.state === 'ready' ? signer : null);

  useEffect(() => {
    if (!latched && signer.state === 'ready') setLatched(signer);
  }, [latched, signer]);

  useEffect(() => {
    if (!latched && signer.state === 'needsNewBackup') {
      goto(SETUP_SCREEN.SetupBackupSigner);
    }
  }, [latched, signer.state, goto]);

  const decision = latched ?? signer;
  return {
    isBackupSignerReady: decision.state === 'ready',
    isBackupSignerError: decision.state === 'error',
    backupSignerAddress:
      decision.state === 'ready' ? decision.backupSignerAddress : undefined,
  };
};
