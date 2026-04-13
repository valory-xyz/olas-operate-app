import { Button, Flex, Tag, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';
import { useBoolean } from 'usehooks-ts';

import {
  AddressLink,
  Alert,
  CardSection,
  IconContainer,
} from '@/components/ui';
import { COLOR } from '@/constants';
import { useBackupOwnerStatus } from '@/hooks';
import { Address } from '@/types/Address';

import { AddBackupWalletFlow } from './AddBackupWalletFlow';
import { SyncBackupWalletModal } from './SyncBackupWalletModal';
import { UpdateBackupWalletPasswordModal } from './UpdateBackupWalletFlow';

const { Text } = Typography;

export const BackupWalletSection = () => {
  const { backupOwnerStatus, isLoading } = useBackupOwnerStatus();
  const {
    value: isAddOpen,
    setTrue: openAdd,
    setFalse: closeAdd,
  } = useBoolean(false);
  const {
    value: isUpdatePasswordOpen,
    setTrue: openUpdatePassword,
    setFalse: closeUpdatePassword,
  } = useBoolean(false);
  const {
    value: isSyncOpen,
    setTrue: openSync,
    setFalse: closeSync,
  } = useBoolean(false);

  const canonicalAddress = backupOwnerStatus?.canonical_backup_owner ?? null;
  const allChainsSynced = backupOwnerStatus?.all_chains_synced ?? true;

  // State A: no backup wallet
  if (!isLoading && canonicalAddress === null) {
    return (
      <>
        <CardSection $padding="24px" $borderBottom vertical gap={12}>
          <Flex gap={16}>
            <IconContainer>
              <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
            </IconContainer>
            <Flex vertical gap={6}>
              <div className="my-6">
                <Text strong>Backup Wallet</Text>
              </div>
              <Text style={{ color: COLOR.TEXT_NEUTRAL_TERTIARY }}>
                No backup wallet added.
              </Text>
            </Flex>
          </Flex>
          <Alert
            type="warning"
            showIcon
            message={
              <Flex vertical gap={4}>
                <Text className="text-sm font-weight-600">
                  Your funds are at risk!
                </Text>
                <Text className="text-sm">
                  Add a backup wallet to allow you to retrieve funds if you lose
                  your password and seed phrase.
                </Text>
              </Flex>
            }
          />
          <Button
            type="primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={openAdd}
          >
            Add Backup Wallet
          </Button>
        </CardSection>

        <AddBackupWalletFlow open={isAddOpen} onClose={closeAdd} />
      </>
    );
  }

  // State C: backup set but out of sync
  if (!isLoading && canonicalAddress !== null && !allChainsSynced) {
    return (
      <>
        <CardSection $padding="24px" $borderBottom vertical gap={12}>
          <Flex gap={16}>
            <IconContainer>
              <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
            </IconContainer>
            <Flex vertical gap={6}>
              <Flex align="center" gap={8} className="my-6">
                <Text strong>Backup Wallet</Text>
                <Tag color="warning">Out of Sync</Tag>
              </Flex>
              <AddressLink address={canonicalAddress as Address} />
            </Flex>
          </Flex>
          <Alert
            type="warning"
            showIcon
            message={
              <Flex vertical gap={4}>
                <Text className="text-sm font-weight-600">
                  Backup Wallet Out of Sync
                </Text>
                <Text className="text-sm">
                  Your backup wallet isn&apos;t applied across all chains. Sync
                  now to apply it everywhere.
                </Text>
              </Flex>
            }
          />
          <Button style={{ alignSelf: 'flex-start' }} onClick={openSync}>
            Sync Now
          </Button>
          <Button
            className="w-fit text-sm"
            onClick={openUpdatePassword}
          >
            Update Backup Wallet
          </Button>
        </CardSection>

        <SyncBackupWalletModal open={isSyncOpen} onClose={closeSync} />
        <UpdateBackupWalletPasswordModal
          open={isUpdatePasswordOpen}
          onClose={closeUpdatePassword}
        />
      </>
    );
  }

  // State B: backup set and in sync (also the loading/default state)
  return (
    <>
      <CardSection $padding="24px" $borderBottom vertical gap={12}>
        <Flex gap={16}>
          <IconContainer>
            <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          </IconContainer>
          <Flex vertical gap={6}>
            <div className="my-6">
              <Text strong>Backup Wallet</Text>
            </div>
            {canonicalAddress ? (
              <AddressLink address={canonicalAddress as Address} />
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Flex>
        </Flex>
        {canonicalAddress && (
          <Button
            className="w-fit text-sm"
            onClick={openUpdatePassword}
          >
            Update Backup Wallet
          </Button>
        )}
      </CardSection>

      <UpdateBackupWalletPasswordModal
        open={isUpdatePasswordOpen}
        onClose={closeUpdatePassword}
      />
    </>
  );
};
