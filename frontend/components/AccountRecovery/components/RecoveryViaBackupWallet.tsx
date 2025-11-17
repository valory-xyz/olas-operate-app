import { Button, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';

import { COLOR } from '@/constants';
import { useStore, useWeb3AuthBackupWallet } from '@/hooks';

import { CardTitle } from '../../ui';
import { useAccountRecoveryContext } from '../AccountRecoveryProvider';
import { IconContainer, RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

export const RecoveryViaBackupWallet = () => {
  const { onNext } = useAccountRecoveryContext();
  const { storeState } = useStore();
  const walletType = storeState?.lastProvidedBackupWallet?.type;

  const { openWeb3AuthModel } = useWeb3AuthBackupWallet({
    onFinish: onNext,
  });

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
          <Button onClick={openWeb3AuthModel} type="primary" size="large" block>
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
