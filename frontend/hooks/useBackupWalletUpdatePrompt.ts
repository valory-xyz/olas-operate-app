import { areAddressesEqual } from '@/utils/address';

import { useBackupOwnerStatus } from './useBackupOwnerStatus';
import { useStore } from './useStore';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

/** Whether to prompt replacing a Google/Apple backup wallet while Web3Auth is off. */
export const useBackupWalletUpdatePrompt = () => {
  // Only an explicit "off": a pearl-api outage must not prompt every Google/Apple user.
  const { isExplicitlyDisabled } = useWeb3AuthStatus();
  const { storeState } = useStore();
  const { backupOwnerStatus } = useBackupOwnerStatus();

  const record = storeState?.lastProvidedBackupWallet;
  const canonicalAddress = backupOwnerStatus?.canonical_backup_owner;

  const isUpdatePromptVisible =
    isExplicitlyDisabled &&
    record?.type === 'web3auth' &&
    areAddressesEqual(
      record.address ?? undefined,
      canonicalAddress ?? undefined,
    );

  return { isUpdatePromptVisible };
};
