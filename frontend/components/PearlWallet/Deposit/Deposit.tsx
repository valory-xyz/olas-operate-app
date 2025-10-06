import { ArrowRightOutlined } from '@ant-design/icons';
import { Flex, Typography } from 'antd';

import { BackButton, CardFlex, Divider } from '@/components/ui';

const { Title, Text } = Typography;

const DepositTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Deposit to Pearl Wallet
    </Title>
    <Text>Enter the token amounts you want to deposit.</Text>
  </Flex>
);

const AgentWalletToPearlWallet = () => (
  <Flex vertical style={{ margin: '0 -32px' }}>
    <Divider />
    <Flex gap={16} style={{ padding: '12px 32px' }} align="center">
      <Flex gap={8} align="center">
        <Text type="secondary">From</Text>{' '}
        <Text className="font-weight-500">External Wallet</Text>
      </Flex>
      <ArrowRightOutlined style={{ fontSize: 12 }} />
      <Text>
        <Text type="secondary">To</Text>{' '}
        <Text className="font-weight-500">Pearl Wallet</Text>
      </Text>
    </Flex>
    <Divider />
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
        <AgentWalletToPearlWallet />
      </Flex>
    </CardFlex>
  );
};
