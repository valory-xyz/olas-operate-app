import { Button, Flex, Typography } from 'antd';

import { CardFlex } from '@/components/ui/CardFlex';
import { formatNumber } from '@/utils/numberFormatters';

const { Text, Title } = Typography;

const PearlWalletTitle = () => (
  <Flex vertical justify="space-between" gap={12}>
    <Title level={4} className="m-0">
      Pearl Wallet
    </Title>
    <Text type="secondary">
      Manage your funds and power your agents for their on-chain activity.{' '}
    </Text>
  </Flex>
);

type BalancesAndAssetsProps = {
  onWithdraw: () => void;
};

export const BalancesAndAssets = ({ onWithdraw }: BalancesAndAssetsProps) => {
  const aggregatedBalance = 2123.8123;

  return (
    <Flex vertical gap={32}>
      <PearlWalletTitle />
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
            <Button onClick={onWithdraw}>Withdraw</Button>
            <Button type="primary">Deposit</Button>
          </Flex>
        </Flex>
      </CardFlex>
    </Flex>
  );
};
