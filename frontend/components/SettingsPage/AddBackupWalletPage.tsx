import { CloseOutlined } from '@ant-design/icons';
import { Button, Form, Input, Typography } from 'antd';
import { useMemo } from 'react';

import { MiddlewareChain } from '@/client';
import { MIN_ETH_BALANCE_THRESHOLDS } from '@/constants/thresholds';
import { SettingsScreen } from '@/enums/SettingsScreen';
import { useBalanceContext } from '@/hooks/useBalanceContext';
import { useSettings } from '@/hooks/useSettings';

import { CardTitle } from '../Card/CardTitle';
import { CardFlex } from '../styled/CardFlex';

export const AddBackupWalletPage = () => {
  const { masterEoaBalance: eoaBalance } = useBalanceContext();
  const { goto } = useSettings();

  const [form] = Form.useForm();

  const isFunded = useMemo<boolean>(() => {
    if (!eoaBalance) return false;
    return (
      eoaBalance.ETH >=
      MIN_ETH_BALANCE_THRESHOLDS[MiddlewareChain.OPTIMISM].safeAddSigner
    );
  }, [eoaBalance]);

  return (
    <CardFlex
      title={<CardTitle title="Add backup wallet" />}
      extra={
        <Button size="large" onClick={() => goto(SettingsScreen.Main)}>
          <CloseOutlined />
        </Button>
      }
    >
      <Typography.Paragraph>
        To help keep your funds safe, we encourage you to add one of your
        existing crypto wallets as a backup. You may recover your funds to your
        backup wallet if you lose both your password and seed phrase.
      </Typography.Paragraph>
      <Form layout="vertical" form={form}>
        <Form.Item
          label="Backup wallet address"
          name="backup-wallet-address"
          rules={[
            {
              required: true,
              min: 42,
              pattern: /^0x[a-fA-F0-9]{40}$/,
              type: 'string',
              message: 'Please input a valid backup wallet address!',
            },
          ]}
        >
          <Input placeholder="e.g. 0x123124...124124" size="large" />
        </Form.Item>
        <Button type="primary" disabled={!isFunded} htmlType="submit">
          Add backup wallet
        </Button>
      </Form>
      <Typography.Text>
        <small className="text-muted">
          * This action requires a small amount of funds.
        </small>
      </Typography.Text>
    </CardFlex>
  );
};
