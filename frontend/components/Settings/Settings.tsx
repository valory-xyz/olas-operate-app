import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography } from 'antd';
import Link from 'next/link';
import { useMemo } from 'react';

import { truncateAddress } from '@/common-util';
import { UNICODE_SYMBOLS } from '@/constants/unicode';
import { PageState, SettingsScreen } from '@/enums';
import { usePageState } from '@/hooks';
import { useMasterSafe } from '@/hooks/useMasterSafe';
import { useSettings } from '@/hooks/useSettings';

import { Alert } from '../common/Alert';
import { CardTitle } from '../common/CardTitle';
import { CardSection } from '../styled/CardSection';
import { DebugInfoCard } from './DebugInfoCard';
import { SettingsAddBackupWallet } from './SettingsAddBackupWallet';

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
        return <SettingsAddBackupWallet />;
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
          onClick={() => goto(PageState.Main)}
        />
      }
    >
      <CardSection borderbottom="true" justify="space-between" align="center">
        <Flex vertical>
          <Paragraph strong>Password</Paragraph>
          <Text style={{ lineHeight: 1 }}>********</Text>
        </Flex>
      </CardSection>

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

      <DebugInfoCard />
    </Card>
  );
};

const NoBackupWallet = () => {
  const { goto: gotoSettings } = useSettings();
  return (
    <>
      <Text type="secondary">No backup wallet added.</Text>

      <CardSection style={{ marginTop: 12, marginBottom: 18 }}>
        <Alert
          type="warning"
          fullWidth
          showIcon
          message={
            <>
              <Flex vertical gap={5}>
                <Text className="font-weight-600">Your funds are at risk!</Text>
                <Text>You will lose any assets you send on other chains.</Text>
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
