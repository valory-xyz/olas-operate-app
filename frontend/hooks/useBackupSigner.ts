import { useEffect, useState } from 'react';

import { SETUP_SCREEN } from '@/constants';
import { Address } from '@/types/Address';

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
  | { state: 'error' }
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
  const { allBackupAddresses, masterSafesOwners, masterSafesOwnersIsError } =
    useMultisigs(masterSafes);
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
      ? { state: isWalletsError ? 'error' : 'pending' }
      : null;
  // Owner data, not query flags: a failed refresh keeps the owners it read before.
  const ownersUnsettled = (): BackupSignerState | null =>
    createsSafe && hasMasterSafe && masterSafesOwners === undefined
      ? { state: masterSafesOwnersIsError ? 'error' : 'pending' }
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

  // A Safe exists: route on; Settings' Add/Update covers a missing backup owner.
  const owners = forSafeCreation ? ownersUnsettled() : null;
  return (
    owners ?? { state: 'ready', backupSignerAddress: onChainBackupAddress }
  );
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
  return {
    latchedSigner,
    isBackupSignerError: !latchedSigner && signer.state === 'error',
  };
};
