import { Button, Flex, Typography } from 'antd';
import { LuRectangleEllipsis } from 'react-icons/lu';
import { TbWallet } from 'react-icons/tb';
import { styled } from 'styled-components';

import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums';
import { useSetup } from '@/hooks';

import { BackButton, CardFlex, CardTitle } from '../ui';

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

const RecoveryMethodCard = styled(CardFlex)`
  width: 370px;
  border-color: ${COLOR.WHITE};

  .ant-card-body {
    height: 100%;
  }

  .recovery-method-card-body {
    flex: 1;
  }
`;

const RecoveryViaBackupWallet = () => {
  const { goto } = useSetup();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbWallet size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">Via Backup Wallet</CardTitle>
        <Text className="text-neutral-secondary"></Text>
        <Paragraph className="text-neutral-secondary text-center mb-32">
          Use the backup wallet you’ve set up during Pearl sign up.
        </Paragraph>
        <Button
          onClick={() => goto(SetupScreen.SetupOnRamp)}
          type="primary"
          size="large"
          block
        >
          Recover with Backup Wallet
        </Button>
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
        <Text className="text-neutral-secondary"></Text>
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

export const AccountRecovery = () => {
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
