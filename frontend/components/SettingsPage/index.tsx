import { Card, Flex, Skeleton, Typography } from 'antd';
import Title from 'antd/es/typography/Title';
import { isEmpty, isNil } from 'lodash';
import Image from 'next/image';
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
import { CardSection } from '../ui/CardSection';
import { cardStyles } from '../ui/cardStyles';

const { Text, Paragraph } = Typography;

const NoBackupWallet = () => {
  const { goto } = usePageState();

  return (
    <>
      <Text type="secondary" style={{ marginLeft: 52 }}>
        No backup wallet added.
      </Text>

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

const BackupWalletInfo = () => (
  <Flex gap={16}>
    <Image
      src="/wallet-icon.png"
      alt="wallet"
      width={36}
      height={36}
      className="mb-auto"
    />
    <div style={{ marginTop: 6, marginBottom: 6 }}>
      <Text strong>Backup wallet</Text>
    </div>
  </Flex>
);

const SettingsMain = () => {
  const isBackupViaSafeEnabled = useFeatureFlag('backup-via-safe');
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

  const hideWallet = !isBackupViaSafeEnabled && !masterSafeBackupAddress;

  return (
    <Flex style={cardStyles} vertical gap={16}>
      <Title level={3}>Settings</Title>
      <Card styles={{ body: { paddingTop: 0, paddingBottom: 0 } }}>
        <CardSection
          $padding="24px"
          $borderBottom={!hideWallet}
          align="center"
          gap={16}
        >
          <Image
            src="/password-icon.png"
            alt="password"
            width={36}
            height={36}
            className="mb-auto"
          />
          <Flex vertical gap={6}>
            <div style={{ marginTop: 6, marginBottom: 6 }}>
              <Paragraph strong className="mb-0">
                Password
              </Paragraph>
            </div>

            <Text style={{ lineHeight: 1 }}>••••••••••••••••••••</Text>
          </Flex>
        </CardSection>

        {hideWallet ? null : (
          <CardSection
            $padding="24px"
            $borderBottom={!!masterSafeBackupAddress}
            vertical
          >
            <BackupWalletInfo />
            {walletBackup}
          </CardSection>
        )}
      </Card>
    </Flex>
  );
};
