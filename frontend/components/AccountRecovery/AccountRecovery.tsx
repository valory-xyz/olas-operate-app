import { Flex, Skeleton, Typography } from 'antd';

import { SetupScreen } from '@/enums';
import { useSetup } from '@/hooks';

import { BackButton } from '../ui';
import {
  AccountRecoveryProvider,
  useAccountRecoveryContext,
} from './AccountRecoveryProvider';
import { RecoveryNotAvailable } from './components/RecoveryNotAvailable';
import { RecoveryViaBackupWallet } from './components/RecoveryViaBackupWallet';
import { RecoveryViaSecretRecoveryPhrase } from './components/RecoveryViaSecretRecoveryPhrase';
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
          goto(SetupScreen.Welcome);
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
  const { isLoading, isRecoveryAvailable, hasBackupWallets } =
    useAccountRecoveryContext();

  return (
    <AccountRecoveryProvider>
      {isLoading ? (
        <Loader />
      ) : isRecoveryAvailable ? (
        <SelectRecoveryMethod />
      ) : (
        <RecoveryNotAvailable hasBackupWallets={hasBackupWallets} />
      )}
    </AccountRecoveryProvider>
  );
};

export const AccountRecovery = () => (
  <AccountRecoveryProvider>
    <AccountRecoveryInner />
  </AccountRecoveryProvider>
);
