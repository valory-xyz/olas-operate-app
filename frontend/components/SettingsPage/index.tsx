import { Button, Card, Flex, Skeleton, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';
import { TbShieldHalfFilled } from 'react-icons/tb';
import { useBoolean } from 'usehooks-ts';

import { AddressLink, Alert, CardSection, cardStyles } from '@/components/ui';
import { COLOR, NA } from '@/constants';
import { SettingsScreen } from '@/enums';
import {
  useFeatureFlag,
  useMasterWalletContext,
  useMultisig,
  useRecoveryPhraseBackup,
  useServices,
  useSettings,
} from '@/hooks';
import { Address, Optional } from '@/types';

import { RecoveryModal } from './RecoveryModal';
import { YourFundsAtRiskAlert } from './YourFundsAtRiskAlert';

const { Text, Paragraph, Title } = Typography;

const SecretRecoveryPhraseSetting = () => {
  const { isBackedUp } = useRecoveryPhraseBackup();
  const {
    value: isRecoveryModalOpen,
    setTrue: showRecoveryModal,
    setFalse: handleClose,
  } = useBoolean(false);

  return (
    <>
      <CardSection $padding="24px" vertical gap={8}>
        <Flex gap={16}>
          <TbShieldHalfFilled
            fontSize={30}
            color={COLOR.TEXT_NEUTRAL_TERTIARY}
            className="-mt-4"
          />
          <Flex vertical gap={12}>
            <Text strong>Secret Recovery Phrase</Text>
            <Flex vertical gap={16}>
              <Text className="text-sm text-neutral-secondary">
                Back up your Secret Recovery Phrase so you never lose access to
                your Pearl account.
              </Text>
              <Alert
                showIcon
                type={isBackedUp ? 'success' : 'warning'}
                message={
                  isBackedUp
                    ? 'Secret Recovery Phrase backed up.'
                    : 'Secret Recovery Phrase not backed up.'
                }
                className="text-sm"
              />
              <Button
                type="default"
                className="w-fit"
                onClick={() => showRecoveryModal()}
              >
                Reveal Recovery Phrase
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </CardSection>

      {isRecoveryModalOpen && <RecoveryModal open onClose={handleClose} />}
    </>
  );
};

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
          <CardSection $padding="24px" $borderBottom vertical>
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
                  <Text strong>Backup Wallet</Text>
                </div>
                {walletBackup}
              </Flex>
            </Flex>

            {ownersIsFetched && !masterSafeBackupAddress && (
              <YourFundsAtRiskAlert />
            )}
          </CardSection>
        )}

        <SecretRecoveryPhraseSetting />
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
