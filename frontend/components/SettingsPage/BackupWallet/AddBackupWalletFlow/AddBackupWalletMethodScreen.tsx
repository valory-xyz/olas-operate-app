import { Card, Flex, Typography } from 'antd';
import { useState } from 'react';

import { BackupWalletWeb3Auth } from '@/components/SetupPage/Create/SetupBackupSigner/BackupWalletWeb3Auth';
import { BackButton, cardStyles } from '@/components/ui';
import { SettingsScreenMap } from '@/constants/screen';
import { useApplyBackupOwner, useSettings } from '@/hooks';
import { Address } from '@/types/Address';

import {
  AddBackupWalletResultModal,
  AddBackupWalletStatus,
} from './AddBackupWalletResultModal';

const { Title, Text } = Typography;

export const AddBackupWalletMethodScreen = () => {
  const { goto } = useSettings();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const [status, setStatus] = useState<AddBackupWalletStatus>('idle');

  const handleWeb3AuthFinish = async (address: Address) => {
    setStatus('in_progress');
    try {
      await applyBackupOwner({ backup_owner: address });
      setStatus('success');
    } catch {
      setStatus('failure');
    }
  };

  const handleDone = () => {
    setStatus('idle');
    goto(SettingsScreenMap.Main);
  };

  const handleRetry = () => {
    setStatus('idle');
  };

  return (
    <Flex style={cardStyles} vertical gap={32}>
      <Card styles={{ body: { padding: 24 } }}>
        <Flex vertical gap={16}>
          <BackButton onPrev={() => goto(SettingsScreenMap.Main)} />
          <Title level={4} className="m-0">
            Set Up Backup Wallet
          </Title>
          <Text type="secondary">
            To help keep your funds safe, set up a backup wallet. Alternatively,
            you can add your existing crypto wallet as a backup if you have one.
          </Text>
          <BackupWalletWeb3Auth
            onSetUpManuallyClick={() =>
              goto(SettingsScreenMap.AddBackupWalletManual)
            }
            onFinish={handleWeb3AuthFinish}
          />
        </Flex>
      </Card>

      <AddBackupWalletResultModal
        status={status}
        onDone={handleDone}
        onRetry={handleRetry}
      />
    </Flex>
  );
};
