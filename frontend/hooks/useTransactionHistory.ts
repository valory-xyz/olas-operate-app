import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { REACT_QUERY_KEYS } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import { THIRTY_SECONDS_INTERVAL } from '@/constants/intervals';
import { TransactionHistoryService } from '@/service/TransactionHistory';
import { Address } from '@/types/Address';
import {
  AgentFundingEvent,
  FUNDS_CATEGORY,
  FundsMovement,
  TransactionHistoryResponse,
  TransactionHistoryRow,
  TransactionHistoryTransfer,
  TransferDirection,
} from '@/types/TransactionHistory';

type UseTransactionHistoryArgs = {
  chainId: EvmChainId | undefined;
  masterSafe: Address | undefined;
};

const directionFor = (
  category: FundsMovement['category'],
  from: string,
  masterSafe: string,
): TransferDirection => {
  if (category === FUNDS_CATEGORY.MASTER_FUNDING_IN) return 'in';
  if (category === FUNDS_CATEGORY.SAFE_SETUP_TRANSFER) return 'in';
  if (category === FUNDS_CATEGORY.OPENING_BALANCE) return 'in';
  if (category === FUNDS_CATEGORY.AGENT_TO_MASTER) return 'in';
  if (category === FUNDS_CATEGORY.SERVICE_BOND_REFUND) return 'in';
  if (category === FUNDS_CATEGORY.UNSTAKE_REWARD) return 'in';
  if (category === FUNDS_CATEGORY.MASTER_WITHDRAWAL) return 'out';
  if (category === FUNDS_CATEGORY.SERVICE_BOND_DEPOSIT) return 'out';
  if (category === FUNDS_CATEGORY.MASTER_TO_AGENT) return 'out';
  if (category === FUNDS_CATEGORY.SAFE_DEPLOYED) return 'in';
  return from.toLowerCase() === masterSafe.toLowerCase() ? 'out' : 'in';
};

const toTransfer = (
  movement: FundsMovement,
  masterSafe: string,
): TransactionHistoryTransfer => ({
  tokenAddress: (movement.token as Address | null) ?? null,
  amount: movement.amount,
  direction: directionFor(movement.category, movement.from, masterSafe),
});

/**
 * Group standalone FundsMovements by (txHash + category). Used for multi-token
 * txs that the subgraph doesn't pre-aggregate (e.g. MASTER_WITHDRAWAL,
 * AGENT_TO_MASTER reward sweeps).
 */
const groupMovementsByTxAndCategory = (
  movements: FundsMovement[],
  masterSafe: string,
): TransactionHistoryRow[] => {
  const byKey = new Map<string, TransactionHistoryRow>();
  for (const movement of movements) {
    const key = `${movement.transactionHash}::${movement.category}`;
    const existing = byKey.get(key);
    const transfer = toTransfer(movement, masterSafe);
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
      transfers: [transfer],
    });
  }
  return Array.from(byKey.values());
};

const fundingEventToRow = (
  event: AgentFundingEvent,
  masterSafe: string,
): TransactionHistoryRow => {
  // If any transfer recipient is an EOA-style address (not the AgentSafe),
  // surface it so the UI can label as "Allocated for execution costs".
  const agentSafeAddr = event.agentSafe.id.toLowerCase();
  const eoaTransfer = event.transfers.find(
    (t) => t.to.toLowerCase() !== agentSafeAddr,
  );

  return {
    id: event.id,
    category: FUNDS_CATEGORY.MASTER_TO_AGENT,
    blockTimestamp: Number(event.blockTimestamp),
    transactionHash: event.txHash,
    agentSafeAddress: event.agentSafe.id as Address,
    agentInstanceAddress: (eoaTransfer?.to as Address | undefined) ?? null,
    transfers: event.transfers.map((t) => toTransfer(t, masterSafe)),
  };
};

export const buildTransactionHistoryRows = (
  data: TransactionHistoryResponse,
  masterSafe: Address,
): TransactionHistoryRow[] => {
  const fundingEventTxHashes = new Set(
    data.agentFundingEvents.map((e) => e.txHash.toLowerCase()),
  );

  // Drop standalone movements that belong to an AgentFundingEvent — they're
  // already represented by the aggregated row.
  const standaloneMovements = data.fundsMovements.filter(
    (m) => !fundingEventTxHashes.has(m.transactionHash.toLowerCase()),
  );

  const standaloneRows = groupMovementsByTxAndCategory(
    standaloneMovements,
    masterSafe,
  );
  const fundingRows = data.agentFundingEvents.map((event) =>
    fundingEventToRow(event, masterSafe),
  );

  return [...standaloneRows, ...fundingRows].sort(
    (a, b) => b.blockTimestamp - a.blockTimestamp,
  );
};

export const useTransactionHistory = ({
  chainId,
  masterSafe,
}: UseTransactionHistoryArgs) => {
  const enabled = Boolean(chainId && masterSafe);

  const query = useQuery({
    queryKey:
      chainId && masterSafe
        ? REACT_QUERY_KEYS.TRANSACTION_HISTORY_KEY(chainId, masterSafe)
        : ['transactionHistory', 'disabled'],
    queryFn: () =>
      TransactionHistoryService.get({
        chainId: chainId!,
        masterSafe: masterSafe!,
      }),
    enabled,
    refetchInterval: THIRTY_SECONDS_INTERVAL,
  });

  const rows = useMemo(() => {
    if (!query.data || !masterSafe) return [];
    return buildTransactionHistoryRows(query.data, masterSafe);
  }, [query.data, masterSafe]);

  return {
    rows,
    meta: query.data?._meta ?? null,
    masterSafeEntity: query.data?.masterSafe ?? null,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    isError: query.isError,
    refetch: query.refetch,
  };
};
