import { Button, Flex, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';
import { useBoolean } from 'usehooks-ts';

import {
  AddressLink,
  Alert,
  CardSection,
  IconContainer,
} from '@/components/ui';
import { COLOR } from '@/constants';
import { SettingsScreenMap } from '@/constants/screen';
import { useBackupOwnerStatus, useSettings } from '@/hooks';
import { Address } from '@/types/Address';

import { SyncBackupWalletModal } from './SyncBackupWalletModal';
import { UpdateBackupWalletPasswordModal } from './UpdateBackupWalletFlow';

const { Text } = Typography;

export const BackupWalletSection = () => {
  const { goto } = useSettings();
  const { backupOwnerStatus, isError, refetch } = useBackupOwnerStatus();
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

  // Show placeholder only when no data exists yet (first mount).
  // On subsequent refetches, cached data stays visible — no flicker.
  if (!backupOwnerStatus) {
    return (
      <CardSection $padding="24px" $borderBottom vertical gap={12}>
        <Flex gap={16}>
          <IconContainer>
            <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          </IconContainer>
          <Flex vertical gap={6}>
            <div className="my-6">
              <Text strong>Backup Wallet</Text>
            </div>
            {isError ? (
              <Button className="w-fit text-sm" onClick={() => refetch()}>
                Failed to load. Retry
              </Button>
            ) : (
              <Text type="secondary">&mdash;</Text>
            )}
          </Flex>
        </Flex>
      </CardSection>
    );
  }

  // State A: no backup wallet
  if (canonicalAddress === null) {
    return (
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
              <Button
                className="w-fit text-sm mt-6"
                onClick={() => goto(SettingsScreenMap.AddBackupWalletMethod)}
              >
                Add Backup Wallet
              </Button>
            </Flex>
          }
        />
      </CardSection>
    );
  }

  // State C: backup set but out of sync
  if (canonicalAddress !== null && !allChainsSynced) {
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
                <Button className="w-fit text-sm mt-6" onClick={openSync}>
                  Sync Now
                </Button>
              </Flex>
            }
          />
          <Button className="w-fit text-sm" onClick={openUpdatePassword}>
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
            <AddressLink address={canonicalAddress as Address} />
            <Button className="w-fit text-sm" onClick={openUpdatePassword}>
              Update Backup Wallet
            </Button>
          </Flex>
        </Flex>
      </CardSection>

      <UpdateBackupWalletPasswordModal
        open={isUpdatePasswordOpen}
        onClose={closeUpdatePassword}
      />
    </>
  );
};
