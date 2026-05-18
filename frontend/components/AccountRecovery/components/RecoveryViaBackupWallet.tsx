import { Button, Typography } from 'antd';
import { TbShieldLock } from 'react-icons/tb';

import { COLOR } from '@/constants';

import { CardTitle, IconContainer } from '../../ui';
import { useAccountRecoveryContext } from '../AccountRecoveryProvider';
import { RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

export const ForgotPasswordCard = () => {
  const { onNext } = useAccountRecoveryContext();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbShieldLock size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">Forgot Password</CardTitle>
        <Paragraph
          className="text-neutral-secondary text-center mt-16"
          style={{ minHeight: 72 }}
        >
          Reset your password using the secret recovery phrase or the backup
          wallet.
        </Paragraph>
        <Button onClick={onNext} type="primary" size="large" block>
          Reset Password
        </Button>
      </div>
    </RecoveryMethodCard>
  );
};
