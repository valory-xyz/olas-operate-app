import { Flex, Typography } from 'antd';
import { useState } from 'react';

import { CardFlex } from '@/components/styled/CardFlex';
import { SetupScreen } from '@/enums/SetupScreen';
import { BackupWalletType } from '@/types/BackupWallet';

import { SetupCreateHeader } from '../SetupCreateHeader';
import { BackupWalletManual } from './BackupWalletManual';
import { BackupWalletWeb3Auth } from './BackupWalletWeb3Auth';

const { Title, Text } = Typography;

export const SetupBackupSigner = () => {
  const [backupWalletType, setBackupWalletType] =
    useState<BackupWalletType>('web3auth');

  return (
    <CardFlex $noBorder>
      <SetupCreateHeader prev={SetupScreen.SetupSeedPhrase} />
      <Title level={3}>Set backup wallet</Title>
      <Flex vertical gap={16}>
        <Text className="mb-16">
          To help keep your funds safe, set up a backup wallet. Alternatively,
          you can add your existing crypto wallet as a backup if you have one.
        </Text>

        {backupWalletType === 'web3auth' && (
          <BackupWalletWeb3Auth
            onSetUpManuallyClick={() => setBackupWalletType('manual')}
          />
        )}
        {backupWalletType === 'manual' && <BackupWalletManual />}
      </Flex>
    </CardFlex>
  );
};
