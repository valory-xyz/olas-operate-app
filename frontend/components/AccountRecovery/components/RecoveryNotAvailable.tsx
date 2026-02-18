import { Button, Flex, Typography } from 'antd';
import { TbWallet } from 'react-icons/tb';
import { styled } from 'styled-components';

import { COLOR, SETUP_SCREEN } from '@/constants';
import { useSupportModal } from '@/context/SupportModalProvider';
import { useSetup } from '@/hooks';

import { CardFlex, CardTitle, IconContainer } from '../../ui';
import { useAccountRecoveryContext } from '../AccountRecoveryProvider';

const { Paragraph } = Typography;

const RecoveryNotAvailableCard = styled(CardFlex)`
  width: 512px;
  border-color: ${COLOR.WHITE};
  .ant-card-body {
    height: 100%;
  }
`;

export const RecoveryNotAvailable = () => {
  const { goto } = useSetup();
  const { toggleSupportModal } = useSupportModal();
  const { areAllBackupOwnersSame, hasBackupWalletsAcrossEveryChain } =
    useAccountRecoveryContext();

  return (
    <Flex align="center" justify="center" vertical className="h-full">
      <RecoveryNotAvailableCard $padding="32px">
        <Flex vertical gap={32}>
          <IconContainer $size={48}>
            <TbWallet size={20} fontSize={30} color={COLOR.PRIMARY} />
          </IconContainer>
          <Flex vertical gap={16}>
            <CardTitle className="m-0">Recovery Not Available</CardTitle>
            <Paragraph className="text-neutral-secondary text-center mb-32">
              This account has multiple Pearl Wallets.{' '}
              {!hasBackupWalletsAcrossEveryChain &&
                'The backup wallet is not set up for at least one Pearl Wallet.'}
              {!areAllBackupOwnersSame &&
                'The backup wallet is different across the Pearl Wallets.'}
            </Paragraph>
          </Flex>
        </Flex>

        <Flex vertical gap={16}>
          <Button
            onClick={() => goto(SETUP_SCREEN.Welcome)}
            type="primary"
            size="large"
            block
          >
            Back to Login
          </Button>
          <Button onClick={toggleSupportModal} size="large" block>
            Contact Support
          </Button>
        </Flex>
      </RecoveryNotAvailableCard>
    </Flex>
  );
};
