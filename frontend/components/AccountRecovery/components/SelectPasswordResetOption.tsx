import { Button, Typography } from 'antd';
import { TbKey, TbWallet } from 'react-icons/tb';

import { COLOR } from '@/constants';

import { CardTitle, IconContainer } from '../../ui';
import { useAccountRecoveryContext } from '../AccountRecoveryProvider';
import { RESET_METHOD } from '../constants';
import { RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

const SrpCard = () => {
  const { setSelectedResetMethod, onNext } = useAccountRecoveryContext();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbKey size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">
          Reset via Recovery Phrase
        </CardTitle>
        <Paragraph
          className="text-neutral-secondary text-center mt-16"
          style={{ minHeight: 72 }}
        >
          Use your 12-word secret recovery phrase to reset your password.
        </Paragraph>
        <Button
          onClick={() => {
            setSelectedResetMethod(RESET_METHOD.SRP);
            onNext();
          }}
          type="primary"
          size="large"
          block
        >
          Continue
        </Button>
      </div>
    </RecoveryMethodCard>
  );
};

const BackupWalletCard = () => {
  const { isRecoveryAvailable, setSelectedResetMethod, onNext } =
    useAccountRecoveryContext();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbWallet size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">Reset via Backup Wallet</CardTitle>
        <Paragraph
          className="text-neutral-secondary text-center mt-16"
          style={{ minHeight: 72 }}
        >
          Use the backup wallet you set up during Pearl sign up to reset your
          password.
        </Paragraph>
        {isRecoveryAvailable ? (
          <Button
            onClick={() => {
              setSelectedResetMethod(RESET_METHOD.BackupWallet);
              onNext();
            }}
            type="primary"
            size="large"
            block
          >
            Continue
          </Button>
        ) : (
          <Paragraph
            className="flex align-center text-neutral-tertiary text-sm mb-0 justify-center"
            style={{ height: 40 }}
          >
            No backup wallet set up.
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
