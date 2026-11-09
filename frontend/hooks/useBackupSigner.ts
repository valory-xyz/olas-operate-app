import { useEffect, useRef, useState } from 'react';

import { SETUP_SCREEN } from '@/constants';
import { Address } from '@/types/Address';

import { useElectronApi } from './useElectronApi';
import { useMultisigs } from './useMultisig';
import { useServices } from './useServices';
import { useSetup } from './useSetup';
import { useStore } from './useStore';
import { useMasterWalletContext } from './useWallet';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

export type BackupSignerState =
  /** Not decided yet: don't route or create a Safe on it. */
  | { state: 'pending' }
  /** The wallets, or the Safe owners it needs, have never been read; the reads keep retrying. */
  | { state: 'error'; reason: string }
  /** Nothing usable: the user must pick a new backup wallet. */
  | { state: 'needsNewBackup' }
  | { state: 'ready'; backupSignerAddress?: Address };

export type ReadyBackupSigner = Extract<BackupSignerState, { state: 'ready' }>;

/**
 * The onboarding backup signer. While Web3Auth is off, a stored Google/Apple pick is ignored
 * in favour of the on-chain backup owner; with no Pearl Safe yet, a new backup is needed.
 *
 * Routing (the default) needs only that: otherwise it reads the signer live and never waits
 * on the Safe owners. `forSafeCreation` also waits for the wallets and, when the agent's home
 * chain has no Safe yet (so one will be created), for the owners before any on-chain fallback,
 * so a Safe is never created on a value that is still loading.
 */
export const useBackupSignerState = ({
  forSafeCreation = false,
}: { forSafeCreation?: boolean } = {}): BackupSignerState => {
  const { backupSigner } = useSetup();
  const { storeState } = useStore();
  const {
    masterWallets,
    masterSafes,
    isError: isWalletsError,
  } = useMasterWalletContext();
  const {
    allBackupAddresses,
    masterSafesOwners,
    masterSafesOwnersIsError,
    masterSafesOwnersError,
  } = useMultisigs(masterSafes);
  const { status } = useWeb3AuthStatus();
  const { selectedAgentConfig } = useServices();

  // Read the pick from the store too: the setup context restores it without a re-render.
  if (storeState === undefined) return { state: 'pending' };
  const pick = backupSigner ?? storeState.lastProvidedBackupWallet;
  const onChainBackupAddress = allBackupAddresses[0] as Address | undefined;
  const hasMasterSafe = !!masterSafes?.length;
  const createsSafe =
    forSafeCreation &&
    !masterSafes?.some(
      (safe) => safe.evmChainId === selectedAgentConfig?.evmHomeChainId,
    );

  // Wallet data, not `isFetched`: a failed wallets read must not pass for "no Safe".
  const walletsUnsettled = (): BackupSignerState | null =>
    masterWallets === undefined
      ? isWalletsError
        ? { state: 'error', reason: 'Failed to read the wallets' }
        : { state: 'pending' }
      : null;
  // Owner data, not query flags: a failed refresh keeps the owners it read before.
  const ownersUnsettled = (): BackupSignerState | null =>
    createsSafe && hasMasterSafe && masterSafesOwners === undefined
      ? masterSafesOwnersIsError
        ? {
            state: 'error',
            reason:
              masterSafesOwnersError?.message ?? 'Failed to read Safe owners',
          }
        : { state: 'pending' }
      : null;

  if (pick?.type !== 'web3auth' || status === 'enabled') {
    if (pick?.address) {
      return { state: 'ready', backupSignerAddress: pick.address as Address };
    }
    const unsettled = forSafeCreation
      ? (walletsUnsettled() ?? ownersUnsettled())
      : null;
    return (
      unsettled ?? { state: 'ready', backupSignerAddress: onChainBackupAddress }
    );
  }

  if (status === 'loading') return { state: 'pending' };
  const wallets = walletsUnsettled();
  if (wallets) return wallets;
  if (!hasMasterSafe) return { state: 'needsNewBackup' };

  const owners = ownersUnsettled();
  if (owners) return owners;
  // A Safe exists: routing goes on, as Settings' Add/Update covers a missing backup owner.
  // A new Safe, though, must not be created without one.
  if (createsSafe && !onChainBackupAddress) return { state: 'needsNewBackup' };
  return { state: 'ready', backupSignerAddress: onChainBackupAddress };
};

/**
 * For onboarding screens that lead to Pearl Safe creation (use it through `BackupSignerGate`):
 * waits for a settled backup signer and sends a user who needs a new one back to the backup
 * wallet step. The first ready decision — including its address — is kept for the screen's
 * lifetime, so a later status refetch never pulls the user out of a run in progress or
 * changes the Safe's backup owner.
 */
export const useBackupSignerGuard = () => {
  const { goto } = useSetup();
  const { logEvent } = useElectronApi();
  const signer = useBackupSignerState({ forSafeCreation: true });
  const [latched, setLatched] = useState<ReadyBackupSigner | null>(
    signer.state === 'ready' ? signer : null,
  );

  useEffect(() => {
    if (!latched && signer.state === 'ready') setLatched(signer);
  }, [latched, signer]);

  useEffect(() => {
    if (!latched && signer.state === 'needsNewBackup') {
      goto(SETUP_SCREEN.SetupBackupSigner);
    }
  }, [latched, signer.state, goto]);

  const latchedSigner = latched ?? (signer.state === 'ready' ? signer : null);
  const errorReason =
    !latchedSigner && signer.state === 'error' ? signer.reason : null;

  // Once per failing spell, not per poll, into Pearl's logs: the user is stuck until it clears.
  const isErrorLoggedRef = useRef(false);
  useEffect(() => {
    if (errorReason === null) {
      isErrorLoggedRef.current = false;
      return;
    }
    if (isErrorLoggedRef.current) return;
    isErrorLoggedRef.current = true;
    logEvent?.(`Backup signer unavailable during setup: ${errorReason}`);
  }, [errorReason, logEvent]);

  return { latchedSigner, isBackupSignerError: errorReason !== null };
};
