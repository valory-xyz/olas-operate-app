import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { CSSProperties } from 'react';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { Divider } from '@/components/ui/Divider';

const { Text, Title } = Typography;

const cardStyles: CSSProperties = {
  width: 552,
  margin: '0 auto',
};

const PearlWalletToExternalWallet = () => (
  <Flex vertical style={{ margin: '0 -32px' }}>
    <Divider />
    <Flex gap={16} style={{ padding: '12px 32px' }}>
      <Text>
        From{' '}
        <Text strong type="secondary">
          Pearl Wallet
        </Text>
      </Text>
      <ArrowRightOutlined style={{ fontSize: 12 }} />
      <Text>
        To{' '}
        <Text strong type="secondary">
          External Wallet
        </Text>
      </Text>
    </Flex>
    <Divider />
  </Flex>
);

type SelectAmountToWithdrawProps = {
  onBack: () => void;
  onContinue: () => void;
};

export const SelectAmountToWithdraw = ({
  onBack,
  onContinue,
}: SelectAmountToWithdrawProps) => {
  return (
    <CardFlex $noBorder $padding="32px" style={cardStyles}>
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <Flex vertical justify="space-between" gap={12}>
            <Title level={4} className="m-0">
              Select Amount to Withdraw
            </Title>
          </Flex>
        </Flex>

        <PearlWalletToExternalWallet />

        <Flex justify="space-between" align="center">
          SOON!
        </Flex>

        <Button onClick={onContinue} type="primary" block>
          Continue
        </Button>
      </Flex>
    </CardFlex>
  );
};
