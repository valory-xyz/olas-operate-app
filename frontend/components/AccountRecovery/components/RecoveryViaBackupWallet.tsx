import { Button, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';

import { COLOR } from '@/constants';

import { CardTitle, IconContainer } from '../../ui';
import { useAccountRecoveryContext } from '../AccountRecoveryProvider';
import { RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

type ForgotPasswordCardProps = {
  isRecoveryAvailable: boolean;
};

export const ForgotPasswordCard = ({
  isRecoveryAvailable,
}: ForgotPasswordCardProps) => {
  const { onNext } = useAccountRecoveryContext();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbWallet size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">Forgot Password</CardTitle>
        <Paragraph className="text-neutral-secondary text-center mb-32">
          Reset your password using the backup wallet you set up during Pearl
          sign up.
        </Paragraph>
        {isRecoveryAvailable ? (
          <Button onClick={onNext} type="primary" size="large" block>
            Reset Password
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

/**
 * @deprecated Use ForgotPasswordCard instead
 */
export const RecoveryViaBackupWallet = ForgotPasswordCard;
