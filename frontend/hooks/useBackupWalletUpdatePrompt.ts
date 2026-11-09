import { areAddressesEqual } from '@/utils/address';

import { useBackupOwnerStatus } from './useBackupOwnerStatus';
import { useStore } from './useStore';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

/**
 * Whether to ask the user to replace a Google/Apple (Web3Auth) backup wallet.
 *
 * Only while Web3Auth is off (a failed status read counts as off), and only
 * while the backup wallet this device recorded as Google/Apple is still the
 * current one — any change of backup wallet, through any flow, clears it.
 * Waits for the status so users with Web3Auth on never see it flash.
 *
 * Its alerts take the place of the out-of-sync ones: updating applies the new
 * address to every chain.
 */
export const useBackupWalletUpdatePrompt = () => {
  const { isWeb3AuthEnabled, isLoading: isWeb3AuthStatusLoading } =
    useWeb3AuthStatus();
  const { storeState } = useStore();
  const { backupOwnerStatus } = useBackupOwnerStatus();

  const record = storeState?.lastProvidedBackupWallet;
  const canonicalAddress = backupOwnerStatus?.canonical_backup_owner;

  const isUpdatePromptVisible =
    !isWeb3AuthStatusLoading &&
    !isWeb3AuthEnabled &&
    record?.type === 'web3auth' &&
    areAddressesEqual(
      record.address ?? undefined,
      canonicalAddress ?? undefined,
    );

  return { isUpdatePromptVisible };
};
