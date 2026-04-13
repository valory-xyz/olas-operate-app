import { Button, Flex, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';

import { Alert } from '@/components/ui';
import { PAGES } from '@/constants';
import { useBackupOwnerStatus, usePageState } from '@/hooks';

const { Text } = Typography;

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
      className="mt-auto mb-16"
      message={
        <Flex vertical gap={10}>
          <TbWallet fontSize={20} />
          <Text className="text-sm">
            {isAddAlert
              ? 'Add backup wallet to keep your funds safe.'
              : 'Sync backup wallet across all chains.'}
          </Text>
          <Button
            type="default"
            size="small"
            className="w-fit"
            onClick={() => gotoPage(PAGES.Settings)}
          >
            {isAddAlert ? 'Add Backup Wallet' : 'Sync Backup Wallet'}
          </Button>
        </Flex>
      }
    />
  );
};
