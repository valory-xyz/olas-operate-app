import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { TOKEN_CONFIG, TokenSymbolMap } from '@/config/tokens';
import { REACT_QUERY_KEYS } from '@/constants';
import { EvmChainId } from '@/constants/chains';
import {
  FIFTEEN_MINUTE_INTERVAL,
  TWELVE_HOURS_IN_SECONDS,
} from '@/constants/intervals';
import { TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN } from '@/constants/urls';
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
    // For MASTER_TO_AGENT rows that land outside an AgentFundingEvent (e.g.
    // a one-off native gas top-up to the Agent EOA), detect the recipient
    // role so the UI can render "Allocated for execution costs" instead of
    // "Fund <agent>". The check mirrors fundingEventToRow.
    const agentSafeId = movement.agentSafe?.id.toLowerCase();
    const isAgentEoaRecipient =
      movement.category === FUNDS_CATEGORY.MASTER_TO_AGENT &&
      !!agentSafeId &&
      movement.to.toLowerCase() !== agentSafeId;
    if (existing) {
      existing.transfers.push(transfer);
      if (isAgentEoaRecipient && !existing.agentInstanceAddress) {
        existing.agentInstanceAddress = movement.to as Address;
      }
      continue;
    }
    byKey.set(key, {
      id: key,
      category: movement.category,
      blockTimestamp: Number(movement.blockTimestamp),
      transactionHash: movement.transactionHash,
      agentSafeAddress: (movement.agentSafe?.id as Address | null) ?? null,
      agentInstanceAddress: isAgentEoaRecipient
        ? (movement.to as Address)
        : null,
      // Prefer the agentSafe→service link; fall back to the row's direct
      // service (SERVICE_BOND_* stake rows are booked before the agent
      // multisig exists, so agentSafe is null but `service` carries agentIds).
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

const fundingEventToRow = (
  event: AgentFundingEvent,
  masterSafe: string,
): TransactionHistoryRow => {
  // The agent safe (and its service) ride on the transfers; use the first
  // that carries them.
  const agentSafeId =
    event.transfers.map((t) => t.agentSafe?.id).find(Boolean) ?? null;
  const agentSafeAddrLc = agentSafeId ? agentSafeId.toLowerCase() : null;
  const svc =
    event.transfers.map((t) => t.agentSafe?.service).find(Boolean) ??
    event.transfers.map((t) => t.service).find(Boolean);

  // If any transfer recipient is an EOA-style address (not the AgentSafe),
  // surface it so the UI can label as "Allocated for execution costs".
  const eoaTransfer = agentSafeAddrLc
    ? event.transfers.find((t) => t.to.toLowerCase() !== agentSafeAddrLc)
    : undefined;

  return {
    id: event.id,
    category: FUNDS_CATEGORY.MASTER_TO_AGENT,
    blockTimestamp: Number(event.blockTimestamp),
    transactionHash: event.txHash,
    agentSafeAddress: (agentSafeId as Address | null) ?? null,
    agentInstanceAddress: (eoaTransfer?.to as Address | undefined) ?? null,
    agentIds: svc?.agentIds ?? null,
    serviceId: svc?.id ?? null,
    transfers: event.transfers.map((t) => toTransfer(t, masterSafe)),
  };
};

// "Setup complete" / opening-balance rows are hidden for now — we can't yet
// populate opening balances (Path A needs an archive RPC at historyFloorBlock).
// Re-enable these categories once that's handled.
const HIDDEN_CATEGORIES = new Set<FundsMovement['category']>([
  FUNDS_CATEGORY.SAFE_DEPLOYED,
  FUNDS_CATEGORY.SAFE_SETUP_TRANSFER,
  FUNDS_CATEGORY.OPENING_BALANCE,
]);

// Staking-reward sweeps surface as OLAS AGENT_TO_MASTER transfers (the agent
// returning reward OLAS to the master). They flood the history and aren't user
// actions, so hide them for now.
// NOTE: this also hides any *genuine* OLAS agent→master transfer — separating
// reward sweeps from genuine returns needs reward attribution in the subgraph
// (tracked as a follow-up). Native / non-OLAS agent→master transfers are kept.
const isOlasAgentToMaster = (
  movement: FundsMovement,
  chainId: EvmChainId | undefined,
): boolean => {
  if (movement.category !== FUNDS_CATEGORY.AGENT_TO_MASTER) return false;
  const olasAddress =
    chainId &&
    TOKEN_CONFIG[chainId]?.[TokenSymbolMap.OLAS]?.address?.toLowerCase();
  return !!olasAddress && movement.token?.toLowerCase() === olasAddress;
};

export const buildTransactionHistoryRows = (
  data: TransactionHistoryResponse,
  masterSafe: Address,
  chainId?: EvmChainId,
): TransactionHistoryRow[] => {
  const fundingEventTxHashes = new Set(
    data.agentFundingEvents.map((e) => e.txHash.toLowerCase()),
  );

  // Drop standalone movements that belong to an AgentFundingEvent (already
  // represented by the aggregated row), currently-hidden setup / opening-balance
  // rows, or OLAS reward sweeps (agent → master).
  const standaloneMovements = data.fundsMovements.filter(
    (m) =>
      !fundingEventTxHashes.has(m.transactionHash.toLowerCase()) &&
      !HIDDEN_CATEGORIES.has(m.category) &&
      !isOlasAgentToMaster(m, chainId),
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
  // No subgraph URL for this chain yet → there's no data source to query, so
  // surface a distinct "not available" state instead of fetching.
  const hasSubgraphUrl = Boolean(
    chainId && TRANSACTION_HISTORY_SUBGRAPH_URLS_BY_EVM_CHAIN[chainId],
  );
  const enabled = Boolean(chainId && masterSafe && hasSubgraphUrl);
  const isUnavailable = Boolean(chainId && masterSafe && !hasSubgraphUrl);

  const query = useQuery({
    queryKey:
      chainId && masterSafe
        ? REACT_QUERY_KEYS.TRANSACTION_HISTORY_KEY(chainId, masterSafe)
        : ['transactionHistory', 'disabled'],
    queryFn: () =>
      TransactionHistoryService.getAll({
        chainId: chainId!,
        masterSafe: masterSafe!,
      }),
    enabled,
    // History is append-mostly and the gateway bills per query, so poll
    // infrequently; window-focus refetch keeps it reasonably fresh.
    refetchInterval: FIFTEEN_MINUTE_INTERVAL,
  });

  const rows = useMemo(() => {
    if (!query.data || !masterSafe) return [];
    return buildTransactionHistoryRows(query.data, masterSafe, chainId);
  }, [query.data, masterSafe, chainId]);

  const isDataDelayed = useMemo(() => {
    const indexedAt = query.data?._meta?.block?.timestamp;
    if (!indexedAt) return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds - Number(indexedAt) >= TWELVE_HOURS_IN_SECONDS;
  }, [query.data]);

  return {
    rows,
    meta: query.data?._meta ?? null,
    masterSafeEntity: query.data?.masterSafe ?? null,
    isDataDelayed,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    isError: query.isError,
    isUnavailable,
    refetch: query.refetch,
  };
};
