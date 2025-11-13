import { Button, Flex, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';
import { styled } from 'styled-components';

import { COMMUNITY_ASSISTANCE_URL } from '@/constants';
import { COLOR } from '@/constants/colors';
import { SetupScreen } from '@/enums';
import { useSetup } from '@/hooks';

import { CardFlex, CardTitle } from '../../ui';

const { Paragraph } = Typography;

const IconContainer = styled.div`
  min-width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  align-self: center;
  justify-content: center;
  border: 1px solid ${COLOR.GRAY_3};
  border-radius: 8px;
  background-image: url('/icon-bg.svg');
`;

const RecoveryNotAvailableCard = styled(CardFlex)`
  width: 512px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

export const RecoveryNotAvailable = () => {
  const { goto } = useSetup();

  return (
    <Flex align="center" justify="center" vertical className="h-full">
      <RecoveryNotAvailableCard $padding="32px">
        <Flex vertical gap={32}>
          <IconContainer>
            <TbWallet size={20} fontSize={30} color={COLOR.PRIMARY} />
          </IconContainer>
          <Flex vertical gap={16}>
            <CardTitle className="m-0">Recovery Not Available</CardTitle>
            <Paragraph className="text-neutral-secondary text-center mb-32">
              This account has multiple Pearl Wallets. The backup wallet is
              different across the Pearl Wallets.
            </Paragraph>
          </Flex>
        </Flex>

        <Button
          onClick={() => goto(SetupScreen.Welcome)}
          type="primary"
          size="large"
          block
          className="mb-16"
        >
          Back to Login
        </Button>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={COMMUNITY_ASSISTANCE_URL}
          className="text-center"
        >
          Get community assistance via a Discord ticket ↗
        </a>
      </RecoveryNotAvailableCard>
    </Flex>
  );
};
