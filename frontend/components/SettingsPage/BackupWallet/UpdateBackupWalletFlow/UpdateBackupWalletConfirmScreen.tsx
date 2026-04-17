import { Button, Card, Flex, Input, message, Typography } from 'antd';
import { useCallback, useRef, useState } from 'react';
import { TbCopy } from 'react-icons/tb';

import { Alert, BackButton, cardStyles } from '@/components/ui';
import { SettingsScreenMap } from '@/constants/screen';
import {
  useApplyBackupOwner,
  useBackupOwnerStatus,
  useSettings,
} from '@/hooks';
import { copyToClipboard } from '@/utils';

import { useUpdateBackupWallet } from './UpdateBackupWalletContext';
import { UpdateBackupWalletResultModal } from './UpdateBackupWalletResultModal';

const { Title, Text } = Typography;

const AddressBox = ({ address }: { address: string }) => {
  const handleCopy = useCallback(() => {
    copyToClipboard(address).then(() => message.success('Address copied!'));
  }, [address]);

  return (
    <Input
      readOnly
      value={address}
      suffix={
        <Button
          type="text"
          size="small"
          icon={<TbCopy />}
          onClick={handleCopy}
        />
      }
    />
  );
};

type ResultStatus = 'idle' | 'in_progress' | 'success' | 'failure';

export const UpdateBackupWalletConfirmScreen = () => {
  const { goto } = useSettings();
  const { backupOwnerStatus } = useBackupOwnerStatus();
  const { newAddress, password, setPassword, resetFlow } =
    useUpdateBackupWallet();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const [resultStatus, setResultStatus] = useState<ResultStatus>('idle');
  const savedPasswordRef = useRef(password);

  const currentAddress = backupOwnerStatus?.canonical_backup_owner ?? null;

  const handleConfirm = async () => {
    if (!newAddress) return;
    setResultStatus('in_progress');
    setPassword(null);
    try {
      await applyBackupOwner({
        backup_owner: newAddress,
        password: savedPasswordRef.current ?? undefined,
      });
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
            <Flex vertical gap={16}>
              <Flex vertical gap={4}>
                <Text type="secondary" className="text-sm">
                  Current backup wallet:
                </Text>
                {currentAddress ? (
                  <AddressBox address={currentAddress} />
                ) : (
                  <Text>—</Text>
                )}
              </Flex>
              <Flex vertical gap={4}>
                <Text type="secondary" className="text-sm">
                  New backup wallet:
                </Text>
                {newAddress && <AddressBox address={newAddress} />}
              </Flex>
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
                disabled={resultStatus === 'in_progress'}
                onClick={() => goto(SettingsScreenMap.UpdateBackupWalletMethod)}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                loading={resultStatus === 'in_progress'}
                onClick={handleConfirm}
              >
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
          onRetry={async () => {
            await applyBackupOwner({
              backup_owner: newAddress!,
              password: savedPasswordRef.current ?? undefined,
            });
          }}
        />
      )}
    </>
  );
};
