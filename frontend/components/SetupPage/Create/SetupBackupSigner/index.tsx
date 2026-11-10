import { Flex, Skeleton, Typography } from 'antd';
import { useCallback, useState } from 'react';

import { CardFlex } from '@/components/ui';
import { SETUP_SCREEN } from '@/constants';
import { useMessageApi } from '@/context/MessageProvider';
import {
  useApplyBackupDuringSetup,
  useElectronApi,
  useLatchedWeb3AuthEnabled,
  useSetup,
} from '@/hooks';
import { BackupWalletError } from '@/service/BackupWalletService';
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
  const {
    goto,
    isReplacingBackup,
    setIsReplacingBackup,
    setPassword,
    setBackupSigner,
  } = useSetup();
  const { logEvent } = useElectronApi();
  // Decided once for this screen, so a later refetch can't swap views mid-flow.
  const isWeb3AuthEnabled = useLatchedWeb3AuthEnabled(
    SETUP_SCREEN.SetupBackupSigner,
  );
  const isWeb3AuthStatusLoading = isWeb3AuthEnabled === undefined;
  const shownBackupWalletType = isWeb3AuthEnabled ? backupWalletType : 'manual';
  const applyBackupDuringSetup = useApplyBackupDuringSetup();
  const message = useMessageApi();

  const handleBackupFinish = useCallback(
    async (address: Address, type: BackupWalletType) => {
      try {
        await applyBackupDuringSetup(address);
      } catch (e: unknown) {
        message.error(getErrorMessage(e));
        const code = e instanceof BackupWalletError ? e.code : 'UNKNOWN';
        logEvent?.(
          `Backup wallet apply during setup failed (${code}): ${getErrorMessage(e)}`,
        );
        // Replacing: canonical still holds the old backup, and auto-migration won't
        // change it. Stay here, keeping the password, so the user can retry.
        if (isReplacingBackup) return;
        // Otherwise don't block onboarding — backend startup auto-migration writes
        // canonical_backup_owner once Safes deploy. User will land in State A
        // until then, and in State B once auto-migration completes.
        setPassword(null);
      }
      if (isReplacingBackup) setBackupSigner({ address, type });
      setIsReplacingBackup(false);
      goto(SETUP_SCREEN.AgentOnboarding);
    },
    [
      applyBackupDuringSetup,
      goto,
      isReplacingBackup,
      logEvent,
      message,
      setIsReplacingBackup,
      setPassword,
      setBackupSigner,
    ],
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

        {/* Wait for the status: switching views later would drop a typed address. */}
        {isWeb3AuthStatusLoading && <Skeleton active />}
        {!isWeb3AuthStatusLoading && shownBackupWalletType === 'web3auth' && (
          <BackupWalletWeb3Auth
            onSetUpManuallyClick={() => setBackupWalletType('manual')}
            onFinish={(address) => handleBackupFinish(address, 'web3auth')}
            // The apply happens asynchronously inside onFinish. If it fails we
            // show an error toast; suppress the always-fires "success" toast
            // so the user never sees a success+error pair in sequence.
            showSuccessMessage={false}
          />
        )}
        {!isWeb3AuthStatusLoading && shownBackupWalletType === 'manual' && (
          <BackupWalletManual
            onFinish={(address) => handleBackupFinish(address, 'manual')}
            onWeb3AuthFinish={(address) =>
              handleBackupFinish(address, 'web3auth')
            }
            isWeb3AuthEnabled={!!isWeb3AuthEnabled}
          />
        )}
      </Flex>
    </CardFlex>
  );
};
