import { SettingOutlined } from '@ant-design/icons';
import { Card, Flex, Skeleton, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';

import { Pages } from '@/enums/Pages';
import { SettingsScreen } from '@/enums/SettingsScreen';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useMultisig } from '@/hooks/useMultisig';
import { usePageState } from '@/hooks/usePageState';
import { useServices } from '@/hooks/useServices';
import { useSettings } from '@/hooks/useSettings';
import { useMasterWalletContext } from '@/hooks/useWallet';
import { Address } from '@/types/Address';
import { Optional } from '@/types/Util';

import { AddressLink } from '../AddressLink';
import { CustomAlert } from '../Alert';
import { CardTitle } from '../Card/CardTitle';
import { GoToLoginPageButton } from '../Pages/GoToLoginPageButton';
import { GoToMainPageButton } from '../Pages/GoToMainPageButton';
import { CardSection } from '../styled/CardSection';
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
      default:
        return null;
    }
  }, [screen]);

  return settingsScreen;
};

const SettingsMain = () => {
  const isBackupViaSafeEnabled = useFeatureFlag('backup-via-safe');
  const { isUserLoggedIn } = usePageState();
  const { selectedAgentConfig } = useServices();
  const { masterEoa, masterSafes } = useMasterWalletContext();

  const masterSafe = masterSafes?.find(
    ({ evmChainId: chainId }) => selectedAgentConfig.evmHomeChainId === chainId,
  );

  const { owners, ownersIsFetched } = useMultisig(masterSafe);

  const masterSafeBackupAddresses = useMemo<Optional<Address[]>>(() => {
    if (!ownersIsFetched) return;
    if (!masterEoa) return;
    if (isNil(owners) || isEmpty(owners)) return [];

    // TODO: handle edge cases where there are multiple owners due to middleware failure, or user interaction via safe.global
    return owners.filter(
      (owner) => owner.toLowerCase() !== masterEoa.address.toLowerCase(),
    );
  }, [ownersIsFetched, owners, masterEoa]);

  const masterSafeBackupAddress = useMemo<Optional<Address>>(() => {
    if (isNil(masterSafeBackupAddresses)) return;

    return masterSafeBackupAddresses[0];
  }, [masterSafeBackupAddresses]);

  const walletBackup = useMemo(() => {
    if (!ownersIsFetched) return <Skeleton.Input />;
    if (!masterSafeBackupAddress) return <NoBackupWallet />;

    return (
      <AddressLink
        address={masterSafeBackupAddress}
        middlewareChain={selectedAgentConfig.middlewareHomeChainId}
      />
    );
  }, [
    masterSafeBackupAddress,
    ownersIsFetched,
    selectedAgentConfig.middlewareHomeChainId,
  ]);

  return (
    <Card
      title={<SettingsTitle />}
      bordered={false}
      styles={{ body: { paddingTop: 0, paddingBottom: 0 } }}
      extra={isUserLoggedIn ? <GoToMainPageButton /> : <GoToLoginPageButton />}
    >
      {/* Password */}
      <CardSection
        $padding="24px"
        $borderBottom={true}
        justify="space-between"
        align="center"
      >
        <Flex vertical>
          <Paragraph strong>Password</Paragraph>
          <Text style={{ lineHeight: 1 }}>********</Text>
        </Flex>
      </CardSection>

      {/* Wallet backup 
        If there's no backup address and adding it
        via safe is disabled - hide the section
      */}
      {!isBackupViaSafeEnabled && !masterSafeBackupAddress ? null : (
        <CardSection
          $padding="24px"
          $borderBottom={masterSafeBackupAddress ? true : false}
          vertical
          gap={8}
        >
          <Text strong>Backup wallet</Text>
          {walletBackup}
        </CardSection>
      )}

      {/* Debug info */}
      <DebugInfoSection />
    </Card>
  );
};
