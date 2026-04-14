import { Card, Flex, Typography } from 'antd';

import { BackupWalletWeb3Auth } from '@/components/SetupPage/Create/SetupBackupSigner/BackupWalletWeb3Auth';
import { Alert, BackButton, cardStyles } from '@/components/ui';
import { SettingsScreenMap } from '@/constants/screen';
import { useBackupOwnerStatus, useSettings } from '@/hooks';
import { Address } from '@/types/Address';

import { useUpdateBackupWallet } from './UpdateBackupWalletContext';

const { Title, Text } = Typography;

export const UpdateBackupWalletMethodScreen = () => {
  const { goto } = useSettings();
  const { backupOwnerStatus } = useBackupOwnerStatus();
  const { setNewAddress, sameAddressError, setSameAddressError } =
    useUpdateBackupWallet();

  const currentAddress = backupOwnerStatus?.canonical_backup_owner ?? null;

  const handleWeb3AuthFinish = (address: Address) => {
    if (
      currentAddress &&
      address.toLowerCase() === currentAddress.toLowerCase()
    ) {
      setSameAddressError(true);
      return;
    }
    setSameAddressError(false);
    setNewAddress(address);
    goto(SettingsScreenMap.UpdateBackupWalletConfirm);
  };

  return (
    <Flex style={cardStyles} vertical gap={32}>
      <Card styles={{ body: { padding: 24 } }}>
        <Flex vertical gap={16}>
          <BackButton onPrev={() => goto(SettingsScreenMap.Main)} />
          <Title level={4} className="m-0">
            Update Backup Wallet
          </Title>
          <Text type="secondary">
            Choose how you&apos;d like to set up your new backup wallet. This
            will replace your current one.
          </Text>
          {sameAddressError && (
            <Alert
              type="error"
              showIcon
              message={
                <Flex vertical gap={4}>
                  <Text className="text-sm font-weight-600">
                    Wallet Already Linked
                  </Text>
                  <Text className="text-sm">
                    This email is already linked to your current backup wallet.
                    Please try a different email or social account.
                  </Text>
                </Flex>
              }
            />
          )}
          <BackupWalletWeb3Auth
            onSetUpManuallyClick={() => {
              setSameAddressError(false);
              goto(SettingsScreenMap.UpdateBackupWalletManual);
            }}
            onFinish={handleWeb3AuthFinish}
          />
        </Flex>
      </Card>
    </Flex>
  );
};
