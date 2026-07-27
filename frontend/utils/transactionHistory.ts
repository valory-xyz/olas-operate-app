import { TOKEN_CONFIG, TokenSymbolMap } from '@/config/tokens';
import { EvmChainId } from '@/constants/chains';
import { TWELVE_HOURS_IN_SECONDS } from '@/constants/intervals';
import {
  AgentFundingEvent,
  AgentFundingEventV2,
  AgentTransactionHistoryResponse,
  AgentTransactionHistoryResponseV2,
  BondMovementV2,
  FUNDS_CATEGORY,
  FundsMovement,
  FundsMovementV2,
  SubgraphMeta,
  TransactionHistoryResponse,
  TransactionHistoryResponseV2,
} from '@/types/TransactionHistory';

// Staking-reward sweeps surface as OLAS AGENT_TO_MASTER transfers (the agent
// returning reward OLAS to the master). They flood the history and aren't user
// actions, so hide them client-side.
export const isOlasAgentToMaster = (
  movement: FundsMovement,
  chainId: EvmChainId | undefined,
): boolean => {
  if (movement.category !== FUNDS_CATEGORY.AGENT_TO_MASTER) return false;
  const olasAddress =
    chainId &&
    TOKEN_CONFIG[chainId]?.[TokenSymbolMap.OLAS]?.address?.toLowerCase();
  return !!olasAddress && movement.token?.toLowerCase() === olasAddress;
};

// The subgraph can trail the chain head; surface the stale-data warning only
// when the latest indexed block is ≥12h behind wall-clock
export const computeIsDataDelayed = (
  meta: SubgraphMeta | null | undefined,
): boolean => {
  const indexedAt = meta?.block?.timestamp;
  if (!indexedAt) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return nowSeconds - Number(indexedAt) >= TWELVE_HOURS_IN_SECONDS;
};

// --- v2 (subgraph v0.0.7) → domain normalization ----------------------------
// v2 responses are reshaped to the v1 domain types right after Zod parsing so
// hooks/components stay revision-agnostic. See TransactionHistorySchemaRevision.

// Domain service.id must stay the numeric id string — row consumers `Number()`
// it (e.g. generateAgentName). v2 Service.id is registry Bytes ("0x7802"), so
// map from v2's `serviceId` instead.
const toDomainServiceRef = (
  service: FundsMovementV2['service'],
): FundsMovement['service'] =>
  service ? { id: service.serviceId, agentIds: service.agentIds } : service;

const toDomainAgentSafeRef = (
  agentSafe: FundsMovementV2['agentSafe'],
): FundsMovement['agentSafe'] =>
  agentSafe
    ? {
        id: agentSafe.id,
        service: toDomainServiceRef(agentSafe.service) ?? null,
      }
    : agentSafe;

// AGENT_OLAS_TO_MASTER (v2's server-side split of OLAS reward sweeps) maps to
// null: v1 chains hide those rows client-side via isOlasAgentToMaster, and the
// domain enum has no such category — dropping them preserves identical UI
// behavior across revisions.
export const normalizeFundsMovementV2 = (
  movement: FundsMovementV2,
): FundsMovement | null => {
  if (movement.category === 'AGENT_OLAS_TO_MASTER') return null;
  return {
    ...movement,
    category: movement.category,
    agentSafe: toDomainAgentSafeRef(movement.agentSafe),
    service: toDomainServiceRef(movement.service),
  };
};

// Bond rows live on the separate v2 bond ledger; in the domain they are plain
// FundsMovements carrying bondType (never AGENT_OLAS_TO_MASTER, so the cast
// after normalize is safe in practice — normalize still guards it).
const normalizeBondMovementV2 = (
  bond: BondMovementV2,
): FundsMovement | null => {
  const normalized = normalizeFundsMovementV2(bond);
  return normalized ? { ...normalized, bondType: bond.bondType } : null;
};

const normalizeAgentFundingEventV2 = (
  event: AgentFundingEventV2,
): AgentFundingEvent => ({
  ...event,
  transfers: event.transfers
    .map(normalizeFundsMovementV2)
    .filter((m): m is FundsMovement => m !== null),
});

const byBlockTimestampDesc = (a: FundsMovement, b: FundsMovement) =>
  Number(b.blockTimestamp) - Number(a.blockTimestamp);

export const normalizeTransactionHistoryResponseV2 = (
  response: TransactionHistoryResponseV2,
): TransactionHistoryResponse => ({
  masterSafe: response.masterSafe,
  // A complete v2 wallet ledger is fundsMovements ∪ bondMovements; merged here
  // so the domain keeps v1's single-ledger shape.
  fundsMovements: [
    ...response.fundsMovements.map(normalizeFundsMovementV2),
    ...response.bondMovements.map(normalizeBondMovementV2),
  ]
    .filter((m): m is FundsMovement => m !== null)
    .sort(byBlockTimestampDesc),
  agentFundingEvents: response.agentFundingEvents.map(
    normalizeAgentFundingEventV2,
  ),
  _meta: response._meta,
});

export const normalizeAgentTransactionHistoryResponseV2 = (
  response: AgentTransactionHistoryResponseV2,
): AgentTransactionHistoryResponse => ({
  fundsMovements: response.fundsMovements
    .map(normalizeFundsMovementV2)
    .filter((m): m is FundsMovement => m !== null),
  _meta: response._meta,
});
