import { Button, Flex, Modal, Typography } from 'antd';
import { useState } from 'react';

import { CardFlex, WalletsTooltip } from '@/components/ui';
import { PAGES } from '@/constants';
import { usePageState, useService, useServices } from '@/hooks';

import { AgentWalletOperation } from './AgentWalletOperation';
import { AvailableAssetsTable } from './AvailableAssetsTable';

const { Text, Title } = Typography;

const AvailableAssetsTooltip = () => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { serviceEoa, getServiceSafeOf } = useService(
    selectedService?.service_config_id,
  );
  const serviceSafe = getServiceSafeOf?.(
    selectedAgentConfig.evmHomeChainId,
    selectedService?.service_config_id,
  );
  return (
    <WalletsTooltip
      type="agent"
      eoaAddress={serviceEoa?.address}
      safeAddress={serviceSafe?.address}
      middlewareHomeChainId={selectedAgentConfig.middlewareHomeChainId}
    />
  );
};

const AvailableAssets = () => (
  <Flex vertical gap={12}>
    <Flex align="center" gap={8}>
      <Title level={5} className="m-0 text-lg">
        Available Assets
      </Title>
      <AvailableAssetsTooltip />
    </Flex>
    <CardFlex $noBorder>
      <AvailableAssetsTable />
    </CardFlex>
  </Flex>
);

// const TransactionHistory = () => (
//   <Flex vertical gap={24}>
//     <Flex vertical gap={12}>
//       <Title level={5} className="m-0 text-lg">
//         Transaction History
//       </Title>
//       <CardFlex $noBorder>
//         <TransactionHistoryTable />
//       </CardFlex>
//     </Flex>
//   </Flex>
// );

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
        <Button onClick={() => goto(PAGES.Main)} type="primary">
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
  const { selectedAgentConfig } = useServices();

  const handleWithdraw = () => {
    const hasExternalFunds = selectedAgentConfig?.hasExternalFunds;

    if (hasExternalFunds) {
      setWithdrawModalVisible(true);
      return;
    }

    onLockedFundsWithdrawn();
  };

  return (
    <Flex vertical gap={32}>
      <AgentWalletOperation
        onWithdraw={handleWithdraw}
        onFundAgent={onFundAgent}
      />
      <AvailableAssets />
      {/* <TransactionHistory /> */}

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
