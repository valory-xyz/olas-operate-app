import {
  FUNDS_CATEGORY,
  TransactionHistoryRow,
} from '@/types/TransactionHistory';

const DEFAULT_AGENT_NAME = 'Agent';

/**
 * Resolve the row title for a transaction-history row. The agent display name
 * is injected for categories that scope to an agent (stake, unstake, fund,
 * agent-to-master).
 *
 * `agentDisplayName` is null when the agent can't be resolved (e.g. the
 * service for this row isn't loaded in the current `ServicesProvider`).
 */
export const getTransactionRowLabel = (
  row: TransactionHistoryRow,
  agentDisplayName: string | null,
): string => {
  const agent = agentDisplayName ?? DEFAULT_AGENT_NAME;

  switch (row.category) {
    case FUNDS_CATEGORY.SAFE_DEPLOYED:
    case FUNDS_CATEGORY.SAFE_SETUP_TRANSFER:
      return 'Setup complete';
    case FUNDS_CATEGORY.MASTER_FUNDING_IN:
      return 'Deposit';
    case FUNDS_CATEGORY.MASTER_WITHDRAWAL:
      return 'Withdraw to external wallet';
    case FUNDS_CATEGORY.AGENT_TO_MASTER:
      return `${agent} withdrawal`;
    case FUNDS_CATEGORY.SERVICE_BOND_DEPOSIT:
      return `${agent} stake`;
    case FUNDS_CATEGORY.SERVICE_BOND_REFUND:
    case FUNDS_CATEGORY.UNSTAKE_REWARD:
      return `${agent} unstake`;
    // The Pearl Wallet does not tell Agent Signer and Agent Safe funding
    // apart; the Agent Wallet history does.
    case FUNDS_CATEGORY.MASTER_TO_AGENT:
      return `Fund ${agent}`;
    default:
      return 'Transaction';
  }
};
