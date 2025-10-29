import { Button, Card, Flex, Skeleton, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import Image from 'next/image';
import { useMemo } from 'react';
import { useBoolean } from 'usehooks-ts';

import { Pages } from '@/enums/Pages';
import { SettingsScreen } from '@/enums/SettingsScreen';
import {
  useFeatureFlag,
  useMasterWalletContext,
  useMultisig,
  usePageState,
  useRecoveryPhraseBackup,
  useServices,
  useSettings,
} from '@/hooks';
import { Address } from '@/types/Address';
import { Optional } from '@/types/Util';

import { AddressLink } from '../AddressLink';
import { CustomAlert } from '../Alert';
import { CardSection, cardStyles } from '../ui';
import { RecoveryModal } from './RecoveryModal';

const { Text, Paragraph, Title } = Typography;

const YourFundsAtRiskAlert = () => {
  const { goto } = usePageState();
  return (
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
              your password.
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
  );
};

const SettingsMain = () => {
  const isBackupViaSafeEnabled = useFeatureFlag('backup-via-safe');
  const { selectedAgentConfig } = useServices();
  const { masterEoa, masterSafes } = useMasterWalletContext();
  const { isBackedUp: isRecoveryPhraseBackedUp } = useRecoveryPhraseBackup();
  const {
    value: isRecoveryModalOpen,
    setTrue: showRecoveryModal,
    setFalse: handleClose,
  } = useBoolean(false);

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
    if (!ownersIsFetched) return <Skeleton.Input />;
    if (!masterSafeBackupAddress)
      return <Text type="secondary">No backup wallet added.</Text>;

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
    <Flex style={cardStyles} vertical gap={32}>
      <RecoveryModal open={isRecoveryModalOpen} onClose={handleClose} />
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

        {
          <CardSection $padding="24px" vertical gap={8}>
            <Flex gap={16}>
              <Image
                src="/wallet-icon.png"
                alt="wallet"
                width={36}
                height={36}
                className="mb-auto"
              />
              <Flex vertical gap={16} className="text-sm">
                <Text strong>Secret Recovery Phrase</Text>
                <span>
                  Back up your Secret Recovery Phrase so you never lose access
                  to your Pearl account.
                </span>
                {!isRecoveryPhraseBackedUp && (
                  <CustomAlert
                    showIcon
                    type="warning"
                    message="Secret Recovery Phrase not backed up."
                    className="text-sm"
                  />
                )}
                <Button
                  type="default"
                  className="w-fit"
                  onClick={() => showRecoveryModal()}
                >
                  Reveal Recovery Phrase
                </Button>
              </Flex>
            </Flex>
          </CardSection>
        }
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
