import { Flex, Typography } from 'antd';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';

const { Title, Text } = Typography;

const DepositTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Deposit
    </Title>
    <Text>Hello deposit.</Text>
  </Flex>
);

type FundAgentProps = { onBack: () => void };

export const Deposit = ({ onBack }: FundAgentProps) => {
  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <DepositTitle />
        </Flex>
      </Flex>
    </CardFlex>
  );
};
