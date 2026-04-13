import { Button, Card, Flex, Typography } from 'antd';
import { useState } from 'react';

import { AddressLink, Alert, BackButton, cardStyles } from '@/components/ui';
import { SettingsScreenMap } from '@/constants/screen';
import { useApplyBackupOwner, useBackupOwnerStatus, useSettings } from '@/hooks';
import { Address } from '@/types/Address';

import { useUpdateBackupWallet } from './UpdateBackupWalletContext';
import { UpdateBackupWalletResultModal } from './UpdateBackupWalletResultModal';

const { Title, Text } = Typography;

type ResultStatus = 'idle' | 'in_progress' | 'success' | 'failure';

export const UpdateBackupWalletConfirmScreen = () => {
  const { goto } = useSettings();
  const { backupOwnerStatus } = useBackupOwnerStatus();
  const { newAddress, resetFlow } = useUpdateBackupWallet();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const [resultStatus, setResultStatus] = useState<ResultStatus>('idle');

  const currentAddress = backupOwnerStatus?.canonical_backup_owner ?? null;

  const handleConfirm = async () => {
    if (!newAddress) return;
    setResultStatus('in_progress');
    try {
      await applyBackupOwner({ backup_owner: newAddress });
      setResultStatus('success');
    } catch {
      setResultStatus('failure');
    }
  };

  const handleDone = () => {
    resetFlow();
    goto(SettingsScreenMap.Main);
  };

  return (
    <>
      <Flex style={cardStyles} vertical gap={32}>
        <Card styles={{ body: { padding: 24 } }}>
          <Flex vertical gap={16}>
            <BackButton
              onPrev={() => goto(SettingsScreenMap.UpdateBackupWalletMethod)}
            />
            <Title level={4} className="m-0">
              Confirm Backup Wallet Update
            </Title>
            <Flex vertical gap={8}>
              <Text type="secondary" className="text-sm">
                Current backup wallet:
              </Text>
              {currentAddress ? (
                <AddressLink address={currentAddress as Address} />
              ) : (
                <Text>—</Text>
              )}
              <Text type="secondary" className="text-sm">
                New backup wallet:
              </Text>
              {newAddress && <AddressLink address={newAddress} />}
            </Flex>
            <Alert
              type="warning"
              showIcon
              message={
                <Text>
                  This action will replace your current backup wallet. Make sure
                  you have access to the new address.
                </Text>
              }
            />
            <Flex gap={8} justify="flex-end">
              <Button
                onClick={() => goto(SettingsScreenMap.UpdateBackupWalletMethod)}
              >
                Cancel
              </Button>
              <Button type="primary" onClick={handleConfirm}>
                Update Backup Wallet
              </Button>
            </Flex>
          </Flex>
        </Card>
      </Flex>

      {resultStatus !== 'idle' && (
        <UpdateBackupWalletResultModal
          status={resultStatus}
          onDone={handleDone}
          onRetry={() => setResultStatus('idle')}
        />
      )}
    </>
  );
};
