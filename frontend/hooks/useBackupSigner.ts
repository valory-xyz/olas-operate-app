import { useEffect } from 'react';

import { SETUP_SCREEN } from '@/constants';

import { useMultisigs } from './useMultisig';
import { useSetup } from './useSetup';
import { useMasterWalletContext } from './useWallet';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

/**
 * The onboarding backup signer, and whether that decision is settled.
 *
 * A stored address pick (or any pick while Web3Auth is on) is used as is, falling back to
 * the on-chain backup owner. While Web3Auth is off, a stored Google/Apple pick is ignored
 * and the on-chain backup owner (if any) is used. Until the Web3Auth status — and, for an
 * ignored pick, the Pearl Safe owners — are known, `isPending` is true: callers must not
 * route or create a Safe on it.
 */
export const useBackupSignerState = () => {
  const { backupSigner } = useSetup();
  const { masterSafes, isFetched: areWalletsFetched } =
    useMasterWalletContext();
  const { allBackupAddresses, masterSafesOwnersIsFetched } =
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
  const isPending =
    status === 'loading' ||
    !areWalletsFetched ||
    (hasMasterSafe && !masterSafesOwnersIsFetched);

  return {
    backupSignerAddress: isPending ? undefined : onChainBackupAddress,
    isPending,
    // D14: only a user with no Pearl Safe yet goes back to choose a backup wallet.
    needsNewBackup: !isPending && !hasMasterSafe,
  };
};

/** The onboarding backup signer address; see `useBackupSignerState`. */
export const useBackupSigner = () => useBackupSignerState().backupSignerAddress;

/**
 * For onboarding screens that lead to Pearl Safe creation: sends a user whose Google/Apple
 * pick was ignored back to choose a backup wallet, and reports whether the screen may go on.
 */
export const useBackupSignerGuard = () => {
  const { goto } = useSetup();
  const { isPending, needsNewBackup } = useBackupSignerState();

  useEffect(() => {
    if (needsNewBackup) goto(SETUP_SCREEN.SetupBackupSigner);
  }, [needsNewBackup, goto]);

  return { isBackupSignerReady: !isPending && !needsNewBackup };
};
