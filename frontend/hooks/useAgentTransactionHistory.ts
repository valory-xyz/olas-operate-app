import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { EvmChainId } from '@/constants/chains';
import { FIFTEEN_MINUTE_INTERVAL } from '@/constants/intervals';
import { TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { AgentTransactionHistoryService } from '@/service/AgentTransactionHistory';
import { Address } from '@/types/Address';
import {
  AgentTransactionHistoryResponse,
  FundsMovement,
  TransactionHistoryRow,
  TransactionHistoryTransfer,
  TransferDirection,
} from '@/types/TransactionHistory';
import { computeIsDataDelayed, isOlasAgentToMaster } from '@/utils';

type UseAgentTransactionHistoryArgs = {
  chainId: EvmChainId | undefined;
  agentSafe: Address | undefined;
};

// Direction is computed relative to the AGENT safe (the subject wallet):
// funds landing on the agent safe are inflows, funds leaving are outflows.
const directionForAgent = (
  from: string,
  to: string,
  agentSafe: string,
): TransferDirection =>
  to.toLowerCase() === agentSafe.toLowerCase() ? 'in' : 'out';

const toTransfer = (
  movement: FundsMovement,
  agentSafe: string,
): TransactionHistoryTransfer => ({
  tokenAddress: (movement.token as Address | null) ?? null,
  amount: movement.amount,
  direction: directionForAgent(movement.from, movement.to, agentSafe),
});

// Group standalone movements by (txHash + category) so a multi-token movement
// in one tx renders as a single row with several transfers.
const groupMovementsByTxAndCategory = (
  movements: FundsMovement[],
  agentSafe: string,
): TransactionHistoryRow[] => {
  const byKey = new Map<string, TransactionHistoryRow>();
  for (const movement of movements) {
    const key = `${movement.transactionHash}::${movement.category}`;
    const transfer = toTransfer(movement, agentSafe);
    const existing = byKey.get(key);
    if (existing) {
      existing.transfers.push(transfer);
      continue;
    }
    byKey.set(key, {
      id: key,
      category: movement.category,
      blockTimestamp: Number(movement.blockTimestamp),
      transactionHash: movement.transactionHash,
      agentSafeAddress: (movement.agentSafe?.id as Address | null) ?? null,
      agentInstanceAddress: null,
      agentIds:
        movement.agentSafe?.service?.agentIds ??
        movement.service?.agentIds ??
        null,
      serviceId:
        movement.agentSafe?.service?.id ?? movement.service?.id ?? null,
      transfers: [transfer],
    });
  }
  return Array.from(byKey.values());
};

export const buildAgentTransactionHistoryRows = (
  data: AgentTransactionHistoryResponse,
  agentSafe: Address,
  chainId?: EvmChainId,
): TransactionHistoryRow[] => {
  const movements = data.fundsMovements.filter(
    (m) => !isOlasAgentToMaster(m, chainId), // hide reward sweeps
  );
  return groupMovementsByTxAndCategory(movements, agentSafe).sort(
    (a, b) => b.blockTimestamp - a.blockTimestamp,
  );
};

export const useAgentTransactionHistory = ({
  chainId,
  agentSafe,
}: UseAgentTransactionHistoryArgs) => {
  const hasSubgraphUrl = Boolean(
    chainId && TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId],
  );
  const enabled = Boolean(chainId && agentSafe && hasSubgraphUrl);
  const isUnavailable = Boolean(chainId && agentSafe && !hasSubgraphUrl);

  const query = useQuery({
    queryKey: ['agentTransactionHistory', chainId, agentSafe],
    queryFn: () =>
      AgentTransactionHistoryService.getAll({
        chainId: chainId!,
        agentSafe: agentSafe!,
      }),
    enabled,
    refetchInterval: FIFTEEN_MINUTE_INTERVAL,
  });

  const rows = useMemo(() => {
    if (!query.data || !agentSafe) return [];
    return buildAgentTransactionHistoryRows(query.data, agentSafe, chainId);
  }, [query.data, agentSafe, chainId]);

  const isDataDelayed = useMemo(
    () => computeIsDataDelayed(query.data?._meta),
    [query.data],
  );

  return {
    rows,
    meta: query.data?._meta ?? null,
    isDataDelayed,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    isError: query.isError,
    isUnavailable,
    refetch: query.refetch,
  };
};
