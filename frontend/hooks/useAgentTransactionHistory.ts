import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { REACT_QUERY_KEYS } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import { FIFTEEN_MINUTE_INTERVAL } from '@/constants/intervals';
import { TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
import { AgentTransactionHistoryService } from '@/service/AgentTransactionHistory';
import { Address } from '@/types/Address';
import {
  AgentTransactionHistoryResponse,
  FUNDS_CATEGORY,
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

// Direction is derived from the category, not the address. The query returns
// only the two agent-perspective categories, each with a fixed direction:
// MASTER_TO_AGENT is always an inflow ("Fund agent"), AGENT_TO_MASTER always an
// outflow ("Withdrawal"). An address check would mis-sign the EOA leg of a
// funding tx — gas top-ups land on the Agent EOA (not the Safe) yet still carry
// the agentSafe ref, so they'd read as outflows under a green "Fund agent" row.
const directionForAgent = (
  category: FundsMovement['category'],
): TransferDirection =>
  category === FUNDS_CATEGORY.MASTER_TO_AGENT ? 'in' : 'out';

const toTransfer = (movement: FundsMovement): TransactionHistoryTransfer => ({
  tokenAddress: (movement.token as Address | null) ?? null,
  amount: movement.amount,
  direction: directionForAgent(movement.category),
});

// Group standalone movements by (txHash + category) so a multi-token movement
// in one tx renders as a single row with several transfers. Simpler than the
// master `groupMovementsByTxAndCategory` (no AgentFundingEvent dedup / agent-EOA
// detection) — see useTransactionHistory.ts for the fuller variant.
const groupMovementsByTxAndCategory = (
  movements: FundsMovement[],
): TransactionHistoryRow[] => {
  const byKey = new Map<string, TransactionHistoryRow>();
  for (const movement of movements) {
    const key = `${movement.transactionHash}::${movement.category}`;
    const transfer = toTransfer(movement);
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
  chainId?: EvmChainId,
): TransactionHistoryRow[] => {
  const movements = data.fundsMovements.filter(
    (m) => !isOlasAgentToMaster(m, chainId), // hide reward sweeps
  );
  return groupMovementsByTxAndCategory(movements).sort(
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
    queryKey:
      chainId && agentSafe
        ? REACT_QUERY_KEYS.AGENT_TRANSACTION_HISTORY_KEY(chainId, agentSafe)
        : ['agentTransactionHistory', 'disabled'],
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
    return buildAgentTransactionHistoryRows(query.data, chainId);
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
