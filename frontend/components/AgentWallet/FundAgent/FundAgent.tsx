import { Flex, Typography } from 'antd';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';

const { Title, Text } = Typography;

const FundAgentTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Fund Agent
    </Title>
    <Text>Enter the token amounts you want to send to your AI agent.</Text>
  </Flex>
);

type FundAgentProps = { onBack: () => void };

export const FundAgent = ({ onBack }: FundAgentProps) => {
  return (
    <CardFlex $noBorder $padding="32px" className="w-full">
      <Flex gap={32} vertical>
        <Flex gap={12} vertical>
          <BackButton onPrev={onBack} />
          <FundAgentTitle />
        </Flex>
      </Flex>
    </CardFlex>
  );
};
