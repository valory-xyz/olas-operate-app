import { Card, Flex, Typography } from 'antd';
import { useRef, useState } from 'react';

import { BackupWalletWeb3Auth } from '@/components/SetupPage/Create/SetupBackupSigner/BackupWalletWeb3Auth';
import { BackButton, cardStyles } from '@/components/ui';
import { SettingsScreenMap } from '@/constants/screen';
import { useApplyBackupOwner, useSettings } from '@/hooks';
import { Address } from '@/types/Address';

import { useAddBackupWallet } from './AddBackupWalletContext';
import {
  AddBackupWalletResultModal,
  AddBackupWalletStatus,
} from './AddBackupWalletResultModal';

const { Title, Text } = Typography;

export const AddBackupWalletMethodScreen = () => {
  const { goto } = useSettings();
  const { password, setPassword, resetFlow } = useAddBackupWallet();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const [status, setStatus] = useState<AddBackupWalletStatus>('idle');
  const savedPasswordRef = useRef(password);
  const savedAddressRef = useRef<Address | null>(null);

  const applyAddress = async (address: Address) => {
    savedAddressRef.current = address;
    setStatus('in_progress');
    setPassword(null);
    try {
      await applyBackupOwner({
        backup_owner: address,
        password: savedPasswordRef.current ?? undefined,
      });
      setStatus('success');
    } catch {
      setStatus('failure');
    }
  };

  const handleDone = () => {
    setStatus('idle');
    resetFlow();
    goto(SettingsScreenMap.Main);
  };

  const handleBack = () => {
    resetFlow();
    goto(SettingsScreenMap.Main);
  };

  return (
    <Flex style={cardStyles} vertical gap={32}>
      <Card styles={{ body: { padding: 24 } }}>
        <Flex vertical gap={16}>
          <BackButton onPrev={handleBack} />
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
            onFinish={applyAddress}
            showSuccessMessage={false}
          />
        </Flex>
      </Card>

      <AddBackupWalletResultModal
        status={status}
        onDone={handleDone}
        onRetry={async () => {
          if (!savedAddressRef.current) return;
          await applyBackupOwner({
            backup_owner: savedAddressRef.current,
            password: savedPasswordRef.current ?? undefined,
          });
        }}
      />
    </Flex>
  );
};
