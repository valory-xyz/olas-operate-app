import { Flex, Typography } from 'antd';
import { useState } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { Web3AuthProvider } from '@/context/Web3AuthProvider';
import { SetupScreen } from '@/enums/SetupScreen';
import { BackupWalletType } from '@/types/BackupWallet';

import { SetupCreateHeader } from '../SetupCreateHeader';
import { BackupWalletManual } from './BackupWalletManual';
import { BackupWalletWeb3Auth } from './BackupWalletWeb3Auth';

const { Title, Text } = Typography;

export const SetupBackupSigner = () => {
  const [backupWalletView, setBackupWalletView] =
    useState<BackupWalletType>('web3auth');

  return (
    <Web3AuthProvider>
      <CardFlex $noBorder>
        <SetupCreateHeader prev={SetupScreen.SetupSeedPhrase} />
        <Title level={3}>Set backup wallet</Title>
        <Flex vertical gap={16}>
          <Text className="mb-16">
            To help keep your funds safe, set up a backup wallet. Alternatively,
            you can add your existing crypto wallet as a backup if you have one.
          </Text>

          {backupWalletView === 'web3auth' && (
            <BackupWalletWeb3Auth
              onSetUpManuallyClick={() => setBackupWalletView('manual')}
            />
          )}
          {backupWalletView === 'manual' && <BackupWalletManual />}
        </Flex>
      </CardFlex>
    </Web3AuthProvider>
  );
};
