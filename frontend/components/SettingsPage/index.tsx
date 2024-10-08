import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography } from 'antd';
import Link from 'next/link';
import { useMemo } from 'react';

import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { Pages } from '@/enums/PageState';
import { SettingsScreen } from '@/enums/SettingsScreen';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { usePageState } from '@/hooks/usePageState';
import { useSettings } from '@/hooks/useSettings';
import { truncateAddress } from '@/utils/truncate';

import { CustomAlert } from '../Alert';
import { CardTitle } from '../Card/CardTitle';
import { CardSection } from '../styled/CardSection';
import { AddBackupWalletPage } from './AddBackupWalletPage';
import { DebugInfoSection } from './DebugInfoSection';

const { Text, Paragraph } = Typography;

const SettingsTitle = () => (
  <CardTitle
    title={
      <Flex gap={10}>
        <SettingOutlined />
        Settings
      </Flex>
    }
  />
);

export const Settings = () => {
  const { screen } = useSettings();
  const settingsScreen = useMemo(() => {
    switch (screen) {
      case SettingsScreen.Main:
        return <SettingsMain />;
      case SettingsScreen.AddBackupWallet:
        return <AddBackupWalletPage />;
      default:
        return null;
    }
  }, [screen]);

  return settingsScreen;
};

const SettingsMain = () => {
  const { backupSafeAddress } = useMasterSafe();
  const { goto } = usePageState();

  const truncatedBackupSafeAddress: string | undefined = useMemo(() => {
    if (backupSafeAddress) {
      return truncateAddress(backupSafeAddress);
    }
  }, [backupSafeAddress]);

  return (
    <Card
      title={<SettingsTitle />}
      bordered={false}
      extra={
        <Button
          size="large"
          icon={<CloseOutlined />}
          onClick={() => goto(Pages.Main)}
        />
      }
    >
      {/* Password */}
      <CardSection borderbottom="true" justify="space-between" align="center">
        <Flex vertical>
          <Paragraph strong>Password</Paragraph>
          <Text style={{ lineHeight: 1 }}>********</Text>
        </Flex>
      </CardSection>

      {/* Wallet backup */}
      <CardSection borderbottom="true" vertical gap={8}>
        <Text strong>Backup wallet</Text>
        {backupSafeAddress ? (
          <Link
            type="link"
            target="_blank"
            href={`https://gnosisscan.io/address/${backupSafeAddress}`}
          >
            {truncatedBackupSafeAddress} {UNICODE_SYMBOLS.EXTERNAL_LINK}
          </Link>
        ) : (
          <NoBackupWallet />
        )}
      </CardSection>

      {/* Debug info */}
      <DebugInfoSection />
    </Card>
  );
};

const NoBackupWallet = () => {
  const { goto: gotoSettings } = useSettings();
  return (
    <>
      <Text type="secondary">No backup wallet added.</Text>

      <CardSection style={{ marginTop: 12, marginBottom: 18 }}>
        <CustomAlert
          type="warning"
          fullWidth
          showIcon
          message={
            <>
              <Flex vertical gap={5}>
                <Text className="font-weight-600">Your funds are at risk!</Text>
                <Text>
                  Add a backup wallet to allow you to retrieve funds if you lose
                  your password and seed phrase.
                </Text>
              </Flex>
            </>
          }
        />
      </CardSection>

      <Button
        type="primary"
        size="large"
        disabled={true} // not in this iteration?
        onClick={() => gotoSettings(SettingsScreen.AddBackupWallet)}
      >
        Add backup wallet
      </Button>
    </>
  );
};
