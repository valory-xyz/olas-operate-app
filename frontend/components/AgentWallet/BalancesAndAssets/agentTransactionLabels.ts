import {
  FUNDS_CATEGORY,
  FundsCategory,
  TransactionHistoryRow,
} from '@/types/TransactionHistory';

/**
 * Row titles for the AGENT wallet view. The subgraph categories are written
 * from the Master Safe's perspective; from the agent's side, Pearl funding it
 * is "Fund agent" and the agent returning funds to Pearl is a "Withdrawal".
 */
export const getAgentTransactionRowLabel = (
  row: TransactionHistoryRow,
): string => {
  switch (row.category) {
    case FUNDS_CATEGORY.MASTER_TO_AGENT:
      return 'Fund agent';
    case FUNDS_CATEGORY.AGENT_TO_MASTER:
      return 'Withdrawal';
    case FUNDS_CATEGORY.AGENT_SAFE_TO_AGENT_EOA:
      return 'Agent Safe to Agent Signer movement';
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
