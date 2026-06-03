import { z } from 'zod';

import { Address } from './Address';

export const FUNDS_CATEGORY = {
  SAFE_DEPLOYED: 'SAFE_DEPLOYED',
  // Rev. 4 — synthetic snapshot rows emitted at first sighting of a Master
  // Safe. One per tracked ERC-20 (eth_call balanceOf at the discovery block)
  // plus a zero-amount native marker. Anchored by MasterSafe.historyFloor*.
  OPENING_BALANCE: 'OPENING_BALANCE',
  // Rev. 4 narrowed semantics — first LIVE Master EOA → Master Safe inbound
  // hop AFTER OPENING_BALANCE. Fires at most once per Master Safe.
  SAFE_SETUP_TRANSFER: 'SAFE_SETUP_TRANSFER',
  // Rev. 2 (subgraph PR #129) — typed bond ledger from SRTU
  // TokenDeposit/TokenRefund events. Each fires twice per stake / unstake
  // cycle (activate + register; terminate + unbond). Disambiguated by
  // `bondType` when correlation succeeds.
  SERVICE_BOND_DEPOSIT: 'SERVICE_BOND_DEPOSIT',
  SERVICE_BOND_REFUND: 'SERVICE_BOND_REFUND',
  STAKING_REWARD_CLAIM: 'STAKING_REWARD_CLAIM',
  UNSTAKE_REWARD: 'UNSTAKE_REWARD',
  SERVICE_EVICTED: 'SERVICE_EVICTED',
  MASTER_FUNDING_IN: 'MASTER_FUNDING_IN',
  MASTER_TO_AGENT: 'MASTER_TO_AGENT',
  AGENT_TO_MASTER: 'AGENT_TO_MASTER',
  MASTER_WITHDRAWAL: 'MASTER_WITHDRAWAL',
  AGENT_TO_APP: 'AGENT_TO_APP',
  APP_TO_AGENT: 'APP_TO_AGENT',
  OTHER: 'OTHER',
} as const;

export const FundsCategorySchema = z.enum([
  FUNDS_CATEGORY.SAFE_DEPLOYED,
  FUNDS_CATEGORY.OPENING_BALANCE,
  FUNDS_CATEGORY.SAFE_SETUP_TRANSFER,
  FUNDS_CATEGORY.SERVICE_BOND_DEPOSIT,
  FUNDS_CATEGORY.SERVICE_BOND_REFUND,
  FUNDS_CATEGORY.STAKING_REWARD_CLAIM,
  FUNDS_CATEGORY.UNSTAKE_REWARD,
  FUNDS_CATEGORY.SERVICE_EVICTED,
  FUNDS_CATEGORY.MASTER_FUNDING_IN,
  FUNDS_CATEGORY.MASTER_TO_AGENT,
  FUNDS_CATEGORY.AGENT_TO_MASTER,
  FUNDS_CATEGORY.MASTER_WITHDRAWAL,
  FUNDS_CATEGORY.AGENT_TO_APP,
  FUNDS_CATEGORY.APP_TO_AGENT,
  FUNDS_CATEGORY.OTHER,
]);

export type FundsCategory = z.infer<typeof FundsCategorySchema>;

export const ServiceBondTypeSchema = z.enum(['SECURITY_DEPOSIT', 'AGENT_BOND']);
export type ServiceBondType = z.infer<typeof ServiceBondTypeSchema>;

export const FundsSourceSchema = z.enum(['SEMANTIC', 'RAW_TRANSFER']);
export type FundsSource = z.infer<typeof FundsSourceSchema>;

const ServiceRefSchema = z.object({
  id: z.string(),
  agentIds: z.array(z.number()),
});

const AgentSafeRefSchema = z.object({
  id: z.string(),
  service: ServiceRefSchema.nullable(),
});

export const FundsMovementSchema = z.object({
  id: z.string(),
  category: FundsCategorySchema,
  source: FundsSourceSchema,
  // Nullable per Rev. 2 schema — populated only for SERVICE_BOND_* rows
  // when SRTU/registry cross-event correlation succeeds.
  bondType: ServiceBondTypeSchema.nullable().optional(),
  token: z.string().nullable(),
  amount: z.string(),
  from: z.string(),
  to: z.string(),
  blockTimestamp: z.string(),
  transactionHash: z.string(),
  agentSafe: AgentSafeRefSchema.nullable(),
});
export type FundsMovement = z.infer<typeof FundsMovementSchema>;

export const AgentFundingEventSchema = z.object({
  id: z.string(),
  txHash: z.string(),
  blockTimestamp: z.string(),
  totalNativeAmount: z.string(),
  totalOlasAmount: z.string(),
  transfers: z.array(FundsMovementSchema),
});
export type AgentFundingEvent = z.infer<typeof AgentFundingEventSchema>;

export const MasterSafeEntitySchema = z.object({
  id: z.string(),
  masterEoa: z.string(),
  owners: z.array(z.string()),
  threshold: z.string(),
  // Rev. 4 anchor fields — consumer wallet UI renders a literal
  // "History starts here" divider above the OPENING_BALANCE rows.
  historyFloorBlock: z.string(),
  historyFloorTimestamp: z.string(),
});
export type MasterSafeEntity = z.infer<typeof MasterSafeEntitySchema>;

export const SubgraphMetaSchema = z.object({
  block: z.object({
    number: z.number(),
    timestamp: z.number().nullable().optional(),
  }),
  hasIndexingErrors: z.boolean(),
});
export type SubgraphMeta = z.infer<typeof SubgraphMetaSchema>;

export const TransactionHistoryResponseSchema = z.object({
  masterSafe: MasterSafeEntitySchema.nullable(),
  fundsMovements: z.array(FundsMovementSchema),
  agentFundingEvents: z.array(AgentFundingEventSchema),
  _meta: SubgraphMetaSchema.nullable(),
});
export type TransactionHistoryResponse = z.infer<
  typeof TransactionHistoryResponseSchema
>;

export type TransferDirection = 'in' | 'out';

export type TransactionHistoryTransfer = {
  tokenAddress: Address | null;
  amount: string;
  direction: TransferDirection;
};

export type TransactionHistoryRow = {
  id: string;
  category: FundsCategory;
  blockTimestamp: number;
  transactionHash: string;
  agentSafeAddress: Address | null;
  agentInstanceAddress: Address | null;
  // Canonical on-chain agent ids + service id for this row's agent, carried
  // from the subgraph so the agent can be resolved by id (and the nickname
  // generated) even when the service isn't loaded locally.
  agentIds?: number[] | null;
  serviceId?: string | null;
  transfers: TransactionHistoryTransfer[];
};
