import { Button, Flex, Modal, Typography } from 'antd';
import { useState } from 'react';

import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { NA } from '@/constants/symbols';
import { useMessageApi } from '@/context/MessageProvider';
import { Pages } from '@/enums/Pages';
import { usePageState } from '@/hooks/usePageState';
import { formatNumber } from '@/utils/numberFormatters';

import { useAgentWallet } from '../../AgentWalletContext';
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

type SomeFundsMaybeLockedModal = {
  onNext: () => void;
  onCancel: () => void;
};

export const SomeFundsMaybeLockedModal = ({
  onNext,
  onCancel,
}: SomeFundsMaybeLockedModal) => {
  const { goto } = usePageState();

  return (
    <Modal
      open
      title="Some funds may be locked"
      onCancel={onCancel}
      footer={null}
      centered
      width={612}
    >
      <Flex vertical gap={8} className="mb-32 mt-12">
        <Text>Your agent may have funds in external smart contracts.</Text>
        <Text>
          Pearl doesn’t have access to those funds — you need to initiate their
          withdrawal by instructing the agent to do so via the Agent Profile
          page.
        </Text>
        <Text>
          Make sure to check your agent has withdrawn all its funds before
          proceeding.
        </Text>
      </Flex>
      <Flex gap={8}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onNext}>I’ve Withdrawn Locked Funds</Button>
        <Button onClick={() => goto(Pages.Main)} type="primary">
          Withdraw Locked Funds
        </Button>
      </Flex>
    </Modal>
  );
};

type BalancesAndAssetsProps = {
  onWithdraw: () => void;
};

export const BalancesAndAssets = ({ onWithdraw }: BalancesAndAssetsProps) => {
  const { info } = useMessageApi();
  const { aggregatedBalance } = useAgentWallet();
  const [isWithdrawModalVisible, setWithdrawModalVisible] = useState(false);

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
            <Button onClick={() => setWithdrawModalVisible(true)}>
              Withdraw
            </Button>
            <Button type="primary" onClick={() => info('Feature coming soon!')}>
              Fund Agent
            </Button>
          </Flex>
        </Flex>
      </CardFlex>

      <AvailableAssets />
      <TransactionHistory />

      {isWithdrawModalVisible && (
        <SomeFundsMaybeLockedModal
          onCancel={() => setWithdrawModalVisible(false)}
          onNext={() => {
            setWithdrawModalVisible(false);
            onWithdraw();
          }}
        />
      )}
    </Flex>
  );
};
