import { Button, Flex, Typography } from 'antd';
import { useEffect } from 'react';

import { CardFlex } from '@/components/ui/CardFlex';
import { NA } from '@/constants/symbols';
import { formatNumber } from '@/utils/numberFormatters';

import { usePearlWallet } from '../../PearlWalletContext';
import { AgentNft } from './AgentNft';
import { AvailableAssetsTable } from './AvailableAssetsTable';
import { StakedAssetsTable } from './StakedAssetsTable';

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
  const { aggregatedBalance, onReset } = usePearlWallet();

  // reset the state when we enter the pearl wallet screen
  useEffect(() => {
    onReset();
  }, [onReset]);

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
            <AvailableAssetsTable />
          </CardFlex>
        </Flex>
      </Flex>

      <Flex vertical gap={24}>
        <Flex vertical gap={12}>
          <Title level={5} className="m-0 text-lg">
            Staked Assets
          </Title>
          <CardFlex $noBorder>
            <StakedAssetsTable />
            <AgentNft />
          </CardFlex>
        </Flex>
      </Flex>
    </Flex>
  );
};
