import { areAddressesEqual } from '@/utils/address';

import { useBackupOwnerStatus } from './useBackupOwnerStatus';
import { useStore } from './useStore';
import { useWeb3AuthStatus } from './useWeb3AuthStatus';

/** Whether to prompt replacing a Google/Apple backup wallet while Web3Auth is off. */
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
