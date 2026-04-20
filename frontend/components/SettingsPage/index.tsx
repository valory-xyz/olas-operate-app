import { Button, Card, Flex, Typography } from 'antd';
import { useMemo } from 'react';
import { TbFileText, TbShieldHalfFilled, TbShieldLock } from 'react-icons/tb';
import { useBoolean } from 'usehooks-ts';

import { Alert, CardSection, cardStyles, IconContainer } from '@/components/ui';
import { COLOR } from '@/constants';
import { SettingsScreenMap } from '@/constants/screen';
import {
  useMnemonicExists,
  useRecoveryPhraseBackup,
  useSettings,
} from '@/hooks';

import { BackupWalletSection } from './BackupWallet';
import {
  AddBackupWalletManualScreen,
  AddBackupWalletMethodScreen,
  AddBackupWalletProvider,
} from './BackupWallet/AddBackupWalletFlow';
import {
  UpdateBackupWalletConfirmScreen,
  UpdateBackupWalletManualScreen,
  UpdateBackupWalletMethodScreen,
  UpdateBackupWalletProvider,
} from './BackupWallet/UpdateBackupWalletFlow';
import { RecoveryModal } from './RecoveryModal';
import { SettingsDrawer } from './SettingsDrawer';

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
  const {
    value: isDrawerOpen,
    setTrue: openDrawer,
    setFalse: closeDrawer,
  } = useBoolean(false);

  return (
    <Flex style={cardStyles} vertical gap={32}>
      <Title level={3} className="m-0">
        Settings
      </Title>
      <Card styles={{ body: { paddingTop: 0, paddingBottom: 0 } }}>
        <CardSection $padding="24px" $borderBottom align="center" gap={16}>
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

        <BackupWalletSection />

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
      case SettingsScreenMap.AddBackupWalletMethod:
        return <AddBackupWalletMethodScreen />;
      case SettingsScreenMap.AddBackupWalletManual:
        return <AddBackupWalletManualScreen />;
      case SettingsScreenMap.UpdateBackupWalletMethod:
        return <UpdateBackupWalletMethodScreen />;
      case SettingsScreenMap.UpdateBackupWalletManual:
        return <UpdateBackupWalletManualScreen />;
      case SettingsScreenMap.UpdateBackupWalletConfirm:
        return <UpdateBackupWalletConfirmScreen />;
      default:
        return null;
    }
  }, [screen]);

  return (
    <AddBackupWalletProvider>
      <UpdateBackupWalletProvider>{settingsScreen}</UpdateBackupWalletProvider>
    </AddBackupWalletProvider>
  );
};
