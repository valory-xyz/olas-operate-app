import { CloseOutlined } from '@ant-design/icons';
import { Button, Form, Input, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { MIN_ETH_BALANCE_THRESHOLDS } from '@/constants/thresholds';
import { SettingsScreen } from '@/enums/SettingsScreen';
import { useMasterBalances } from '@/hooks/useBalanceContext';
import { useServices } from '@/hooks/useServices';
import { useSettings } from '@/hooks/useSettings';

import { CardTitle } from '../Card/CardTitle';
import { CardFlex } from '../styled/CardFlex';

export const AddBackupWalletPage = () => {
  const {
    selectedAgentConfig: { evmHomeChainId: homeChainId },
  } = useServices();
  const { masterEoaBalances } = useMasterBalances();
  const { goto } = useSettings();
  const [form] = Form.useForm();

  const isMasterEoaFunded = useMemo<boolean>(() => {
    if (isNil(masterEoaBalances) || isEmpty(masterEoaBalances)) return false;

    const masterEoaNativeBalance = masterEoaBalances.find(
      ({ isNative, evmChainId: chainId }) =>
        isNative && chainId === homeChainId,
    )?.balance;

    if (isNil(masterEoaNativeBalance)) return false;

    const nativeBalanceRequiredToAddSigner =
      MIN_ETH_BALANCE_THRESHOLDS[homeChainId].safeAddSigner;

    return masterEoaNativeBalance >= nativeBalanceRequiredToAddSigner;
  }, [homeChainId, masterEoaBalances]);

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
        <Button type="primary" disabled={!isMasterEoaFunded} htmlType="submit">
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
