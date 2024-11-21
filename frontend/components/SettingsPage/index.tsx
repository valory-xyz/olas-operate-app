import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Typography } from 'antd';
import { isNil } from 'lodash';
import Link from 'next/link';
import { useMemo } from 'react';

import { MiddlewareChain } from '@/client';
import { UNICODE_SYMBOLS } from '@/constants/symbols';
import { EXPLORER_URL } from '@/constants/urls';
import { Pages } from '@/enums/Pages';
import { SettingsScreen } from '@/enums/SettingsScreen';
import { useMultisig } from '@/hooks/useMultisig';
import { usePageState } from '@/hooks/usePageState';
import { useSettings } from '@/hooks/useSettings';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { Optional } from '@/types/Util';
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

const NoBackupWallet = () => {
  const { goto } = usePageState();

  return (
    <>
      <Text type="secondary">No backup wallet added.</Text>

      <CardSection style={{ marginTop: 12 }}>
        <CustomAlert
          type="warning"
          fullWidth
          showIcon
          message={
            <Flex vertical gap={5}>
              <span className="font-weight-600">Your funds are at risk!</span>
              <span>
                Add a backup wallet to allow you to retrieve funds if you lose
                your password and seed phrase.
              </span>
              <Text
                className="pointer hover-underline text-primary"
                onClick={() => goto(Pages.AddBackupWalletViaSafe)}
              >
                See instructions
              </Text>
            </Flex>
          }
        />
      </CardSection>
    </>
  );
};

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
  const { masterEoa, masterSafes } = useMasterWalletContext();

  const { owners } = useMultisig(
    masterSafes?.[0], // TODO: all master safes should have the same address, but dirty implementation
  );

  const { goto } = usePageState();

  const masterSafeBackupAddresses = useMemo<Optional<Address[]>>(() => {
    if (!owners) return;
    if (!masterEoa) return;

    // TODO: handle edge cases where there are multiple owners due to middleware failure, or user interaction via safe.global
    return owners.filter((owner) => owner !== masterEoa.address);
  }, [owners, masterEoa]);

  const masterSafeBackupAddress = useMemo<Optional<Address>>(() => {
    if (isNil(masterSafeBackupAddresses)) return;
    if (!masterSafeBackupAddresses?.[0]) return;

    return masterSafeBackupAddresses[0];
  }, [masterSafeBackupAddresses]);

  const truncatedBackupSafeAddress: Optional<string> = useMemo(() => {
    if (masterSafeBackupAddress && masterSafeBackupAddress?.length) {
      return truncateAddress(masterSafeBackupAddress);
    }
  }, [masterSafeBackupAddress]);

  return (
    <Card
      title={<SettingsTitle />}
      bordered={false}
      styles={{
        body: {
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
      extra={
        <Button
          size="large"
          icon={<CloseOutlined />}
          onClick={() => goto(Pages.Main)}
        />
      }
    >
      {/* Password */}
      <CardSection
        padding="24px"
        borderbottom="true"
        justify="space-between"
        align="center"
      >
        <Flex vertical>
          <Paragraph strong>Password</Paragraph>
          <Text style={{ lineHeight: 1 }}>********</Text>
        </Flex>
      </CardSection>

      {/* Wallet backup */}
      <CardSection
        padding="24px"
        borderbottom={masterSafeBackupAddress ? 'true' : 'false'}
        vertical
        gap={8}
      >
        <Text strong>Backup wallet</Text>
        {masterSafeBackupAddress ? (
          <Link
            type="link"
            target="_blank"
            href={`${EXPLORER_URL[MiddlewareChain.GNOSIS]}/address/${masterSafeBackupAddress}`} // TODO: dynamic by selected agent type's home_chain_id
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
