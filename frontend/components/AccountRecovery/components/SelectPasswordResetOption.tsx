import { Button, Typography } from 'antd';
import { TbCreditCard, TbWallet } from 'react-icons/tb';

import { COLOR } from '@/constants';

import { CardTitle, IconContainer } from '../../ui';
import { useAccountRecoveryContext } from '../AccountRecoveryProvider';
import { RESET_METHOD } from '../constants';
import { RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

const SrpCard = () => {
  const { selectResetMethodAndProceed } = useAccountRecoveryContext();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbCreditCard size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">
          Via Secret Recovery Phrase
        </CardTitle>
        <Paragraph
          className="text-neutral-secondary text-center mt-16"
          style={{ minHeight: 72 }}
        >
          Enter the secret recovery phrase you&apos;ve received during Pearl
          sign up.
        </Paragraph>
        <Button
          onClick={() => selectResetMethodAndProceed(RESET_METHOD.SRP)}
          type="primary"
          size="large"
          block
        >
          Reset via Recovery Phrase
        </Button>
      </div>
    </RecoveryMethodCard>
  );
};

const BackupWalletCard = () => {
  const { isRecoveryAvailable, selectResetMethodAndProceed } =
    useAccountRecoveryContext();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbWallet size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">Via Backup Wallet</CardTitle>
        <Paragraph
          className="text-neutral-secondary text-center mt-16"
          style={{ minHeight: 72 }}
        >
          Reset with the backup wallet you&apos;ve set up during Pearl sign up.
        </Paragraph>
        {isRecoveryAvailable ? (
          <Button
            onClick={() =>
              selectResetMethodAndProceed(RESET_METHOD.BackupWallet)
            }
            size="large"
            block
          >
            Reset via Backup Wallet
          </Button>
        ) : (
          <Paragraph
            className="flex align-center text-neutral-tertiary text-sm mb-0 justify-center"
            style={{ height: 40 }}
          >
            No backup wallet found. Set up a backup wallet first.
          </Paragraph>
        )}
      </div>
    </RecoveryMethodCard>
  );
};

export const SelectPasswordResetOption = () => (
  <>
    <SrpCard />
    <BackupWalletCard />
  </>
);
