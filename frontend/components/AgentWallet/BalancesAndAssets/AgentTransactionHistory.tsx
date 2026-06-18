import { InboxOutlined } from '@ant-design/icons';

import { TransactionHistoryView } from '@/components/PearlWallet/History';
import { useService, useServices } from '@/hooks';
import { useAgentTransactionHistory } from '@/hooks/useAgentTransactionHistory';
import { Address } from '@/types/Address';

import {
  getAgentIconCategory,
  getAgentTransactionRowLabel,
} from './agentTransactionLabels';

export const AgentTransactionHistory = () => {
  const { selectedAgentConfig, selectedService } = useServices();
  const { getServiceSafeOf } = useService(selectedService?.service_config_id);

  const chainId = selectedAgentConfig?.evmHomeChainId;
  const agentSafe = (
    chainId
      ? getServiceSafeOf?.(chainId, selectedService?.service_config_id)?.address
      : undefined
  ) as Address | undefined;

  const { rows, isFetched, isLoading, isError, isUnavailable, isDataDelayed } =
    useAgentTransactionHistory({ chainId, agentSafe });

  if (!agentSafe) return null;

  return (
    <TransactionHistoryView
      chainId={chainId}
      rows={rows}
      isFetched={isFetched}
      isLoading={isLoading}
      isError={isError}
      isUnavailable={isUnavailable}
      isDataDelayed={isDataDelayed}
      resetKey={`${chainId}:${agentSafe}`}
      tooltip="Recent activity for this agent's wallet on this chain."
      emptyIcon={<InboxOutlined style={{ fontSize: 24 }} />}
      getRowLabel={getAgentTransactionRowLabel}
      getRowIconCategory={getAgentIconCategory}
      showAgentTag={false}
    />
  );
};
