import { Button, Card, Flex, Skeleton, Typography } from 'antd';
import { isEmpty, isNil } from 'lodash';
import { useMemo } from 'react';
import {
  TbFileText,
  TbShieldHalfFilled,
  TbShieldLock,
  TbWallet,
} from 'react-icons/tb';
import { useBoolean } from 'usehooks-ts';

import {
  AddressLink,
  Alert,
  CardSection,
  cardStyles,
  IconContainer,
} from '@/components/ui';
import { COLOR, NA } from '@/constants';
import { SettingsScreenMap } from '@/constants/screen';
import {
  useFeatureFlag,
  useMasterWalletContext,
  useMnemonicExists,
  useMultisig,
  useRecoveryPhraseBackup,
  useServices,
  useSettings,
} from '@/hooks';
import { Address, Optional } from '@/types';

import { RecoveryModal } from './RecoveryModal';
import { SettingsDrawer } from './SettingsDrawer';
import { YourFundsAtRiskAlert } from './YourFundsAtRiskAlert';

const { Text, Paragraph, Title } = Typography;

const DefaultSettingsSection = ({ openDrawer }: { openDrawer: () => void }) => (
  <CardSection $padding="24px">
    <Flex gap={16}>
      <IconContainer>
        <TbFileText size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
      </IconContainer>
      <Flex vertical>
        <Text strong className="my-6">
          Default Settings
        </Text>
        <Text type="secondary" className="text-sm mb-16">
          Predefined system values, for reference only.
        </Text>
        <Button className="w-max text-sm" onClick={openDrawer}>
          View Default Settings
        </Button>
      </Flex>
    </Flex>
  </CardSection>
);

const SecretRecoveryPhraseSetting = () => {
  const { isBackedUp } = useRecoveryPhraseBackup();
  const { mnemonicExists } = useMnemonicExists();
  const {
    value: isRecoveryModalOpen,
    setTrue: showRecoveryModal,
    setFalse: handleClose,
  } = useBoolean(false);

  // Don't show Secret Recovery Phrase section if mnemonic doesn't exist
  if (!mnemonicExists) return null;

  return (
    <>
      <CardSection $padding="24px" $borderTop vertical gap={8}>
        <Flex gap={16}>
          <IconContainer $borderWidth={2}>
            <TbShieldHalfFilled
              size={20}
              fontSize={30}
              color={COLOR.TEXT_NEUTRAL_TERTIARY}
            />
          </IconContainer>
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
                className="w-fit text-sm"
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
  const {
    value: isDrawerOpen,
    setTrue: openDrawer,
    setFalse: closeDrawer,
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
          <IconContainer>
            <TbShieldLock size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
          </IconContainer>
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
              <IconContainer>
                <TbWallet size={20} color={COLOR.TEXT_NEUTRAL_TERTIARY} />
              </IconContainer>
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

        <DefaultSettingsSection openDrawer={openDrawer} />
        <SecretRecoveryPhraseSetting />
      </Card>
      <SettingsDrawer isDrawerOpen={isDrawerOpen} onClose={closeDrawer} />
    </Flex>
  );
};

export const Settings = () => {
  const { screen } = useSettings();
  const settingsScreen = useMemo(() => {
    switch (screen) {
      case SettingsScreenMap.Main:
        return <SettingsMain />;
      default:
        return null;
    }
  }, [screen]);

  return settingsScreen;
};
