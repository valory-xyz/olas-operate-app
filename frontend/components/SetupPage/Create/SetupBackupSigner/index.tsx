import { Flex, Typography } from 'antd';
import { useCallback, useState } from 'react';

import { CardFlex } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import { useApplyBackupDuringSetup, useSetup } from '@/hooks';
import { Address } from '@/types/Address';
import { BackupWalletType } from '@/types/BackupWallet';
import { getErrorMessage } from '@/utils';

import { SetupCreateHeader } from '../SetupCreateHeader';
import { BackupWalletManual } from './BackupWalletManual';
import { BackupWalletWeb3Auth } from './BackupWalletWeb3Auth';

const { Title, Text } = Typography;

export const SetupBackupSigner = () => {
  const [backupWalletType, setBackupWalletType] =
    useState<BackupWalletType>('web3auth');
  const { goto } = useSetup();
  const applyBackupDuringSetup = useApplyBackupDuringSetup();
  const message = useMessageApi();

  const handleBackupFinish = useCallback(
    async (address: Address) => {
      try {
        await applyBackupDuringSetup(address);
      } catch (e: unknown) {
        // Don't block onboarding — backend startup auto-migration writes
        // canonical_backup_owner once Safes deploy. User will land in State A
        // until then, and in State B once auto-migration completes.
        message.error(getErrorMessage(e));
      } finally {
        goto(SETUP_SCREEN.AgentOnboarding);
      }
    },
    [applyBackupDuringSetup, goto, message],
  );

  return (
    <CardFlex $noBorder>
      <SetupCreateHeader />
      <Title level={3}>Set backup wallet</Title>
      <Flex vertical gap={16}>
        <Text className="mb-16">
          To help keep your funds safe, set up a backup wallet. Alternatively,
          you can add your existing crypto wallet as a backup if you have one.
        </Text>

        {backupWalletType === 'web3auth' && (
          <BackupWalletWeb3Auth
            onSetUpManuallyClick={() => setBackupWalletType('manual')}
            onFinish={handleBackupFinish}
          />
        )}
        {backupWalletType === 'manual' && (
          <BackupWalletManual onFinish={handleBackupFinish} />
        )}
      </Flex>
    </CardFlex>
  );
};
