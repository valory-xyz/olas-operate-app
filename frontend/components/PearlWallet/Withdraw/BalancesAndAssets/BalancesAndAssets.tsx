import { Button, Flex, Typography } from 'antd';

import { CardFlex } from '@/components/ui/CardFlex';
import { NA } from '@/constants/symbols';
import { formatNumber } from '@/utils/numberFormatters';

import { AvailableAssetsTable } from './AvailableAssetsTable';

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
  const aggregatedBalance = null;
  // const aggregatedBalance = 2123.8123;

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
              {aggregatedBalance ? `$${formatNumber(aggregatedBalance)}` : NA}
            </Title>
          </Flex>
          <Flex gap={8}>
            <Button onClick={onWithdraw}>Withdraw</Button>
            <Button type="primary">Deposit</Button>
          </Flex>
        </Flex>
      </CardFlex>

      <Flex vertical gap={24}>
        <Flex vertical gap={12}>
          <Title level={5} className="m-0 text-lg">
            Available Assets
          </Title>
          <CardFlex $noBorder>
            <AvailableAssetsTable
              isLoading={false}
              tableData={[
                {
                  symbol: 'ETH',
                  amount: 2.5,
                  value: 4000,
                },
                {
                  symbol: 'XDAI',
                  amount: 1500,
                  value: 1500,
                },
              ]}
            />
          </CardFlex>
        </Flex>
      </Flex>

      <Flex vertical gap={24}>
        <Flex vertical gap={12}>
          <Title level={5} className="m-0 text-lg">
            Staked Assets
          </Title>
          <CardFlex $noBorder>
            <Flex justify="space-between" align="center">
              <Flex vertical gap={8}>
                <Text type="secondary" className="text-sm">
                  Aggregated balance
                </Text>
                <Title level={4} className="m-0">
                  {aggregatedBalance
                    ? `$${formatNumber(aggregatedBalance)}`
                    : NA}
                </Title>
              </Flex>
              <Flex gap={8}>
                <Button onClick={onWithdraw}>Withdraw</Button>
                <Button type="primary">Deposit</Button>
              </Flex>
            </Flex>
          </CardFlex>
        </Flex>
      </Flex>
    </Flex>
  );
};
