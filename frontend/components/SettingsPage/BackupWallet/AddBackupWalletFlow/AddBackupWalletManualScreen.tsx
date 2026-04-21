import { Button, Card, Flex, Form, Input, Typography } from 'antd';
import { getAddress } from 'ethers/lib/utils';
import { useRef, useState } from 'react';

import { BackButton, cardStyles } from '@/components/ui';
import { BACKUP_WALLET_FIELD_RULES } from '@/constants';
import { SettingsScreenMap } from '@/constants/screen';
import { useApplyBackupOwner, useSettings } from '@/hooks';
import { Address } from '@/types/Address';

import { useAddBackupWallet } from './AddBackupWalletContext';
import {
  AddBackupWalletResultModal,
  AddBackupWalletStatus,
} from './AddBackupWalletResultModal';

const { Title, Text } = Typography;

export const AddBackupWalletManualScreen = () => {
  const { goto } = useSettings();
  const [form] = Form.useForm();
  const addressValue = Form.useWatch('backup-signer', form) as
    | string
    | undefined;
  const { password, setPassword, resetFlow } = useAddBackupWallet();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const [status, setStatus] = useState<AddBackupWalletStatus>('idle');
  const savedPasswordRef = useRef(password);
  const savedAddressRef = useRef<Address | null>(null);

  const isAddressEmpty = !addressValue || addressValue.trim().length === 0;

  const handleSubmit = async (values: { 'backup-signer': string }) => {
    let checksummedAddress: Address;
    try {
      checksummedAddress = getAddress(
        values['backup-signer'].toLowerCase(),
      ) as Address;
    } catch {
      form.setFields([
        { name: 'backup-signer', errors: ['Invalid Ethereum address'] },
      ]);
      return;
    }

    savedAddressRef.current = checksummedAddress;
    setStatus('in_progress');
    setPassword(null);
    try {
      await applyBackupOwner({
        backup_owner: checksummedAddress,
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
    goto(SettingsScreenMap.AddBackupWalletMethod);
  };

  return (
    <Flex style={cardStyles} vertical gap={24}>
      <Card styles={{ body: { padding: 24 } }}>
        <Flex vertical gap={16}>
          <BackButton onPrev={handleBack} />
          <Title level={4} className="m-0">
            Provide Existing Backup Wallet
          </Title>
          <Form layout="vertical" form={form} onFinish={handleSubmit}>
            <Form.Item
              name="backup-signer"
              label="Enter Backup Wallet Address"
              rules={BACKUP_WALLET_FIELD_RULES}
              required
            >
              <Input
                size="large"
                placeholder="0x..."
                disabled={status === 'in_progress'}
              />
            </Form.Item>
            <Button
              type="primary"
              size="large"
              block
              htmlType="submit"
              loading={status === 'in_progress'}
              disabled={isAddressEmpty}
            >
              Add Backup Wallet
            </Button>
          </Form>
        </Flex>
      </Card>
      <Text type="secondary" className="text-sm text-center">
        Keep your backup wallet secure. If you lose both your password and
        backup wallet, you&apos;ll lose access to Pearl — permanently.
      </Text>

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
