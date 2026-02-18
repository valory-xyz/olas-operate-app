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
import { FundYourBackupWallet } from './components/FundYourBackupWallet';
import { RecoveryNotAvailable } from './components/RecoveryNotAvailable';
import { RecoveryViaBackupWallet } from './components/RecoveryViaBackupWallet';
import { RecoveryViaSecretRecoveryPhrase } from './components/RecoveryViaSecretRecoveryPhrase';
import { RECOVERY_STEPS } from './constants';
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
        Select Recovery Method
      </Title>
      <Text type="secondary">
        Pearl can’t recover your password. Select the recovery method to restore
        access.
      </Text>

      <Flex gap={24} style={{ marginTop: 56 }}>
        <RecoveryViaBackupWallet />
        <RecoveryViaSecretRecoveryPhrase />
      </Flex>
    </Flex>
  );
};

const AccountRecoveryInner = () => {
  const { isLoading, isRecoveryAvailable, currentStep } =
    useAccountRecoveryContext();

  const currentView = useMemo(() => {
    switch (currentStep) {
      case RECOVERY_STEPS.SelectRecoveryMethod:
        return <SelectRecoveryMethod />;
      case RECOVERY_STEPS.CreateNewPassword:
        return <CreateNewPassword />;
      case RECOVERY_STEPS.FundYourBackupWallet:
        return <FundYourBackupWallet />;
      case RECOVERY_STEPS.ApproveWithBackupWallet:
        return <ApproveWithBackupWallet />;
      default:
        return <SelectRecoveryMethod />;
    }
  }, [currentStep]);

  if (isLoading) return <Loader />;
  if (!isRecoveryAvailable) return <RecoveryNotAvailable />;
  return currentView;
};

export const AccountRecovery = () => (
  <AccountRecoveryProvider>
    <AccountRecoveryInner />
  </AccountRecoveryProvider>
);
