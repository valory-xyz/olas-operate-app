import { Typography } from 'antd';
import { LuRectangleEllipsis } from 'react-icons/lu';

import { COLOR } from '@/constants/colors';

import { CardTitle, IconContainer } from '../../ui';
import { RecoveryMethodCard } from '../styles';

const { Paragraph } = Typography;

export const RecoveryViaSecretRecoveryPhrase = () => {
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
        <Paragraph
          className="flex align-center text-neutral-tertiary text-sm mb-0 justify-center"
          style={{ height: 40 }}
        >
          Recovery with a Secret Recovery Phrase coming soon.
        </Paragraph>
      </div>
    </RecoveryMethodCard>
  );
};
