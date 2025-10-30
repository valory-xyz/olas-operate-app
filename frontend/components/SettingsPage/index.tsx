import { Card, Flex, Skeleton, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';

import { AddressLink, CardSection, cardStyles } from '@/components/ui';
import { NA } from '@/constants';
import { SettingsScreen } from '@/enums';
import {
  useFeatureFlag,
  useMasterWalletContext,
  useMultisig,
  useServices,
  useSettings,
} from '@/hooks';
import { Address, Optional } from '@/types';

import { YourFundsAtRiskAlert } from './YourFundsAtRiskAlert';

const { Text, Paragraph, Title } = Typography;

const SettingsMain = () => {
  const isBackupViaSafeEnabled = useFeatureFlag('backup-via-safe');
  const { selectedAgentConfig } = useServices();
  const {
    masterEoa,
    masterSafes,
    isLoading: isWalletsLoading,
  } = useMasterWalletContext();

  const masterSafe = masterSafes?.find(
    ({ evmChainId: chainId }) => selectedAgentConfig.evmHomeChainId === chainId,
  );

  const { owners, ownersIsFetched } = useMultisig(masterSafe);

  const masterSafeBackupAddresses = useMemo<Optional<Address[]>>(() => {
    if (!ownersIsFetched) return;
    if (!masterEoa) return;
    if (isNil(owners) || isEmpty(owners)) return [];

    // TODO: handle edge cases where there are multiple owners due to middleware failure,
    // or user interaction via safe.global
    return owners.filter(
      (owner) => owner.toLowerCase() !== masterEoa.address.toLowerCase(),
    );
  }, [ownersIsFetched, owners, masterEoa]);

  const masterSafeBackupAddress = useMemo<Optional<Address>>(() => {
    if (isNil(masterSafeBackupAddresses)) return;

    return masterSafeBackupAddresses[0];
  }, [masterSafeBackupAddresses]);

  const walletBackup = useMemo(() => {
    if (!isWalletsLoading && !masterSafe) {
      return <Text type="secondary">{NA}</Text>;
    }
    if (!ownersIsFetched) return <Skeleton.Input />;
    if (!masterSafeBackupAddress) {
      return <Text type="secondary">No backup wallet added.</Text>;
    }

    return (
      <AddressLink
        address={masterSafeBackupAddress}
        middlewareChain={selectedAgentConfig.middlewareHomeChainId}
      />
    );
  }, [
    isWalletsLoading,
    masterSafe,
    masterSafeBackupAddress,
    ownersIsFetched,
    selectedAgentConfig.middlewareHomeChainId,
  ]);

  const hideWallet = !isBackupViaSafeEnabled && !masterSafeBackupAddress;

  return (
    <Flex style={cardStyles} vertical gap={32}>
      <Title level={3} className="m-0">
        Settings
      </Title>
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
            <div className="my-6">
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
            <Flex gap={16}>
              <Image
                src="/wallet-icon.png"
                alt="wallet"
                width={36}
                height={36}
                className="mb-auto"
              />
              <Flex vertical gap={6}>
                <div className="my-6">
                  <Text strong>Backup wallet</Text>
                </div>
                {walletBackup}
              </Flex>
            </Flex>

            {ownersIsFetched && !masterSafeBackupAddress && (
              <YourFundsAtRiskAlert />
            )}
          </CardSection>
        )}
      </Card>
    </Flex>
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
