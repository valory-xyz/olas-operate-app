import { LuWallet } from 'react-icons/lu';

import { Alert } from '@/components/ui';
import { PAGES } from '@/constants';
import { useBackupOwnerStatus, usePageState } from '@/hooks';

export const BackupWalletAlert = () => {
  const { goto: gotoPage } = usePageState();
  const { backupOwnerStatus } = useBackupOwnerStatus();

  const canonicalAddress = backupOwnerStatus?.canonical_backup_owner ?? null;
  const allChainsSynced = backupOwnerStatus?.all_chains_synced ?? true;
  const anyBackupMissing = backupOwnerStatus?.any_backup_missing ?? false;

  if (!anyBackupMissing && allChainsSynced) return null;

  const isAddAlert = canonicalAddress === null;

  return (
    <Alert
      type="warning"
      message={isAddAlert ? 'Add backup wallet' : 'Sync backup wallet'}
      onClick={() => gotoPage(PAGES.Settings)}
      showIcon
      customIcon={<LuWallet />}
      className="mt-auto mb-16"
      style={{ alignItems: 'center', cursor: 'pointer' }}
    />
  );
};
