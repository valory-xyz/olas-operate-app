import { useEffect, useState } from 'react';

import { SETUP_SCREEN } from '@/constants';
import { Address } from '@/types/Address';

import { useMultisigs } from './useMultisig';
import { useSetup } from './useSetup';
import { useStore } from './useStore';
import { useMasterWalletContext } from './useWallet';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

export type BackupSignerState =
  /** Not decided yet: don't route or create a Safe on it. */
  | { state: 'pending' }
  /** The Safe owners have never been read; the query keeps retrying. */
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
  const { storeState } = useStore();
  const { masterWallets, masterSafes } = useMasterWalletContext();
  const { allBackupAddresses, masterSafesOwners, masterSafesOwnersIsError } =
    useMultisigs(masterSafes);
  const { status } = useWeb3AuthStatus();

  // Read the pick from the store too: the setup context restores it without a re-render.
  if (storeState === undefined) return { state: 'pending' };
  const pick = backupSigner ?? storeState.lastProvidedBackupWallet;
  const onChainBackupAddress = allBackupAddresses[0] as Address | undefined;

  if (pick?.type !== 'web3auth' || status === 'enabled') {
    return {
      state: 'ready',
      backupSignerAddress:
        (pick?.address as Address | undefined) ?? onChainBackupAddress,
    };
  }

  // Wallet data, not `isFetched`: a failed wallets read must not pass for "no Safe".
  if (status === 'loading' || masterWallets === undefined) {
    return { state: 'pending' };
  }

  // Owner data, not query flags: a failed refresh keeps the owners it read before.
  if (masterSafes?.length && masterSafesOwners === undefined) {
    return masterSafesOwnersIsError ? { state: 'error' } : { state: 'pending' };
  }

  return onChainBackupAddress
    ? { state: 'ready', backupSignerAddress: onChainBackupAddress }
    : { state: 'needsNewBackup' };
};

/**
 * For onboarding screens that lead to Pearl Safe creation: waits for a settled backup signer
 * and sends a user who needs a new one back to the backup wallet step. The first ready
 * decision — including its address — is kept for the screen's lifetime (share it with Safe
 * creation via `LatchedBackupSignerContext`), so a later status refetch never pulls the user
 * out of a run in progress or changes the Safe's backup owner.
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

  const latchedOrNow = latched ?? (signer.state === 'ready' ? signer : null);
  return {
    latchedSigner: latchedOrNow,
    isBackupSignerReady: !!latchedOrNow,
    isBackupSignerError: !latchedOrNow && signer.state === 'error',
    backupSignerAddress: latchedOrNow?.backupSignerAddress,
  };
};
