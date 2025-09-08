import { Button, Flex, Typography } from 'antd';

import { CardFlex } from '@/components/ui/CardFlex';
import { formatNumber } from '@/utils/numberFormatters';

import { Withdraw } from './Withdraw/Withdraw';

const { Text, Title } = Typography;

/**
 * To display the Pearl Wallet page.
 */
export const PearlWallet = () => {
  const aggregatedBalance = 2123.8123; // TODO: fetch and calculate aggregated balance

  return (
    <Flex vertical gap={32}>
      <Flex vertical justify="space-between" gap={12}>
        <Title level={4} className="m-0">
          Pearl Wallet
        </Title>
        <Text type="secondary">
          Manage your funds and power your agents for their on-chain activity.{' '}
        </Text>
      </Flex>

      <CardFlex $noBorder>
        <Flex justify="space-between" align="center">
          <Flex vertical gap={8}>
            <Text type="secondary" className="text-sm">
              Aggregated balance
            </Text>
            <Title level={4} className="m-0">
              ${formatNumber(aggregatedBalance)}
            </Title>
          </Flex>
          <Flex gap={8}>
            <Withdraw />
            <Button type="primary">Deposit</Button>
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
