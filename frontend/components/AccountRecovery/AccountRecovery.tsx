import { Flex, Skeleton, Typography } from 'antd';
import { useMemo } from 'react';

import { SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';

import { BackButton } from '../ui';
import {
  AccountRecoveryProvider,
  useAccountRecoveryContext,
} from './AccountRecoveryProvider';
import { ApproveWithBackupWallet } from './components/ApproveWithBackupWallet/ApproveWithBackupWallet';
import { CreateNewPassword } from './components/CreateNewPassword';
import { EnterSecretRecoveryPhrase } from './components/EnterSecretRecoveryPhrase';
import { FundYourBackupWallet } from './components/FundYourBackupWallet';
import { RecoverExistingAccountCard } from './components/RecoverExistingAccountCard';
import { RecoveryNotAvailable } from './components/RecoveryNotAvailable';
import { ForgotPasswordCard } from './components/RecoveryViaBackupWallet';
import { SelectPasswordResetOption } from './components/SelectPasswordResetOption';
import { SetNewPasswordViaSRP } from './components/SetNewPasswordViaSRP';
import { RECOVERY_STEPS, RESET_METHOD } from './constants';
import { RecoveryMethodCard } from './styles';

const { Text, Title } = Typography;

const Loader = () => (
  <Flex align="center" justify="center" className="h-full">
    <RecoveryMethodCard>
      <Skeleton active paragraph={{ rows: 4 }} />
    </RecoveryMethodCard>
  </Flex>
);

const SelectRecoveryMethod = () => {
  const { goto } = useSetup();

  return (
    <Flex align="center" vertical>
      <BackButton
        onPrev={() => {
          goto(SETUP_SCREEN.Welcome);
        }}
      />
      <Title level={3} className="mt-12">
        Select Recovery Option
      </Title>
      <Text type="secondary">
        Pearl can&apos;t recover your password. Choose how to restore access or
        withdraw your funds.
      </Text>

      <Flex gap={24} style={{ marginTop: 56 }}>
        <ForgotPasswordCard />
        <RecoverExistingAccountCard />
      </Flex>
    </Flex>
  );
};

const SelectPasswordResetOptionStep = () => {
  const { onPrev } = useAccountRecoveryContext();

  return (
    <Flex align="center" vertical>
      <BackButton onPrev={onPrev} />
      <Title level={3} className="mt-12">
        Select Password Reset Option
      </Title>
      <Text type="secondary">
        You can restore access to your account via the seed phrase or the backup
        wallet.
      </Text>

      <Flex gap={24} style={{ marginTop: 56 }}>
        <SelectPasswordResetOption />
      </Flex>
    </Flex>
  );
};

const AccountRecoveryInner = () => {
  const { isLoading, isRecoveryAvailable, currentStep, selectedResetMethod } =
    useAccountRecoveryContext();

  const currentView = useMemo(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.SelectRecoveryMethod:
        return <SelectRecoveryMethod />;
      case RECOVERY_STEPS.SelectPasswordResetOption:
        return <SelectPasswordResetOptionStep />;
      // Backup-wallet path
      case RECOVERY_STEPS.CreateNewPassword:
        return <CreateNewPassword />;
      case RECOVERY_STEPS.FundYourBackupWallet:
        return <FundYourBackupWallet />;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        return <ApproveWithBackupWallet />;
      // SRP path
      case RECOVERY_STEPS.EnterSecretRecoveryPhrase:
        return <EnterSecretRecoveryPhrase />;
      case RECOVERY_STEPS.SetNewPasswordViaSRP:
        return <SetNewPasswordViaSRP />;
      default:
        return <SelectRecoveryMethod />;
    }
  }, [currentStep]);

  if (isLoading) return <Loader />;

  // Always show SelectRecoveryMethod and SelectPasswordResetOption without
  // the recovery guard — the availability check is handled inside the
  // SelectPasswordResetOption screen (backup wallet card disabled state).
  if (
    currentStep === RECOVERY_STEPS.SelectRecoveryMethod ||
    currentStep === RECOVERY_STEPS.SelectPasswordResetOption
  )
    return currentView;

  // SRP path bypasses the backup-wallet availability check — it uses the
  // mnemonic directly and does not require a Web3Auth backup wallet.
  if (selectedResetMethod !== RESET_METHOD.SRP && !isRecoveryAvailable) {
    return <RecoveryNotAvailable />;
  }

  return currentView;
};

export const AccountRecovery = () => (
  <AccountRecoveryProvider>
    <AccountRecoveryInner />
  </AccountRecoveryProvider>
);
