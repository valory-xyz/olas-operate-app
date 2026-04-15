import { Button, Card, Flex, Form, Input, Typography } from 'antd';
import { getAddress } from 'ethers/lib/utils';
import { useState } from 'react';

import { BackButton, cardStyles } from '@/components/ui';
import { BACKUP_WALLET_FIELD_RULES, COLOR } from '@/constants';
import { SettingsScreenMap } from '@/constants/screen';
import { useApplyBackupOwner, useSettings } from '@/hooks';
import { Address } from '@/types/Address';

import {
  AddBackupWalletResultModal,
  AddBackupWalletStatus,
} from './AddBackupWalletResultModal';

const { Title, Text } = Typography;

export const AddBackupWalletManualScreen = () => {
  const { goto } = useSettings();
  const [form] = Form.useForm();
  const { mutateAsync: applyBackupOwner } = useApplyBackupOwner();
  const [status, setStatus] = useState<AddBackupWalletStatus>('idle');

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

    setStatus('in_progress');
    try {
      await applyBackupOwner({ backup_owner: checksummedAddress });
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
    <Flex style={cardStyles} vertical gap={24}>
      <Card styles={{ body: { padding: 24 } }}>
        <Flex vertical gap={16}>
          <BackButton
            onPrev={() => goto(SettingsScreenMap.AddBackupWalletMethod)}
          />
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
              <Input size="large" placeholder="0x..." />
            </Form.Item>
            <Button type="primary" size="large" block htmlType="submit">
              Add Backup Wallet
            </Button>
          </Form>
        </Flex>
      </Card>
      <Text
        type="secondary"
        className="text-sm"
        style={{ color: COLOR.TEXT_NEUTRAL_TERTIARY }}
      >
        Keep your backup wallet secure. If you lose both your password and
        backup wallet, you&apos;ll lose access to Pearl — permanently.
      </Text>

      <AddBackupWalletResultModal
        status={status}
        onDone={handleDone}
        onRetry={handleRetry}
      />
    </Flex>
  );
};
