import { Button, Flex, Modal, Typography } from 'antd';
import { useMemo, useState } from 'react';

import { CustomAlert } from '@/components/Alert';
import { AgentLowBalanceAlert } from '@/components/MainPageV1/Home/Overview/AgentInfo/AgentDisabledAlert/LowBalance/AgentLowBalanceAlert';
import { BackButton } from '@/components/ui/BackButton';
import { CardFlex } from '@/components/ui/CardFlex';
import { Pages } from '@/enums/Pages';
import {
  useActiveStakingContractDetails,
  useAgentFundingRequests,
} from '@/hooks';
import { usePageState } from '@/hooks/usePageState';

import { useAgentWallet } from '../AgentWalletProvider';
import { AvailableAssetsTable } from './AvailableAssetsTable';
import { TransactionHistoryTable } from './TransactionHistoryTable';

const { Text, Title } = Typography;

const EvictedAgentAlert = () => (
  <CustomAlert
    message="Withdrawals are temporarily unavailable during agent eviction."
    type="warning"
    showIcon
    centered
    className="mt-16 text-sm"
  />
);

const AgentWalletTitle = () => {
  const { goto } = usePageState();
  return (
    <Flex vertical justify="space-between" gap={12}>
      <BackButton onPrev={() => goto(Pages.Main)} />
      <Title level={3} className="m-0">
        Agent Wallet
      </Title>
    </Flex>
  );
};

type AggregatedBalanceAndOperationsProps = {
  onWithdraw: () => void;
  onFundAgent: () => void;
};
export const AggregatedBalanceAndOperations = ({
  onWithdraw,
  onFundAgent,
}: AggregatedBalanceAndOperationsProps) => {
  const { isAgentEvicted, isEligibleForStaking } =
    useActiveStakingContractDetails();
  const { setFundInitialValues } = useAgentWallet();
  const { agentTokenRequirements } = useAgentFundingRequests();

  const isWithdrawDisabled = isAgentEvicted && !isEligibleForStaking;

  const withdrawDisabledAlert = useMemo(() => {
    if (isWithdrawDisabled) return <EvictedAgentAlert />;
    return null;
  }, [isWithdrawDisabled]);

  return (
    <CardFlex $noBorder>
      <Flex justify="space-between" align="end">
        <AgentWalletTitle />
        <Flex gap={8}>
          <Button disabled={isWithdrawDisabled} onClick={onWithdraw}>
            Withdraw
          </Button>
          <Button type="primary" onClick={onFundAgent}>
            Fund Agent
          </Button>
        </Flex>
      </Flex>
      {withdrawDisabledAlert}
      <AgentLowBalanceAlert onFund={onFundAgent} needInitialValues />
    </CardFlex>
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

type SomeFundsMaybeLockedModalProps = {
  onNext: () => void;
  onCancel: () => void;
};
const SomeFundsMaybeLockedModal = ({
  onNext,
  onCancel,
}: SomeFundsMaybeLockedModalProps) => {
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
  onLockedFundsWithdrawn: () => void;
  onFundAgent: () => void;
};

export const BalancesAndAssets = ({
  onFundAgent,
  onLockedFundsWithdrawn,
}: BalancesAndAssetsProps) => {
  const [isWithdrawModalVisible, setWithdrawModalVisible] = useState(false);

  return (
    <Flex vertical gap={32}>
      <AggregatedBalanceAndOperations
        onWithdraw={() => setWithdrawModalVisible(true)}
        onFundAgent={onFundAgent}
      />
      <AvailableAssets />
      <TransactionHistory />

      {isWithdrawModalVisible && (
        <SomeFundsMaybeLockedModal
          onCancel={() => setWithdrawModalVisible(false)}
          onNext={() => {
            setWithdrawModalVisible(false);
            onLockedFundsWithdrawn();
          }}
        />
      )}
    </Flex>
  );
};
