import { Button, Flex, Typography } from 'antd';
import { LuRectangleEllipsis } from 'react-icons/lu';
import { TbWallet } from 'react-icons/tb';
import { styled } from 'styled-components';

import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums';
import { useSetup, useStore } from '@/hooks';

import { BackButton, CardFlex, CardTitle } from '../ui';
import { AccountRecoveryProvider } from './AccountRecoveryProvider';
import { RecoveryNotAvailable } from './components/RecoveryNotAvailable';

const { Text, Title, Paragraph } = Typography;

const IconContainer = styled.div`
  min-width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  align-self: center;
  justify-content: center;
  border: 1px solid ${COLOR.GRAY_3};
  border-radius: 8px;
  background-image: url('/icon-bg.svg');
`;

const RecoveryMethodCard = styled(CardFlex)<{ width?: number }>`
  width: ${({ width }) => (width ? `${width}px` : '412px')};
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
  .recovery-method-card-body {
    flex: 1;
  }
`;

const RecoveryViaBackupWallet = () => {
  const { storeState } = useStore();
  const { goto } = useSetup();
  const walletType = storeState?.lastProvidedBackupWallet?.type;

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbWallet size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">Via Backup Wallet</CardTitle>
        <Paragraph className="text-neutral-secondary text-center mb-32">
          Use the backup wallet you’ve set up during Pearl sign up.
        </Paragraph>
        {walletType === 'web3auth' ? (
          <Button
            onClick={() => goto(SetupScreen.SetupOnRamp)}
            type="primary"
            size="large"
            block
          >
            Recover with Backup Wallet
          </Button>
        ) : (
          <Paragraph className="text-neutral-tertiary text-center text-sm mb-0">
            Recovery with a Backup Wallet coming soon.
          </Paragraph>
        )}
      </div>
    </RecoveryMethodCard>
  );
};

const RecoveryViaSecretRecoveryPhrase = () => {
  return (
    <RecoveryMethodCard>
      <IconContainer>
        <LuRectangleEllipsis size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">
          Via Secret Recovery Phrase
        </CardTitle>
        <Paragraph className="text-neutral-secondary text-center mb-32">
          Enter the secret recovery phrase you should’ve backed up to a safe
          place.
        </Paragraph>
        <Paragraph className="text-neutral-tertiary text-center text-sm mb-0">
          Recovery with a Secret Recovery Phrase coming soon.
        </Paragraph>
      </div>
    </RecoveryMethodCard>
  );
};

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

export const AccountRecovery = () => {
  const isRecoveryAvailable = false; // Placeholder for actual recovery availability logic
  const hasBackupWalletsAcrossEveryChain = true; // Placeholder for actual backup wallets check

  return (
    <AccountRecoveryProvider>
      {isRecoveryAvailable ? (
        <SelectRecoveryMethod />
      ) : (
        <RecoveryNotAvailable
          hasBackupWallets={hasBackupWalletsAcrossEveryChain}
        />
      )}
    </AccountRecoveryProvider>
  );
};
