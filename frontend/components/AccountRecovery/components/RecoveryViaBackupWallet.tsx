import { Button, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';

import { COLOR } from '@/constants';
import { useStore } from '@/hooks';

import { CardTitle, IconContainer } from '../../ui';
import { useAccountRecoveryContext } from '../AccountRecoveryProvider';
import { RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

export const RecoveryViaBackupWallet = () => {
  const { onNext } = useAccountRecoveryContext();
  const { storeState } = useStore();
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
          <Button onClick={onNext} type="primary" size="large" block>
            Recover with Backup Wallet
          </Button>
        ) : (
          <Paragraph
            className="flex align-center text-neutral-tertiary text-sm mb-0 justify-center"
            style={{ height: 40 }}
          >
            Recovery with a Backup Wallet coming soon.
          </Paragraph>
        )}
      </div>
    </RecoveryMethodCard>
  );
};
