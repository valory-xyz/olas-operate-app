import { Button, Flex, Typography } from 'antd';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { NA } from '@/constants/symbols';
import { useMessageApi } from '@/context/MessageProvider';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { formatNumber } from '@/utils/numberFormatters';

import { usePearlWallet } from '../../AgentWalletContext';
import { AvailableAssetsTable } from './AvailableAssetsTable';
import { TransactionHistoryTable } from './TransactionHistoryTable';

const { Text, Title } = Typography;

const AgentWalletTitle = () => {
  const { goto } = usePageState();
  return (
    <Flex vertical justify="space-between" gap={12}>
      <BackButton onPrev={() => goto(Pages.Main)} />
      <Title level={4} className="m-0">
        Agent Wallet
      </Title>
    </Flex>
  );
};

const AvailableAssets = () => (
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
);

const TransactionHistory = () => (
  <Flex vertical gap={24}>
    <Flex vertical gap={12}>
      <Title level={5} className="m-0 text-lg">
        Transaction History
      </Title>
      <CardFlex $noBorder>
        <TransactionHistoryTable />
      </CardFlex>
    </Flex>
  </Flex>
);

type BalancesAndAssetsProps = {
  onWithdraw: () => void;
};

export const BalancesAndAssets = ({ onWithdraw }: BalancesAndAssetsProps) => {
  const { info } = useMessageApi();
  const { aggregatedBalance } = usePearlWallet();

  return (
    <Flex vertical gap={32}>
      <AgentWalletTitle />

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
            <Button type="primary" onClick={() => info('Feature coming soon!')}>
              Fund Agent
            </Button>
          </Flex>
        </Flex>
      </CardFlex>

      <AvailableAssets />
      <TransactionHistory />
    </Flex>
  );
};
