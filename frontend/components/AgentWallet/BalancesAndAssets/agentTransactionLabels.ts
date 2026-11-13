import {
  FUNDS_CATEGORY,
  FundsCategory,
  TransactionHistoryRow,
} from '@/types/TransactionHistory';

const EXECUTION_COSTS_LABEL = 'Allocated for execution costs';

/**
 * Row titles for the AGENT wallet view. The subgraph categories are written
 * from the Master Safe's perspective; from the agent's side, Pearl funding it
 * is "Fund agent" and the agent returning funds to Pearl is a "Withdrawal".
 * Funding of the Agent Signer reads the same whether it came from the Pearl
 * Safe or from the Agent Safe's automatic top-up.
 */
export const getAgentTransactionRowLabel = (
  row: TransactionHistoryRow,
): string => {
  switch (row.category) {
    case FUNDS_CATEGORY.MASTER_TO_AGENT:
      return row.agentInstanceAddress ? EXECUTION_COSTS_LABEL : 'Fund agent';
    case FUNDS_CATEGORY.AGENT_TO_MASTER:
      return 'Withdrawal';
    case FUNDS_CATEGORY.AGENT_SAFE_TO_AGENT_EOA:
      return EXECUTION_COSTS_LABEL;
    default:
      return 'Transaction';
  }
};

export const getAgentIconCategory = (
  row: TransactionHistoryRow,
): FundsCategory => {
  switch (row.category) {
    case FUNDS_CATEGORY.MASTER_TO_AGENT:
      return FUNDS_CATEGORY.MASTER_FUNDING_IN;
    case FUNDS_CATEGORY.AGENT_TO_MASTER:
      return FUNDS_CATEGORY.MASTER_WITHDRAWAL;
    default:
      return row.category;
  }
};
