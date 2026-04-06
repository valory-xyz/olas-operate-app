import { RightOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { TbFolderOpen } from 'react-icons/tb';

import { COLOR, SETUP_SCREEN } from '@/constants';
import { useSetup } from '@/hooks';

import { CardTitle, IconContainer } from '../../ui';
import { RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

export const RecoverExistingAccountCard = () => {
  const { goto } = useSetup();

  return (
    <RecoveryMethodCard>
      <IconContainer>
        <TbFolderOpen size={20} fontSize={30} color={COLOR.PRIMARY} />
      </IconContainer>
      <div className="recovery-method-card-body">
        <CardTitle className="mb-8 text-lg">
          Recover an Existing Pearl Account
        </CardTitle>
        <Paragraph className="text-neutral-secondary text-center mb-32">
          Your account data is stored locally. If you have it from another
          machine, you may recover your Pearl account.
        </Paragraph>
        <Button
          onClick={() => goto(SETUP_SCREEN.MigrateOperateFolder)}
          type="primary"
          size="large"
          block
          icon={<RightOutlined />}
          iconPosition="end"
        >
          View Instructions
        </Button>
      </div>
    </RecoveryMethodCard>
  );
};
